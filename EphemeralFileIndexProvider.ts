import type TokenRingApp from "@tokenring-ai/app";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { topLevelRoots } from "@tokenring-ai/filesystem/util/allowedPaths";
import browserIgnoreFilter from "@tokenring-ai/filesystem/util/browserIgnoreFilter";
import { listWorkspaceFiles } from "@tokenring-ai/filesystem/util/workspaceFileIndex";
import EnhancedSet from "@tokenring-ai/utility/set/enhancedSet";
import FileIndexProvider, { type SearchResult } from "./FileIndexProvider.ts";

/** How long a refreshed index is used before the file tree is listed again. */
const REFRESH_INTERVAL_MS = 15_000;
/** Larger files are not indexed. */
const MAX_FILE_BYTES = 1_000_000;
/** Most files indexed at once; a workspace beyond this is indexed in listing order. */
const MAX_FILES = 20_000;
const READ_CONCURRENCY = 16;
const MAX_CHUNK_SIZE = 1000;

type IndexedFile = { mtime: number; chunks: string[] };

/**
 * An in-memory full-text index of the host files agents may read: the allowed paths, honoring
 * .gitignore and .aiignore like `@` file search. It is refreshed when searched (at most every
 * {@link REFRESH_INTERVAL_MS}), re-reading only files whose modification time changed, and files
 * the filesystem reports as written are re-read on the next search.
 */
export default class EphemeralFileIndexProvider extends FileIndexProvider {
  private currentFile: string | null = null;
  /** Absolute path -> indexed contents. */
  private readonly files = new Map<string, IndexedFile>();
  /** Absolute paths to re-read on the next search. */
  private readonly changed = new EnhancedSet<string>();
  private lastRefresh = 0;
  private refreshing: Promise<void> | null = null;
  private unsubscribeWrites: (() => void) | null = null;

  constructor(private readonly app: TokenRingApp) {
    super();
  }

  onFileChanged(type: string, filePath: string): void {
    if (type === "unlink") {
      this.changed.delete(filePath);
      this.files.delete(filePath);
    } else {
      this.changed.add(filePath);
    }
  }

  /** Brings the index up to date. */
  waitReady(): Promise<void> {
    this.refreshing ??= this.refresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  async processFile(filePath: string): Promise<void> {
    const fileSystem = this.app.getService(FileSystemService);
    if (!fileSystem) return;
    const stat = await fileSystem.host.stat(filePath);
    if (!stat.exists || !stat.isFile || (stat.size ?? 0) > MAX_FILE_BYTES) {
      this.files.delete(filePath);
      return;
    }
    const mtime = stat.modified?.getTime() ?? 0;
    if (this.files.get(filePath)?.mtime === mtime) return;
    const buffer = await fileSystem.host.readFile(filePath);
    if (!buffer || isBinary(buffer)) {
      this.files.delete(filePath);
      return;
    }
    this.files.set(filePath, { mtime, chunks: chunkContent(buffer.toString("utf8")) });
  }

  async fullTextSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!query || query.trim() === "") return [];
    await this.waitReady();

    const needle = query.toLowerCase();
    const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const results: SearchResult[] = [];
    for (const [filePath, { chunks }] of this.files) {
      for (let i = 0; i < chunks.length; i++) {
        const lowerChunk = chunks[i]!.toLowerCase();
        if (!lowerChunk.includes(needle)) continue;
        const count = lowerChunk.match(pattern)?.length ?? 0;
        results.push({ path: filePath, chunk_index: i, content: chunks[i]!, relevance: count * (1 + 1 / lowerChunk.length) });
      }
    }
    // Every match is ranked before cutting to `limit`, so the best ones are kept, not the first found.
    return results.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0)).slice(0, limit);
  }

  search(query: string, limit: number = 10): Promise<SearchResult[]> {
    return this.fullTextSearch(query, limit);
  }

  setCurrentFile(filePath: string): void {
    this.currentFile = filePath;
  }

  clearCurrentFile(): void {
    this.currentFile = null;
  }

  getCurrentFile(): string | null {
    return this.currentFile;
  }

  close(): void {
    this.unsubscribeWrites?.();
    this.unsubscribeWrites = null;
    this.files.clear();
    this.changed.clear();
    this.lastRefresh = 0;
  }

  private async refresh(): Promise<void> {
    const fileSystem = this.app.getService(FileSystemService);
    if (!fileSystem) return;
    this.unsubscribeWrites ??= fileSystem.onFileWritten(filePath => this.onFileChanged("change", filePath));

    let toRead: string[];
    if (Date.now() - this.lastRefresh >= REFRESH_INTERVAL_MS) {
      const listed: string[] = [];
      for (const root of topLevelRoots(fileSystem.getAllowedPaths())) {
        const ignoreFilter = await browserIgnoreFilter(fileSystem.host, root.path);
        listed.push(...(await listWorkspaceFiles(fileSystem.host, root.path, { ignoreFilter, variant: "gitignore" })));
      }
      const current = new Set(listed.slice(0, MAX_FILES));
      for (const filePath of this.files.keys()) if (!current.has(filePath)) this.files.delete(filePath);
      toRead = [...new Set([...current, ...this.changed])];
      this.lastRefresh = Date.now();
    } else {
      toRead = this.changed.valuesArray();
    }
    this.changed.clear();

    let next = 0;
    const worker = async () => {
      while (next < toRead.length) {
        const filePath = toRead[next++]!;
        try {
          await this.processFile(filePath);
        } catch {
          // Unreadable (permissions, deleted mid-read): leave it out.
          this.files.delete(filePath);
        }
      }
    };
    await Promise.all(Array.from({ length: READ_CONCURRENCY }, worker));
  }
}

/** A NUL byte in the first 8 KB: treated as binary, like git does. */
function isBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8192).includes(0);
}

function chunkContent(content: string): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  for (const line of content.split("\n")) {
    if (line.length > MAX_CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      for (let i = 0; i < line.length; i += MAX_CHUNK_SIZE) chunks.push(line.slice(i, i + MAX_CHUNK_SIZE));
      continue;
    }
    if (currentChunk.length + line.length > MAX_CHUNK_SIZE) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}
