# @tokenring-ai/file-index

Service that adds file contents or file names to chat memory through intelligent search and indexing.

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search capabilities for AI agents. It enables agents to index project files and perform efficient searches across codebases with multiple search strategies.

### Key Features

- **Multiple Search Strategies**: Hybrid search combining embedding similarity, full-text matching, and token overlap scoring
- **Text Chunking**: Line-based chunking with ~1000 character chunks for efficient processing
- **In-Memory Provider**: Fast, non-persistent file indexing using memory storage
- **Provider Architecture**: Extensible system supporting different storage backends through the provider interface
- **Agent Integration**: Seamless integration with TokenRing AI agents through tools and chat commands
- **Hybrid Search with Merging**: Advanced search algorithm that merges adjacent results for better context coverage
- **Chat Commands**: Built-in command interface for managing providers and performing searches
- **Tool Integration**: Exported tools for hybrid search functionality

## Installation

```bash
bun install @tokenring-ai/file-index
```

## Quick Start

### Basic Service Setup

```typescript
import FileIndexService from './FileIndexService.ts';
import EphemeralFileIndexProvider from './EphemeralFileIndexProvider.ts';
import { FileIndexServiceConfigSchema } from './schema.ts';

// Create file index service with configuration
const config = {
  providers: {
    ephemeral: {
      type: 'ephemeral'
    }
  },
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const fileIndexService = new FileIndexService(config);
app.addServices(fileIndexService);
```

### Using the Hybrid Search Tool

```typescript
import { hybridSearchFileIndex } from '@tokenring-ai/file-index/tools.ts';

// Perform hybrid search with merged results
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
// [
//   {
//     path: '/path/to/file.ts',
//     start: 5,
//     end: 10,
//     hybridScore: 0.85,
//     content: '...merged content...'
//   }
// ]
```

### Using the Chat Command

In your agent chat, use the `/fileindex` command:

```
/fileindex search function example
```

This will perform a search across all indexed files and display the results.

## Plugin Integration

The package follows the standard TokenRing plugin pattern with proper configuration and service registration:

```typescript
import {TokenRingPlugin} from '@tokenring-ai/app';
import {z} from 'zod';
import chatCommands from './chatCommands.ts';
import EphemeralFileIndexProvider from './EphemeralFileIndexProvider.ts';
import FileIndexService from './FileIndexService.ts';
import packageJSON from './package.json' with {type: 'json'};
import {FileIndexServiceConfigSchema} from './schema.ts';
import tools from './tools.ts';

const packageConfigSchema = z.object({
  fileIndex: FileIndexServiceConfigSchema.optional()
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (!config.fileIndex) return;

    const fileIndexService = new FileIndexService(config.fileIndex);
    app.addServices(fileIndexService);

    if (config.fileIndex.providers) {
      for (const name in config.fileIndex.providers) {
        const fileIndexConfig = config.fileIndex.providers[name];
        switch (fileIndexConfig.type) {
          case 'ephemeral':
            fileIndexService.registerFileIndexProvider(
              name,
              new EphemeralFileIndexProvider()
            );
            break;
        }
      }
    }

    app.waitForService(ChatService, chatService =>
      chatService.addTools(tools)
    );
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

## Package Structure

```
pkg/file-index/
├── index.ts                      # Main entry point and exports
├── package.json                  # Package metadata and dependencies
├── plugin.ts                     # Plugin definition for app installation
├── schema.ts                     # Zod schemas for configuration
├── FileIndexProvider.ts          # Abstract provider interface
├── EphemeralFileIndexProvider.ts # In-memory implementation
├── FileIndexService.ts           # Service registry for providers
├── chatCommands.ts               # Exports chat commands
│   └── commands/
│       └── fileindex/
│           ├── search.ts         # Search command implementation
│           └── provider.ts       # Provider command router
│               ├── get.ts        # Display current provider
│               ├── set.ts        # Set provider by name
│               ├── default.ts    # Reset to default provider
│               └── select.ts     # Interactive provider selection
├── tools.ts                      # Exports agent tools
│   └── hybridSearchFileIndex.ts  # Hybrid search tool
├── state/
│   └── FileIndexState.ts         # State management for file index
└── vitest.config.ts              # Test configuration
```

## Dependencies

### Runtime Dependencies

All Token Ring packages are referenced as `@tokenring-ai/*` versions from the catalog:

- `@tokenring-ai/app`: Base application framework and plugin system
- `@tokenring-ai/chat`: Chat and tool system
- `@tokenring-ai/agent`: Agent orchestration and state management
- `@tokenring-ai/filesystem`: File system operations
- `@tokenring-ai/utility`: Shared utility functions
- `zod`: Schema validation
- `fs-extra`: Enhanced filesystem utilities
- `chokidar`: File system watching for changes
- `glob-gitignore`: Gitignore-aware file matching
- `gpt-tokenizer`: Token counting for semantic analysis
- `sentencex`: Sentence segmentation utilities
- `tree-sitter`: Abstract syntax tree parsing
- `tree-sitter-javascript`: JavaScript/TypeScript language support
- `mysql2`: MySQL database driver (for future database provider)
- `sqlite-vec`: Vector search for SQLite (for future database provider)

## Core Components

### FileIndexProvider (Abstract Class)

The base interface for all file indexing providers. Implement this class to create custom storage backends and search algorithms.

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

An in-memory implementation providing fast, non-persistent file indexing.

```typescript
const provider = new EphemeralFileIndexProvider('/path/to/project');
await provider.start();
```

**Key Features:**

- In-memory storage using Map for file contents
- Queue-based batch processing for efficiency (250ms interval, 10 parallel tasks)
- Case-insensitive full-text search with BM25-like relevance scoring
- Automatic file watching and lazy initialization
- File change handling (unlinks remove from index, changes trigger re-indexing)

**Chunking Strategy:**
- Simple line-based splitting with 1000 character limit per chunk
- Chunks are concatenated with newlines between them

**Performance Characteristics:**
- Batch processing with up to 10 parallel tasks
- Polling interval of 250ms for file changes
- Lazy initialization pattern (files processed as queued)

### FileIndexService

A registry service that manages multiple providers and allows dynamic switching between implementations.

```typescript
const service = new FileIndexService(config);

// Register a provider
service.registerFileIndexProvider('ephemeral', new EphemeralFileIndexProvider());

// Get available providers
const providers = service.getAvailableFileIndexProviders();
```

**Key Methods:**

- `registerFileIndexProvider(name, provider)`: Register a new provider
- `getAvailableFileIndexProviders()`: Get list of registered provider names
- `setActiveProvider(name, agent)`: Set active provider for an agent session
- `search(query, limit, agent)`: Execute search using active provider
- `fullTextSearch(query, limit, agent)`: Full-text search via active provider
- `waitReady(agent)`: Wait for provider initialization
- `setCurrentFile(filePath, agent)`: Set current working file
- `clearCurrentFile(agent)`: Clear current file context
- `getCurrentFile(agent)`: Get current file path
- `close(agent)`: Close and cleanup provider

### FileIndexState

Manages agent-specific state for file index including active provider selection.

```typescript
import { FileIndexState } from './state/FileIndexState.ts';

// State automatically initialized when agent attaches to service
const state = agent.getState(FileIndexState);
```

**State Properties:**

- `activeProvider`: Name of currently active provider (nullable)
- `initialConfig`: Agent defaults configuration from service

**State Methods:**

- `transferStateFromParent(parent)`: Inherit active provider from parent agent
- `reset(what[])`: Reset state (currently no-op)
- `serialize()`: Return serializable state object
- `deserialize(data)`: Restore state from object
- `show()`: Display state information

## Tools

### hybridSearchFileIndex

Advanced hybrid search tool combining embedding similarity, full-text search, and token overlap scoring with intelligent result merging.

**Tool Definition:**

```typescript
const hybridSearchFileIndex = {
  name: 'file-index_hybridSearchFileIndex',
  displayName: 'FileIndex/hybridSearchFileIndex',
  description: 'Hybrid semantic+full-text+keyword search with merging/deduplication. Returns merged relevant code/text blocks.',
  inputSchema: z.object({
    query: z.string().describe('Text or code query: keyword, full-text, and semantic matches are combined.'),
    topK: z.number().int().default(10).describe('Number of top merged results to return (default 10)'),
    textWeight: z.number().default(0.3).describe('Weight (0-1) for token overlap score (default 0.3)'),
    fullTextWeight: z.number().default(0.3).describe('Weight (0-1) for full-text search score (default 0.3)'),
    mergeRadius: z.number().int().default(1).describe('How close (in chunk indices) hits must be to merge into a single region (default: 1)')
  }),
  execute: async (params, agent: Agent) => HybridSearchResult[]
};
```

**Input Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | - | Text or code query to search for |
| `topK` | number | 10 | Number of top merged results to return |
| `textWeight` | number | 0.3 | Weight (0-1) for token overlap score |
| `fullTextWeight` | number | 0.3 | Weight (0-1) for full-text search score |
| `mergeRadius` | number | 1 | Maximum gap between chunk indices to enable merging |

**Returns:** `HybridSearchResult[]` with merged search results:

```typescript
interface HybridSearchResult {
  path: string;         // Full path to the file
  start: number;        // Starting chunk index
  end: number;          // Ending chunk index
  hybridScore: number;  // Combined relevance score
  content: string;      // Merged content of all chunks
}
```

**Search Algorithm:**

1. Executes both embedding-based and full-text search in parallel
2. Computes token overlap score using frequency analysis (BM25-like)
3. Normalizes and combines scores using weighted formula
4. Merges adjacent/nearby chunks within mergeRadius per file
5. Returns top K merged results sorted by hybrid score

## Chat Commands

The `/fileindex` command provides command-line interface for provider management and search operations.

**Usage:**

```
/fileindex [action] [subaction]
```

### Provider Management Subcommands

#### /fileindex provider get

Display the currently active file index provider.

```
/fileindex provider get
```

#### /fileindex provider set <name>

Set a specific file index provider by name.

```
/fileindex provider set ephemeral
```

#### /fileindex provider default

Reset to the default provider from agent configuration.

```
/fileindex provider default
```

#### /fileindex provider select

Interactively select an active file index provider from available options.

```
/fileindex provider select
```

**Provider Selection Behavior:**

- Shows interactive tree-select menu with available providers
- Displays "(current)" marker for currently active provider
- Auto-selects sole available provider if only one is configured
- Returns early if no providers are registered

### Search Subcommands

#### /fileindex search <query>

Search for text across indexed files.

```
/fileindex search function getUser
/fileindex search class Component
```

**Search Behavior:**

- Searches across all indexed files
- Returns up to 10 matching results by default
- Displays file paths and matching content chunks
- Shows number of results found

**Examples:**

```
/fileindex provider get
# Response: Active provider: ephemeral

/fileindex provider set ephemeral
# Response: Active provider set to: ephemeral

/fileindex provider select
# Interactive prompt to choose provider

/fileindex search user authentication
# Response: Found 3 result(s):
# 📄 /path/to/file.ts:
# ...matching content...
```

## Configuration

### Plugin Configuration Schema

```typescript
const FileIndexServiceConfigSchema = z.object({
  providers: z.record(z.string(), z.any()),
  agentDefaults: z.object({
    provider: z.string()
  })
});

const packageConfigSchema = z.object({
  fileIndex: FileIndexServiceConfigSchema.optional()
});
```

### Configuration Example

```typescript
const config = {
  fileIndex: {
    providers: {
      ephemeral: {
        type: 'ephemeral'
      }
    },
    agentDefaults: {
      provider: 'ephemeral'
    }
  }
};
```

### Agent Configuration

Agents can override the default provider through agent configuration slices:

```typescript
const FileIndexAgentConfigSchema = z.object({
  provider: z.string().optional()
}).default({});
```

The agent's configuration slice is merged with the service's `agentDefaults` during service attachment.

## API Reference

### Search Results

```typescript
interface SearchResult {
  path: string;          // Full path to the file
  chunk_index: number;   // Index of the chunk in the file
  content: string;       // Content of the chunk
  relevance?: number;    // Relevance score (0-1 range)
  distance?: number;     // Distance score (0-1 range, lower is better)
}
```

### Hybrid Search Results

```typescript
interface HybridSearchResult {
  path: string;         // Full path to the file
  start: number;        // Starting chunk index (merged region)
  end: number;          // Ending chunk index (merged region)
  hybridScore: number;  // Combined relevance score (0-1 range)
  content: string;      // Merged content of all chunks in region
}
```

### FileIndexService Methods

```typescript
class FileIndexService {
  // Provider registration and discovery
  registerFileIndexProvider(name: string, provider: FileIndexProvider): void;
  getAvailableFileIndexProviders(): string[];

  // Service lifecycle and attachment
  attach(agent: Agent): void;

  // Provider activation per agent
  setActiveProvider(name: string, agent: Agent): void;

  // Search operations
  search(query: string, limit: number = 10, agent: Agent): Promise<SearchResult[]>;
  fullTextSearch(query: string, limit: number = 10, agent: Agent): Promise<SearchResult[]>;

  // Lifecycle management
  waitReady(agent: Agent): Promise<void>;
  close(agent: Agent): Promise<void>;

  // File context operations (delegated to active provider)
  setCurrentFile(filePath: string, agent: Agent): void;
  clearCurrentFile(agent: Agent): void;
  getCurrentFile(agent: Agent): string | null;
}
```

### FileIndexProvider Methods

```typescript
abstract class FileIndexProvider {
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

### FileIndexState Methods

```typescript
class FileIndexState implements AgentStateSlice<typeof serializationSchema> {
  name = "FileIndexState";
  activeProvider: string | null;
  serializationSchema = z.object({
    activeProvider: z.string().nullable()
  });

  constructor(readonly initialConfig: AgentDefaults);

  // State persistence across agent sessions
  transferStateFromParent(parent: Agent): void;
  reset(what: ResetWhat[]): void;

  // Serialization for state management
  serialize(): z.output<typeof serializationSchema>;
  deserialize(data: z.output<typeof serializationSchema>): void;

  // Debug and display
  show(): string[];
}
```

## Usage Examples

### Basic Service Setup

```typescript
import FileIndexService from './FileIndexService.ts';
import EphemeralFileIndexProvider from './EphemeralFileIndexProvider.ts';
import { FileIndexServiceConfigSchema } from './schema.ts';
import { z } from 'zod';

const config: z.input<typeof FileIndexServiceConfigSchema> = {
  providers: {
    ephemeral: {
      type: 'ephemeral'
    }
  },
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const fileIndexService = new FileIndexService(config);
app.addServices(fileIndexService);
```

### Plugin Integration with Chat Commands

```typescript
import {TokenRingPlugin} from '@tokenring-ai/app';
import {z} from 'zod';
import chatCommands from './chatCommands.ts';
import EphemeralFileIndexProvider from './EphemeralFileIndexProvider.ts';
import FileIndexService from './FileIndexService.ts';
import packageJSON from './package.json' with {type: 'json'};
import {FileIndexServiceConfigSchema} from './schema.ts';
import tools from './tools.ts';

const packageConfigSchema = z.object({
  fileIndex: FileIndexServiceConfigSchema.optional()
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (!config.fileIndex) return;

    const fileIndexService = new FileIndexService(config.fileIndex);
    app.addServices(fileIndexService);

    if (config.fileIndex.providers) {
      for (const name in config.fileIndex.providers) {
        const fileIndexConfig = config.fileIndex.providers[name];
        switch (fileIndexConfig.type) {
          case 'ephemeral':
            fileIndexService.registerFileIndexProvider(
              name,
              new EphemeralFileIndexProvider()
            );
            break;
        }
      }
    }

    // Register tools for agents
    app.waitForService(ChatService, chatService =>
      chatService.addTools(tools)
    );

    // Register chat commands
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### Using the Hybrid Search Tool

```typescript
import { hybridSearchFileIndex } from './tools.ts';

// Perform hybrid search with tuned parameters
const results = await hybridSearchFileIndex.execute(
  {
    query: 'implement user authentication flow',
    topK: 5,              // Return 5 merged results
    textWeight: 0.3,      // 30% token overlap importance
    fullTextWeight: 0.3, // 30% full-text matching importance
    mergeRadius: 1        // Merge adjacent chunks within 1 index
  },
  agent
);

console.log(`Found ${results.length} merged regions:`);
for (const result of results) {
  console.log(`\n📄 ${result.path} (chunks ${result.start}-${result.end}):`);
  console.log(`   Score: ${result.hybridScore.toFixed(3)}`);
  console.log(`   Content:\n${result.content}`);
}
```

### Switching Providers at Runtime

```typescript
const fileIndexService = app.services.get(FileIndexService);
const agent = app.getCurrentAgent();

// Get available providers
const providers = fileIndexService.getAvailableFileIndexProviders();
console.log('Available providers:', providers);

// Set provider for specific agent session
fileIndexService.setActiveProvider('ephemeral', agent);

// Check active provider
const state = agent.getState(FileIndexState);
console.log('Active provider:', state.activeProvider);
```

### Using Chat Commands

```typescript
// In your plugin.ts, commands are automatically registered
app.waitForService(ChatService, chatService =>
  chatService.addTools(tools)
);
app.waitForService(AgentCommandService, agentCommandService =>
  agentCommandService.addAgentCommands(chatCommands)
);

// Usage in agent chat:
// /fileindex search function getUser
// /fileindex provider get
// /fileindex provider set ephemeral
// /fileindex provider default
// /fileindex provider select
```

### Provider Management

```typescript
const fileIndexService = agent.requireServiceByType(FileIndexService);

// Register a new provider
fileIndexService.registerFileIndexProvider(
  'customProvider',
  new CustomFileIndexProvider()
);

// Get available providers
const providers = fileIndexService.getAvailableFileIndexProviders();
// Returns: ['ephemeral', 'customProvider']

// Set active provider for agent session
fileIndexService.setActiveProvider('customProvider', agent);

// Wait for provider to be ready
await fileIndexService.waitReady(agent);

// Search using active provider
const results = await fileIndexService.search('user', 10, agent);
```

### File Context Management

```typescript
const fileIndex = agent.requireServiceByType(FileIndexService);

// Set current working file
fileIndex.setCurrentFile('/path/to/file.ts', agent);

// Get current file
const currentFile = fileIndex.getCurrentFile(agent);
console.log('Current file:', currentFile);

// Clear current file context
fileIndex.clearCurrentFile(agent);

// Close provider and cleanup resources
await fileIndex.close(agent);
```

### Custom Provider Implementation

```typescript
import FileIndexProvider, {SearchResult} from './FileIndexProvider.ts';
import fs from 'fs-extra';
import path from 'path';

class CustomFileIndexProvider extends FileIndexProvider {
  private indexedFiles = new Map<string, string>();
  private isReady = false;

  async waitReady(): Promise<void> {
    if (!this.isReady) {
      await this.loadAllFiles();
      this.isReady = true;
    }
  }

  async search(query: string, limit?: number): Promise<SearchResult[]> {
    await this.waitReady();

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [filePath, content] of this.indexedFiles.entries()) {
      const matches = content.matchAll(new RegExp(lowerQuery, 'gi'));
      for (const match of matches) {
        if (results.length >= (limit || 10)) break;

        // Add search result with positions
        results.push({
          path: filePath,
          chunk_index: 0,
          content: match[0],
          relevance: match[0].length
        });

        if (results.length >= (limit || 10)) break;
      }
    }

    return results.slice(0, limit).sort((a, b) => b.relevance! - a.relevance!);
  }

  async fullTextSearch(query: string, limit?: number): Promise<SearchResult[]> {
    return this.search(query, limit);
  }

  private async loadAllFiles(): Promise<void> {
    // Load and index files from your custom storage
    this.indexedFiles.set('/path/to/file.ts', 'file content here');
  }

  async processFile(filePath: string): Promise<void> {
    // Process individual file changes
    const content = await fs.readFile(filePath, 'utf8');
    this.indexedFiles.set(filePath, content);
  }

  onFileChanged(type: string, filePath: string): void {
    // Handle file change notifications
    if (type === 'unlink') {
      this.indexedFiles.delete(filePath);
    } else {
      this.processFile(filePath);
    }
  }

  setCurrentFile(filePath: string): void {
    // Implement file context tracking
  }

  clearCurrentFile(): void {
    // Reset current file context
  }

  getCurrentFile(): string | null {
    return null;
  }

  async close(): Promise<void> {
    // Cleanup resources
    this.indexedFiles.clear();
    this.isReady = true;
  }
}
```

### Agent State Persistence

```typescript
import { FileIndexState } from './state/FileIndexState.ts';

// State is automatically managed per agent
const fileIndexService = agent.requireServiceByType(FileIndexService);

// State persists across agent sessions via serialization
const state = agent.getState(FileIndexState);

// State can be transferred from parent agent
state.transferStateFromParent(parentAgent);

// Check current provider
const activeProvider = state.activeProvider;

// Serialize state for storage
const serialized = state.serialize();

// Restore state from storage
state.deserialize(serialized);

// Display state information
const stateInfo = state.show();
console.log(stateInfo.join('\n'));
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

### Configurable Search Weights

Experiment with different search weight combinations for your use case:

```typescript
// More semantic search
const semanticResults = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.5, fullTextWeight: 0.2, mergeRadius: 1 },
  agent
);

// More full-text matching
const textResults = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.2, fullTextWeight: 0.6, mergeRadius: 1 },
  agent
);

// Aggressive merging for context
const mergedResults = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.3, fullTextWeight: 0.3, mergeRadius: 2 },
  agent
);
```

### Multi-Provider Configuration

Configure multiple providers and let agents choose:

```typescript
const config = {
  providers: {
    ephemeral: {
      type: 'ephemeral'
    }
    // Future: persistent, database providers
  },
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const fileIndexService = new FileIndexService(config);

// Register multiple providers
fileIndexService.registerFileIndexProvider('ephemeral', new EphemeralFileIndexProvider());
// fileIndexService.registerFileIndexProvider('persistent', new PersistentFileIndexProvider());
```

### Agent-Specific Provider Selection

Agents can have different default providers via configuration slices:

```typescript
// In agent configuration
const agentConfig = {
  fileIndex: {
    provider: 'persistent' // Override service default
  }
};

const serviceDefaults = {
  provider: 'ephemeral'
};

// Service merges these during attachment
const mergedConfig = deepMerge(serviceDefaults, agentConfig.fileIndex);
```

## Limitations and Considerations

- **Memory Usage**: The ephemeral provider stores all indexed files in memory, which may be unsuitable for very large codebases (5000+ files)
- **Search Methods**: The default `search()` method delegates to `fullTextSearch()`, so both achieve similar results from the current implementation
- **Storage Backend**: Currently only ephemeral in-memory provider is implemented. Database and vector providers are planned for future versions
- **File Types**: Focuses on text files. Binary files are silently skipped during indexing
- **Search Dimensions**: Currently provides full-text and hybrid scoring. True semantic search requires embedding model integration
- **Indexing Performance**: Large codebases may experience initial indexing lag due to lazy loading and batch processing
- **Chunk Size**: Fixed at ~1000 characters with simple line-based splitting. Variable chunking is possible with custom providers
- **Result Merging**: Merge behavior is controlled by `mergeRadius` parameter. Larger values increase context but reduce precision
- **Provider Switching**: Provider selection is session-specific. Changing provider affects only current agent session
- **Updates**: File modifications are only indexed after processing queue settles (250ms delay)

## Future Enhancements

Potential improvements for future versions:

- **Persistent Storage Providers**: SQLite, PostgreSQL, or cloud-based persistence options
- **Vector Search Providers**: Integration with embedding models and vector databases
- **Semantic Chunking**: Smart sentence-based or content-aware chunking
- **File Type Filtering**: Configuration options for which file types to index
- **Directory Exclusions**: Gitignore-style patterns for folder filtering
- **Incremental Indexing**: Optimized updates for changed files only
- **Search Rankings**: More sophisticated BM25 implementations
- **Index Statistics**: Metrics for indexed file count, total size, last update

## License

MIT License - see [LICENSE](./LICENSE) file for details.
