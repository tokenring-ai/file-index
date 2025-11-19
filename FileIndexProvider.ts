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
  abstract search(query: string, limit?: number): Promise<SearchResult[]>;

  abstract fullTextSearch(query: string, limit?: number): Promise<SearchResult[]>;

  // Lifecycle methods
  abstract waitReady(): Promise<void>;

  abstract processFile(filePath: string): Promise<void>;

  abstract onFileChanged(type: string, filePath: string): void;

  abstract close(): Promise<void>;

  // Current file context
  abstract setCurrentFile(filePath: string): void;

  abstract clearCurrentFile(): void;

  abstract getCurrentFile(): string | null;
}