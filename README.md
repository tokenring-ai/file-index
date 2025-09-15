# File Index Package Documentation

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search functionality for AI agents within the TokenRing AI ecosystem. It enables agents to index project files, chunk their contents semantically, and perform searches (full-text, semantic, or hybrid) to retrieve relevant code or text snippets. This is particularly useful for codebase exploration, debugging, and context-aware responses in chat-based AI interactions.

The package supports in-memory (ephemeral) indexing for quick setup and search, with extensibility for persistent storage (e.g., via vector databases like SQLite or MySQL, though not implemented in core files). It integrates with the `@tokenring-ai/agent` and `@tokenring-ai/filesystem` packages, watching file changes and processing them asynchronously.

Key features:
- Semantic text chunking using sentence boundaries and token limits (via `sentencex` and `gpt-tokenizer`).
- Full-text search with relevance scoring.
- Hybrid search combining embeddings, keywords, and full-text.
- Symbol extraction for JavaScript/TypeScript using Tree-sitter.
- Chat commands and tools for agent integration.

## Installation/Setup

This package is part of the TokenRing AI monorepo. To use it:

1. Ensure Node.js (v18+) is installed.
2. Install dependencies via npm:
   ```
   npm install @tokenring-ai/file-index
   ```
   Or, if building from source in the monorepo:
   ```
   npm install
   npm run build  # If a build script is added
   ```

3. Integrate with an AgentTeam from `@tokenring-ai/agent`. Register services like `FileIndexService` or `StringSearchFileIndexService` during agent setup.

Dependencies are listed in `package.json` and include filesystem watchers (`chokidar`), tokenizers (`gpt-tokenizer`), and parsers (`tree-sitter`).

For development:
```
npm run eslint  # Lint and fix code
```

## Package Structure

```
pkg/file-index/
├── index.ts              # Main entry point, exports and package info
├── package.json          # Package metadata and dependencies
├── tsconfig.json         # TypeScript configuration
├── README.md             # This documentation
├── LICENSE               # MIT License
├── FileIndexProvider.ts  # Abstract provider interface
├── EphemeralFileIndexProvider.ts  # In-memory implementation
├── FileIndexService.ts   # Service registry for providers
├── StringSearchFileIndexService.ts  # Agent-integrated service
├── chatCommands.ts       # Exports chat commands (e.g., /search)
│   └── commands/
│       └── search.ts     # Search command implementation
├── tools.ts              # Exports agent tools
│   ├── searchFileIndex.ts  # Semantic search tool (commented out)
│   └── hybridSearchFileIndex.ts  # Hybrid search tool
└── util/                 # Utilities
    ├── sha256.ts         # SHA256 hashing
    ├── ComputeChunkLineStarts.ts  # Line offset computation for chunks
    ├── chunker.ts        # Semantic chunking logic
    └── symbols/
        └── symbolExtractor.ts  # Tree-sitter based symbol extraction for JS/TS
```

## Core Components

### FileIndexProvider (Abstract Class)

Defines the core interface for file indexing providers. Extend this for custom implementations (e.g., persistent DB-backed).

- **Key Methods**:
  - `search(query: string, limit?: number): Promise<SearchResult[]>`: Semantic or hybrid search for relevant chunks.
  - `fullTextSearch(query: string, limit?: number): Promise<SearchResult[]>`: Keyword-based full-text search with relevance scoring.
  - `processFile(filePath: string): Promise<void>`: Index a single file (chunks and stores content).
  - `onFileChanged(type: string, filePath: string): void`: Handle file events (add/update/unlink).
  - `waitReady(): Promise<void>`: Await initialization.
  - `setCurrentFile(filePath: string) / clearCurrentFile() / getCurrentFile(): string | null`: Track the active file context.
  - `close(): Promise<void>`: Cleanup resources.

**SearchResult Interface**:
```typescript
interface SearchResult {
  path: string;
  chunk_index: number;
  content: string;
  relevance?: number;
  distance?: number;
}
```

### EphemeralFileIndexProvider (Implements FileIndexProvider)

In-memory provider for quick, non-persistent indexing. Watches files via filesystem events, chunks content into ~1000-char blocks, and performs case-insensitive full-text search.

- **Constructor**: `new EphemeralFileIndexProvider(baseDirectory?: string)` – Sets the root directory (defaults to `process.cwd()`).
- **Key Methods** (extends abstract):
  - `start()`: Begins lazy initialization and file processing queue.
  - `chunkContent(content: string): string[]`: Simple line-based chunking (not semantic; see `chunker.ts` for advanced).
  - Search methods use substring matching with relevance based on match count and chunk length.

Internally uses a `Map` for file contents (with chunks and mtime) and a queue for async processing (batched in parallel).

### FileIndexService (Implements TokenRingService)

Registry for multiple providers, allowing dynamic switching. Delegates calls to the active provider.

- **Key Methods**:
  - `registerFileIndexProvider(name: string, provider: FileIndexProvider)`: Add a provider.
  - `setActiveFileIndexProviderName(name: string)`: Switch active provider.
  - `fullTextSearch(query: string, limit?: number, agent: Agent): Promise<SearchResult[]>`: Delegates to active provider.
  - Similar delegation for `search`, `waitReady`, `setCurrentFile`, etc.

### StringSearchFileIndexService (Implements TokenRingService)

Agent-specific wrapper around `EphemeralFileIndexProvider`. Handles startup, file watching, and logging.

- **Constructor**: `new StringSearchFileIndexService(baseDirectory?: string)`.
- **Key Methods**:
  - `start(agentTeam: AgentTeam)`: Initializes provider and sets up.
  - `onFileChanged(type: string, filePath: string)`: Forwards to provider.
  - Delegates search and lifecycle methods.

### Utilities

- **chunker.ts**: `chunkText(text: string, options: {maxTokens?: number, overlapTokens?: number}): string[]`
  - Semantically chunks text by sentences, respecting token limits (~256 default) with overlap (~32 tokens).
  - Uses `sentencex` for English sentence segmentation and `gpt-tokenizer` for token counting.
  - Example:
    ```typescript
    import { chunkText } from './util/chunker.ts';
    const chunks = chunkText(longText, { maxTokens: 512, overlapTokens: 64 });
    ```

- **symbols/symbolExtractor.ts**: `extractSymbolsFromFile(filePath: string): Promise<Array<{name: string, kind: string, startLine: number, endLine: number}>>`
  - Parses JS/TS files with Tree-sitter to extract functions and classes.
  - Example output: `[{ name: 'MyClass', kind: 'class', startLine: 5, endLine: 20 }]`.

- **util/sha256.ts** and **ComputeChunkLineStarts.ts**: Helper functions for hashing and line offset tracking in chunks.

### Tools and Commands

- **hybridSearchFileIndex.ts**: Agent tool for hybrid search (semantic + full-text + keyword overlap).
  - `execute({query, topK=10, textWeight=0.3, fullTextWeight=0.3, mergeRadius=1}, agent)`: Returns merged `HybridSearchResult[]` with scores.
  - Merges adjacent chunks per file for concise results.

- **commands/search.ts**: Chat command `/search <query>` – Performs full-text search and displays results in agent chat.

Interactions: Providers process files → Service delegates searches → Tools/commands invoke service methods. File changes trigger re-indexing via `onFileChanged`.

## Usage Examples

### 1. Basic Indexing and Search (with Agent)
```typescript
import AgentTeam from '@tokenring-ai/agent/AgentTeam';
import StringSearchFileIndexService from '@tokenring-ai/file-index/StringSearchFileIndexService';

const agentTeam = new AgentTeam();
const fileIndexService = new StringSearchFileIndexService('/path/to/project');
agentTeam.registerService(fileIndexService);

await agentTeam.start();  // Starts indexing
await fileIndexService.waitReady(/* agent */);

const results = await fileIndexService.search('function example', 5, agent);
console.log(results);  // Array of SearchResult
```

### 2. Using Hybrid Search Tool
```typescript
import { execute as hybridSearch } from '@tokenring-ai/file-index/tools/hybridSearchFileIndex.ts';

const results = await hybridSearch(
  { query: 'implement login', topK: 3, mergeRadius: 2 },
  agent
);
// Results: [{ path: 'src/auth.ts', start: 10, end: 15, hybridScore: 0.85, content: '...' }]
```

### 3. Extract Symbols
```typescript
import { extractSymbolsFromFile } from '@tokenring-ai/file-index/util/symbols/symbolExtractor.ts';

const symbols = await extractSymbolsFromFile('src/main.ts');
console.log(symbols);  // [{ name: 'main', kind: 'function', startLine: 1, endLine: 5 }]
```

## Configuration Options

- **Base Directory**: Set in `EphemeralFileIndexProvider` or `StringSearchFileIndexService` constructor for the root to index.
- **Chunking**: Customize via `chunkText` options (maxTokens, overlapTokens). Not directly configurable in provider; extend for integration.
- **Search Limits**: `limit` param in search methods (default 10).
- **Weights in Hybrid Search**: `textWeight`, `fullTextWeight` (sum <1 for embedding weight).
- **Environment**: Relies on filesystem access; no specific env vars, but integrates with agent logging.

For persistent indexing, implement a new `FileIndexProvider` using `sqlite-vec` or `mysql2`.

## API Reference

- **FileIndexProvider**: See abstract methods above.
- **chunkText(text: string, opts?: ChunkOptions): string[]** – Semantic chunking.
- **extractSymbolsFromFile(filePath: string): Promise<Symbol[]>** – JS/TS symbol extraction.
- **hybridSearchFileIndex.execute(params: HybridParams, agent: Agent): Promise<HybridSearchResult[]>** – Advanced search.
- **search command**: `/search <query>` in agent chat.

Full types in source files.

## Dependencies

From `package.json`:
- `@tokenring-ai/agent` (^0.1.0) – Agent integration.
- `@tokenring-ai/filesystem` (^0.1.0) – File watching/paths.
- `chokidar` (^4.0.3) – File system watcher.
- `commander` (^14.0.0) – CLI (unused in core).
- `glob-gitignore` (^1.0.15) – Glob patterns with .gitignore.
- `gpt-tokenizer` (^3.0.1) – Token counting.
- `mysql2` (^3.14.3) – For potential DB (unused).
- `sentencex` (^0.4.2) – Sentence segmentation.
- `sqlite-vec` (0.1.7-alpha.2) – Vector DB (unused in core).
- `tree-sitter` (^0.22.4), `tree-sitter-javascript` (^0.23.1) – Symbol parsing.

## Contributing/Notes

- **Testing**: Add unit tests for chunking/search; integrate with agent e2e tests. No tests in current codebase.
- **Building**: TypeScript compiles to JS; use `tsc` or monorepo build.
- **Limitations**: Ephemeral provider is memory-only (not for large codebases). Semantic search tool is commented out; hybrid assumes embeddings via service. Extend for vector DB support. Binary files skipped; focuses on text/code.
- **Best Practices**: Indexing runs async to avoid blocking; errors in processing are ignored for resilience.
- Contributions: Follow ESLint rules. Submit PRs to TokenRing AI repo.

For issues or extensions (e.g., other languages in symbolExtractor), open a discussion.