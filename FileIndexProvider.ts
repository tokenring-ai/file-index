import type {MaybePromise} from "bun";

export interface SearchResult {
  path: string;
  chunk_index: number;
  content: string;
  relevance?: number;
  distance?: number;
}

/**
 * FileIndexProvider is an abstract class that provides a unified interface
 * for file indexing operations, allowing for different implementations.
 */
export default abstract class FileIndexProvider {
  // Core search methods
  abstract search(query: string, limit?: number): MaybePromise<SearchResult[]>;

  abstract fullTextSearch(
    query: string,
    limit?: number,
  ): MaybePromise<SearchResult[]>;

  // Lifecycle methods
  abstract waitReady(): MaybePromise<void>;

  abstract processFile(filePath: string): MaybePromise<void>;

  abstract onFileChanged(type: string, filePath: string): void;

  abstract close(): MaybePromise<void>;

  // Current file context
  abstract setCurrentFile(filePath: string): void;

  abstract clearCurrentFile(): void;

  abstract getCurrentFile(): string | null;
}
