# @tokenring-ai/file-index

Service that adds file contents or file names to the chat memory.

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search capabilities for AI agents. It enables agents to index project files and perform various types of searches to retrieve relevant code or text snippets.

### Key Features

- **Multiple Search Strategies**: Full-text search and hybrid search combining embedding similarity, full-text matching, and token overlap scoring
- **Text Chunking**: Intelligent chunking using line boundaries with configurable limits
- **File System Integration**: Automatic file watching and re-indexing
- **Provider Architecture**: Extensible system supporting different storage backends (currently includes in-memory implementation)
- **Agent Integration**: Seamless integration with TokenRing AI agents through tools and chat commands
- **Hybrid Search with Merging**: Advanced search that merges adjacent results for better context
- **Command Interface**: Built-in chat command for managing providers and performing searches
- **Tool Integration**: Exported tool for hybrid search functionality

## Installation

```bash
bun install @tokenring-ai/file-index
```

## Quick Start

### Basic Usage

```typescript
import FileIndexService from './FileIndexService.ts';
import EphemeralFileIndexProvider from './EphemeralFileIndexProvider.ts';
import { FileIndexServiceConfigSchema } from './schema.ts';
import { z } from 'zod';

// Create a file index service with configuration
const config: z.input<typeof FileIndexServiceConfigSchema> = {
  providers: {
    ephemeral: {
      type: 'ephemeral',
    },
  },
  agentDefaults: {
    provider: 'ephemeral',
  },
};

const fileIndexService = new FileIndexService(config);
```

### Using the Hybrid Search Tool

```typescript
import { hybridSearchFileIndex } from '@tokenring-ai/file-index/tools.ts';

// Perform hybrid search
const results = await hybridSearchFileIndex.execute(
  {
    query: 'implement user authentication',
    topK: 5,
    textWeight: 0.3,
    fullTextWeight: 0.3,
    mergeRadius: 1,
  },
  agent
);

console.log(results);
// Output: Array of merged search results with hybrid scores
```

### Using the Chat Command

In your agent chat, use the `/fileindex` command:

```
/fileindex search function example
```

This will perform a search and display the results in the chat interface.

## Package Structure

```
pkg/file-index/
├── index.ts                          # Main entry point and exports
├── package.json                      # Package metadata and dependencies
├── plugin.ts                         # Plugin definition for app installation
├── schema.ts                         # Zod schemas for configuration
├── FileIndexProvider.ts              # Abstract provider interface
├── EphemeralFileIndexProvider.ts     # In-memory implementation
├── FileIndexService.ts               # Service registry for providers
├── chatCommands.ts                   # Exports chat commands
│   └── commands/
│       └── fileindex/
│           ├── search.ts             # Search command implementation
│           ├── provider.ts           # Provider command router
│           ├── provider/
│           │   ├── select.ts         # Interactive provider selection
│           │   ├── default.ts        # Reset to default provider
│           │   ├── set.ts            # Set provider by name
│           │   └── get.ts            # Get current provider
├── tools.ts                          # Exports agent tools
│   ├── searchFileIndex.ts            # Semantic search tool (vector-based)
│   └── hybridSearchFileIndex.ts      # Hybrid search tool
├── util/                             # Utilities
│   ├── sha256.ts                     # SHA256 hashing utility
│   ├── chunker.ts                    # Semantic chunking logic
│   └── ComputeChunkLineStarts.ts     # Line offset computation
├── state/
│   └── FileIndexState.ts             # State management for file index
└── symbols/
    └── symbolExtractor.ts            # Tree-sitter based symbol extraction
```

## Core Components

### FileIndexProvider (Abstract Class)

The base interface for all file indexing providers. Extend this class to create custom implementations.

```typescript
export interface SearchResult {
  path: string;
  chunk_index: number;
  content: string;
  relevance?: number;
  distance?: number;
}

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
```

### EphemeralFileIndexProvider

An in-memory implementation that provides fast, non-persistent file indexing.

```typescript
const provider = new EphemeralFileIndexProvider('/path/to/project');
await provider.start();
```

### FileIndexService

A registry service that manages multiple providers and allows switching between them.

```typescript
const service = new FileIndexService(config);

// Register a provider
service.registerFileIndexProvider('ephemeral', new EphemeralFileIndexProvider());

// Get available providers
const providers = service.getAvailableFileIndexProviders();
```

### FileIndexState

Manages the internal state of the file index including current file context.

```typescript
export class FileIndexState implements AgentStateSlice {
  name = "FileIndexState";
  activeProvider: string | null;

  constructor(readonly initialConfig: AgentDefaults) {
    this.activeProvider = initialConfig.provider;
  }
}
```

## API Reference

### Search Results

```typescript
interface SearchResult {
  path: string;          // Full path to the file
  chunk_index: number;   // Index of the chunk in the file
  content: string;       // Content of the chunk
  relevance?: number;    // Relevance score (full-text search)
  distance?: number;     // Distance score (semantic search)
}
```

### Hybrid Search Results

```typescript
interface HybridSearchResult {
  path: string;         // Full path to the file
  start: number;        // Starting chunk index
  end: number;          // Ending chunk index
  hybridScore: number;  // Combined relevance score
  content: string;      // Merged content of all chunks
}
```

### FileIndexService Methods

```typescript
class FileIndexService {
  // Provider management
  registerFileIndexProvider(name: string, provider: FileIndexProvider): void;
  getAvailableFileIndexProviders(): string[];

  // Provider activation
  setActiveProvider(name: string, agent: Agent): void;

  // Search operations
  search(query: string, limit?: number, agent?: Agent): Promise<SearchResult[]>;
  fullTextSearch(query: string, limit?: number, agent?: Agent): Promise<SearchResult[]>;

  // Lifecycle
  waitReady(agent: Agent): Promise<void>;
  close(agent: Agent): Promise<void>;

  // File context
  setCurrentFile(filePath: string, agent: Agent): void;
  clearCurrentFile(agent: Agent): void;
  getCurrentFile(agent: Agent): string | null;
}
```

### Hybrid Search Tool

```typescript
const hybridSearchFileIndex = {
  name: 'file-index_hybridSearchFileIndex',
  description: 'Hybrid semantic+full-text+keyword search with merging/deduplication',
  inputSchema: z.object({
    query: z.string().describe('Text or code query'),
    topK: z.number().int().default(10).describe('Number of results to return'),
    textWeight: z.number().default(0.3).describe('Weight for token overlap'),
    fullTextWeight: z.number().default(0.3).describe('Weight for full-text search'),
    mergeRadius: z.number().int().default(1).describe('Merge radius for adjacent chunks')
  }),
  execute: async (params, agent: Agent) => HybridSearchResult[]
}
```

### FileIndex Chat Commands

```typescript
const fileindexCommand = {
  description: '/fileindex [action] [subaction] - Manage file index providers and search',
  execute: async (remainder: string, agent: Agent) => void,
  help: string
}
```

**Available subcommands:**
- `/fileindex search <query>` - Search for text across files
- `/fileindex provider get` - Display current provider
- `/fileindex provider set <name>` - Set provider by name
- `/fileindex provider default` - Reset to default provider
- `/fileindex provider select` - Interactive provider selection

## Configuration

### Plugin Configuration

```typescript
import { z } from 'zod';

const packageConfigSchema = z.object({
  fileIndex: z.object({
    providers: z.record(z.string(), z.any()),
    agentDefaults: z.object({
      provider: z.string(),
    }),
  }).optional(),
});
```

### Provider Configuration

```typescript
const config = {
  fileIndex: {
    providers: {
      ephemeral: {
        type: 'ephemeral',
      },
    },
    agentDefaults: {
      provider: 'ephemeral',
    },
  },
};
```

### Hybrid Search Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | - | Text or code query to search for |
| `topK` | number | 10 | Number of results to return |
| `textWeight` | number | 0.3 | Weight for token overlap scoring |
| `fullTextWeight` | number | 0.3 | Weight for full-text search scoring |
| `mergeRadius` | number | 1 | How close chunks must be to merge |

## Plugin Integration

```typescript
import FileIndexPlugin from '@tokenring-ai/file-index';
import { z } from 'zod';

const configSchema = z.object({
  fileIndex: z.object({
    providers: z.record(z.string(), z.any()),
    agentDefaults: z.object({
      provider: z.string(),
    }),
  }).optional(),
});

// In your app configuration
app.install(FileIndexPlugin, {
  fileIndex: {
    providers: {
      ephemeral: {
        type: 'ephemeral',
      },
    },
    agentDefaults: {
      provider: 'ephemeral',
    },
  },
});
```

## Development

### Building

```bash
bun run build
```

### Linting

```bash
bun run eslint
```

### Testing

```bash
bun run test
```

### Test Watching

```bash
bun run test:watch
```

### Test Coverage

```bash
bun run test:coverage
```

## Advanced Usage

### Custom Provider Implementation

```typescript
import FileIndexProvider from '@tokenring-ai/file-index/FileIndexProvider.ts';

class CustomFileIndexProvider extends FileIndexProvider {
  async search(query: string, limit?: number): Promise<SearchResult[]> {
    // Implement your search logic
    return [];
  }

  async fullTextSearch(query: string, limit?: number): Promise<SearchResult[]> {
    // Implement your full-text search logic
    return [];
  }

  async waitReady(): Promise<void> {
    // Initialize your provider
  }

  async processFile(filePath: string): Promise<void> {
    // Process and index a file
  }

  onFileChanged(type: string, filePath: string): void {
    // Handle file changes
  }

  async close(): Promise<void> {
    // Cleanup
  }

  setCurrentFile(filePath: string): void {
    // Set current file context
  }

  clearCurrentFile(): void {
    // Clear current file context
  }

  getCurrentFile(): string | null {
    return null;
  }
}
```

### Batch File Processing

```typescript
const fileIndex = agent.requireServiceByType(FileIndexService);
for (const filePath of filePaths) {
  await fileIndex.processFile(filePath);
}
```

### File Change Handling

```typescript
// Handle file changes
fileIndex.onFileChanged('change', 'path/to/file.txt');
fileIndex.onFileChanged('unlink', 'path/to/deleted.txt');
```

### Symbol Extraction

```typescript
import { extractSymbolsFromFile } from '@tokenring-ai/file-index/symbols/symbolExtractor.ts';

const symbols = await extractSymbolsFromFile('/path/to/file.ts');
console.log(symbols);
// Output: [{ name: 'MyClass', kind: 'class', startLine: 10, endLine: 50 }, ...]
```

## Limitations and Considerations

- **Memory Usage**: The ephemeral provider stores all file contents in memory, which may not be suitable for very large codebases
- **Search Types**: Currently supports full-text and hybrid search. The semantic search tool requires a vector database
- **File Types**: Focuses on text files. Binary files are skipped
- **Performance**: Indexing runs asynchronously to avoid blocking operations
- **Extensibility**: Designed to be extensible for custom storage backends and search algorithms

## License

MIT License - see [LICENSE](./LICENSE) file for details.
