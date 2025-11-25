# @tokenring-ai/file-index

A comprehensive file indexing and search package for AI agents within the TokenRing AI ecosystem. This package enables agents to index project files, chunk their contents semantically, and perform various types of searches to retrieve relevant code or text snippets.

## Overview

The `@tokenring-ai/file-index` package provides powerful file indexing and search capabilities designed specifically for AI agents. It supports multiple search strategies including full-text search, semantic search, and hybrid search that combines multiple approaches for optimal results.

### Key Features

- **Multiple Search Strategies**: Full-text search, semantic search, and hybrid search combining embeddings, keywords, and full-text matching
- **Semantic Text Chunking**: Intelligent chunking using sentence boundaries and token limits
- **File System Integration**: Automatic file watching and re-indexing using chokidar
- **Provider Architecture**: Extensible system supporting different storage backends (in-memory, database, etc.)
- **Agent Integration**: Seamless integration with TokenRing AI agents through tools and chat commands
- **Symbol Extraction**: JavaScript/TypeScript symbol extraction using Tree-sitter
- **Hybrid Search with Merging**: Advanced search that merges adjacent results for better context

## Installation

```bash
npm install @tokenring-ai/file-index
```

## Quick Start

### Basic Usage

```typescript
import { FileIndexService, EphemeralFileIndexProvider } from '@tokenring-ai/file-index';

// Create a file index service
const fileIndexService = new FileIndexService();

// Register an ephemeral provider (in-memory)
fileIndexService.registerFileIndexProvider('ephemeral', new EphemeralFileIndexProvider());

// Set the active provider
fileIndexService.setActiveFileIndexProviderName('ephemeral');

// Wait for initialization
await fileIndexService.waitReady(agent);

// Perform a search
const results = await fileIndexService.search('function example', 10, agent);
console.log(results);
```

### Using the Hybrid Search Tool

```typescript
import { hybridSearchFileIndex } from '@tokenring-ai/file-index/tools';

// Perform hybrid search
const results = await hybridSearchFileIndex.execute(
  {
    query: 'implement user authentication',
    topK: 5,
    textWeight: 0.3,
    fullTextWeight: 0.3,
    mergeRadius: 1
  },
  agent
);

console.log(results);
// Output: Array of merged search results with hybrid scores
```

### Using the Search Command

In your agent chat, use the `/search` command:

```
/search function example
```

This will perform a full-text search and display the results in the chat interface.

## Package Structure

```
pkg/file-index/
├── index.ts                    # Main entry point and plugin definition
├── package.json                # Package metadata and dependencies
├── tsconfig.json               # TypeScript configuration
├── FileIndexProvider.ts        # Abstract provider interface
├── EphemeralFileIndexProvider.ts # In-memory implementation
├── FileIndexService.ts         # Service registry for providers
├── StringSearchFileIndexService.ts # Agent-integrated service
├── chatCommands.ts             # Exports chat commands
│   └── commands/
│       └── search.ts           # Search command implementation
├── tools.ts                    # Exports agent tools
│   └── hybridSearchFileIndex.ts # Hybrid search tool
└── util/                       # Utilities
    ├── sha256.ts               # SHA256 hashing utility
    ├── ComputeChunkLineStarts.ts # Line offset computation
    ├── chunker.ts              # Semantic chunking logic
    └── symbols/
        └── symbolExtractor.ts  # Tree-sitter based symbol extraction
```

## Core Components

### FileIndexProvider (Abstract Class)

The base interface for all file indexing providers. Extend this class to create custom implementations.

```typescript
export abstract class FileIndexProvider {
  abstract search(query: string, limit?: number): Promise<SearchResult[]>;
  abstract fullTextSearch(query: string, limit?: number): Promise<SearchResult[]>;
  abstract processFile(filePath: string): Promise<void>;
  abstract onFileChanged(type: string, filePath: string): void;
  abstract waitReady(): Promise<void>;
  abstract close(): Promise<void>;
  abstract setCurrentFile(filePath: string): void;
  abstract clearCurrentFile(): void;
  abstract getCurrentFile(): string | null;
}
```

### EphemeralFileIndexProvider

An in-memory implementation that provides fast, non-persistent file indexing. It watches file changes and chunks content into manageable pieces.

```typescript
const provider = new EphemeralFileIndexProvider('/path/to/project');
await provider.start();
```

### FileIndexService

A registry service that manages multiple providers and allows switching between them.

```typescript
const service = new FileIndexService();
service.registerFileIndexProvider('memory', new EphemeralFileIndexProvider());
service.setActiveFileIndexProviderName('memory');
```

### StringSearchFileIndexService

An agent-specific wrapper that handles startup, file watching, and logging.

```typescript
const service = new StringSearchFileIndexService('/path/to/project');
await service.start();
```

## API Reference

### Search Results

```typescript
interface SearchResult {
  path: string;
  chunk_index: number;
  content: string;
  relevance?: number;
  distance?: number;
}
```

### Hybrid Search Results

```typescript
interface HybridSearchResult {
  path: string;
  start: number;
  end: number;
  hybridScore: number;
  content: string;
}
```

### Text Chunking

```typescript
import { chunkText } from '@tokenring-ai/file-index/util/chunker';

const chunks = chunkText(longText, {
  maxTokens: 256,
  overlapTokens: 32
});
```

### Symbol Extraction

```typescript
import { extractSymbolsFromFile } from '@tokenring-ai/file-index/util/symbols/symbolExtractor';

const symbols = await extractSymbolsFromFile('src/main.ts');
// Output: [{ name: 'main', kind: 'function', startLine: 1, endLine: 5 }]
```

## Configuration

### Provider Configuration

```typescript
// Register multiple providers
fileIndexService.registerFileIndexProvider('ephemeral', new EphemeralFileIndexProvider());
fileIndexService.registerFileIndexProvider('persistent', new PersistentFileIndexProvider());

// Switch between providers
fileIndexService.setActiveFileIndexProviderName('ephemeral');
```

### Hybrid Search Parameters

- `query`: Text or code query to search for
- `topK`: Number of results to return (default: 10)
- `textWeight`: Weight for token overlap scoring (default: 0.3)
- `fullTextWeight`: Weight for full-text search scoring (default: 0.3)
- `mergeRadius`: How close chunks must be to merge (default: 1)

## Integration with TokenRing AI

### Plugin Integration

The package can be used as a TokenRing AI plugin:

```typescript
import FileIndexPlugin from '@tokenring-ai/file-index';

// In your app configuration
app.install(FileIndexPlugin);
```

### Agent Integration

```typescript
import Agent from '@tokenring-ai/agent/Agent';
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';

const agent = new Agent();
agent.registerService(new FileIndexService());
```

## Dependencies

- `@tokenring-ai/agent` (^0.1.0) - Agent integration
- `@tokenring-ai/filesystem` (^0.1.0) - File system utilities
- `@tokenring-ai/utility` (^0.1.0) - Utility functions
- `chokidar` (^4.0.3) - File system watching
- `commander` (^14.0.2) - CLI framework
- `glob-gitignore` (^1.0.15) - Glob patterns with .gitignore support
- `gpt-tokenizer` (^3.4.0) - Token counting
- `mysql2` (^3.15.3) - MySQL client (for future database support)
- `sentencex` (^1.0.9) - Sentence segmentation
- `sqlite-vec` (0.1.7-alpha.2) - Vector database support
- `tree-sitter` (^0.25.0) - Code parsing
- `tree-sitter-javascript` (^0.25.0) - JavaScript grammar
- `fs-extra` (^11.3.2) - File system utilities

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run eslint
```

### TypeScript Configuration

The project uses TypeScript with the following settings:
- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- ES module interop enabled

## Advanced Usage

### Custom Provider Implementation

```typescript
import FileIndexProvider from '@tokenring-ai/file-index/FileIndexProvider';

class CustomFileIndexProvider extends FileIndexProvider {
  async search(query: string, limit?: number): Promise<SearchResult[]> {
    // Implement your search logic
  }
  
  async fullTextSearch(query: string, limit?: number): Promise<SearchResult[]> {
    // Implement your full-text search logic
  }
  
  // Implement other required methods...
}
```

### Batch File Processing

```typescript
// Process multiple files
for (const filePath of filePaths) {
  await fileIndexService.processFile(filePath);
}
```

### File Change Handling

```typescript
// Handle file changes
fileIndexService.onFileChanged('change', 'path/to/file.txt');
fileIndexService.onFileChanged('unlink', 'path/to/deleted.txt');
```

## Limitations and Considerations

- **Memory Usage**: The ephemeral provider stores all file contents in memory, which may not be suitable for very large codebases
- **Search Types**: Currently supports full-text and hybrid search. Semantic search tool is commented out but can be enabled
- **File Types**: Focuses on text files. Binary files are skipped
- **Performance**: Indexing runs asynchronously to avoid blocking operations
- **Extensibility**: Designed to be extensible for custom storage backends and search algorithms

## Contributing

1. Follow the existing code style and ESLint rules
2. Add tests for new functionality
3. Update documentation as needed
4. Submit pull requests to the main TokenRing AI repository

## License

MIT License - see LICENSE file for details.