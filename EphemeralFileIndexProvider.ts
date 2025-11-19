import fs from "fs-extra";
import path from "path";
import FileIndexProvider, {SearchResult} from "./FileIndexProvider.ts";

export default class EphemeralFileIndexProvider extends FileIndexProvider {
  private baseDirectory: string = process.cwd();
  private currentFile: string | null = null;
  private fileContents: Map<string, { content: string; chunks: string[]; mtime: number }> = new Map();
  private fileQueue: Set<string> = new Set();
  private timer?: NodeJS.Timeout;
  private initializing: Promise<void> | null = null;

  constructor(baseDirectory?: string) {
    super();
    if (baseDirectory) {
      this.baseDirectory = baseDirectory;
    }
  }

  getBaseDirectory(): string {
    return this.baseDirectory;
  }

  async start() {
    this.initializing = this.lazyInit();
  }

  onFileChanged(type: string, filePath: string) {
    if (type === "unlink") {
      this.fileQueue.delete(filePath);
      this.fileContents.delete(filePath);
    } else {
      this.fileQueue.add(filePath);
    }
  }

  async waitReady(): Promise<void> {
    if (this.initializing != null) {
      return this.initializing;
    }
  }

  async processFile(filePath: string) {
    const resolvedPath = path.resolve(this.baseDirectory, filePath);

    if (!(await fs.exists(resolvedPath))) {
      this.fileContents.delete(resolvedPath);
      return;
    }

    const content = await fs.readFile(resolvedPath, "utf8");
    const chunks = this.chunkContent(content);

    this.fileContents.set(resolvedPath, {
      content,
      chunks,
      mtime: (await fs.stat(resolvedPath)).mtimeMs,
    });
  }

  async fullTextSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    await this.waitReady();

    if (!query || query.trim() === "") {
      return [];
    }

    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const [filePath, fileData] of this.fileContents.entries()) {
      const {chunks} = fileData;

      for (let i = 0; i < chunks.length; i++) {
        if (results.length >= limit) break;

        const chunk = chunks[i];
        const lowerChunk = chunk.toLowerCase();

        if (lowerChunk.includes(normalizedQuery)) {
          const count = (
            lowerChunk.match(
              new RegExp(
                normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "g",
              ),
            ) || []
          ).length;
          const relevance = count * (1 + 1 / chunk.length);

          results.push({
            path: filePath,
            chunk_index: i,
            content: chunk,
            relevance: relevance,
          });
        }
      }
    }

    return results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0)).slice(0, limit);
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    return this.fullTextSearch(query, limit);
  }

  setCurrentFile(filePath: string) {
    this.currentFile = filePath;
  }

  clearCurrentFile() {
    this.currentFile = null;
  }

  getCurrentFile() {
    return this.currentFile;
  }

  async close() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.fileContents.clear();
    this.fileQueue.clear();
  }

  private async lazyInit() {
    this.scheduleNextProcessing();
    await this.processFiles();
    this.scheduleNextProcessing();
  }

  private scheduleNextProcessing() {
    this.timer = setTimeout(async () => {
      await this.processFiles();
      this.scheduleNextProcessing();
    }, 250);
    this.timer.unref();
  }

  private async processFiles() {
    const files = Array.from(this.fileQueue.keys());
    const parallelTasks = 10;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < parallelTasks; i++) {
      promises[i] = (async (files: string[], i: number) => {
        for (; i < files.length; i += parallelTasks) {
          const relPath = files[i];
          this.fileQueue.delete(relPath);
          try {
            await this.processFile(relPath);
          } catch (err) {
            // Ignore errors for now
          }
        }
      })(files, i);
    }

    await Promise.all(promises);
  }

  private chunkContent(content: string): string[] {
    const lines = content.split("\n");
    const chunks: string[] = [];
    let currentChunk = "";

    for (const line of lines) {
      if (currentChunk.length + line.length > 1000) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? "\n" : "") + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}