# @tokenring-ai/file-index

Service that add file contents or file names to the chat memory.

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search capabilities for TokenRing AI agents. It enables agents to index project files and perform efficient searches across codebases using hybrid search combining full-text matching, token overlap scoring, and embedding similarity with intelligent result merging.

### Key Features

- **Hybrid Search**: Combines full-text matching, token overlap scoring (BM25-like), and embedding similarity with intelligent result merging
- **Text Chunking**: Line-based chunking with ~1000 character chunks for efficient processing
- **Provider Architecture**: Extensible system supporting different storage backends through the FileIndexProvider interface
- **Agent Integration**: Seamless integration with TokenRing AI agents through tools and chat commands
- **Result Merging**: Advanced search algorithm that merges adjacent results for better context coverage
- **Chat Commands**: Built-in command interface for managing providers and performing searches
- **Tool Integration**: Exported tools for hybrid search functionality
- **State Management**: Agent-specific state persistence for active provider selection

## Installation

```bash
bun install @tokenring-ai/file-index
```

## Features

- Hybrid search combining multiple search strategies
- Line-based text chunking for efficient processing
- Extensible provider architecture for custom implementations
- Agent integration via tools and chat commands
- Advanced result merging and deduplication
- Interactive provider management through chat commands
- State persistence across agent sessions
- File change detection and lazy re-indexing

## Core Components/API

### FileIndexProvider

Abstract base class defining the interface for all file indexing providers.

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

In-memory implementation providing fast, non-persistent file indexing.

```typescript
import EphemeralFileIndexProvider from '@tokenring-ai/file-index/EphemeralFileIndexProvider';

const provider = new EphemeralFileIndexProvider('/path/to/project');
await provider.start();
```

**Key Features:**
- In-memory storage using Map for file contents and chunks
- Queue-based batch processing (250ms interval, 10 parallel tasks)
- Case-insensitive full-text search with relevance scoring
- Automatic file watching and lazy initialization
- File change handling (unlinks remove from index, changes trigger re-indexing)

**Chunking Strategy:**
- Line-based splitting with 1000 character limit per chunk
- Chunks concatenated with newlines between them

### FileIndexService

Registry service that manages multiple providers and allows dynamic switching between implementations.

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';
import { FileIndexServiceConfigSchema } from '@tokenring-ai/file-index/schema';
import { z } from 'zod';

const config: z.input<typeof FileIndexServiceConfigSchema> = {
  providers: {
    ephemeral: { type: 'ephemeral' }
  },
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const service = new FileIndexService(config);
```

**Key Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `registerFileIndexProvider` | `name: string`, `provider: FileIndexProvider` | `void` | Register a new provider |
| `getAvailableFileIndexProviders` | - | `string[]` | Get list of registered provider names |
| `setActiveProvider` | `name: string`, `agent: Agent` | `void` | Set active provider for an agent session |
| `requireActiveProvider` | `agent: Agent` | `FileIndexProvider` | Get current provider or throw if none set |
| `search` | `query: string`, `limit: number`, `agent: Agent` | `Promise<SearchResult[]>` | Execute search using active provider |
| `fullTextSearch` | `query: string`, `limit: number`, `agent: Agent` | `Promise<SearchResult[]>` | Full-text search via active provider |
| `waitReady` | `agent: Agent` | `Promise<void>` | Wait for provider initialization |
| `close` | `agent: Agent` | `Promise<void>` | Close and cleanup provider |
| `attach` | `agent: Agent` | `void` | Attach service to agent and initialize state |

### StringSearchFileIndexService

Alternative implementation focused on string-based search functionality.

```typescript
import StringSearchFileIndexService from '@tokenring-ai/file-index/StringSearchFileIndexService';

const service = new StringSearchFileIndexService(app, '/path/to/project');
await service.run();

const results = await service.search('query', 10, agent);
```

**Key Features:**
- Wrapper around EphemeralFileIndexProvider
- Simplified service interface for direct usage
- Integration with TokenRingApp
- Agent-aware initialization and waiting

### FileIndexState

Manages agent-specific state for file index including active provider selection.

```typescript
import { FileIndexState } from '@tokenring-ai/file-index/state/FileIndexState';

const state = agent.getState(FileIndexState);
console.log(state.activeProvider); // Current active provider
```

**State Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `activeProvider` | `string \| null` | Name of currently active provider |
| `initialConfig` | `object` | Agent defaults configuration from service |

**State Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `transferStateFromParent` | `parent: Agent` | `void` | Inherit active provider from parent agent |
| `reset` | - | `void` | Reset state to initial config provider |
| `serialize` | - | `object` | Return serializable state object |
| `deserialize` | `data: object` | `void` | Restore state from object |
| `show` | - | `string[]` | Display state information |

### Utility Functions

#### chunkText

Token-aware text chunking with sentence segmentation.

```typescript
import { chunkText } from '@tokenring-ai/file-index/util/chunker';

const chunks = chunkText(longText, {
  maxTokens: 256,
  overlapTokens: 32
});
```

**Options:**
- `maxTokens`: Maximum tokens per chunk (default: 256)
- `overlapTokens`: Overlap tokens between chunks (default: 32)

#### computeChunkLineStarts

Computes the starting line numbers for each chunk in the original text.

```typescript
import { computeChunkLineStarts } from '@tokenring-ai/file-index/util/ComputeChunkLineStarts';

const lineNumbers = computeChunkLineStarts(originalText, chunks);
```

#### sha256

Calculates SHA256 hash of the input text.

```typescript
import { sha256 } from '@tokenring-ai/file-index/util/sha256';

const hash = sha256('text to hash');
```

#### extractSymbolsFromFile

Extract symbols (functions, classes) from JavaScript/TypeScript files using tree-sitter.

```typescript
import { extractSymbolsFromFile } from '@tokenring-ai/file-index/symbols/symbolExtractor';

const symbols = await extractSymbolsFromFile('src/example.ts');
// [
//   { name: 'getUser', kind: 'function', startLine: 10, endLine: 25 },
//   { name: 'UserService', kind: 'class', startLine: 30, endLine: 50 }
// ]
```

## Usage Examples

### Basic Service Setup

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';
import EphemeralFileIndexProvider from '@tokenring-ai/file-index/EphemeralFileIndexProvider';
import { FileIndexServiceConfigSchema } from '@tokenring-ai/file-index/schema';
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

### Using the Hybrid Search Tool

```typescript
import { hybridSearchFileIndex } from '@tokenring-ai/file-index/tools';

// Perform hybrid search with tuned parameters
const results = await hybridSearchFileIndex.execute(
  {
    query: 'implement user authentication flow',
    topK: 5,              // Return 5 merged results
    textWeight: 0.3,      // 30% token overlap importance
    fullTextWeight: 0.3,  // 30% full-text matching importance
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

### Provider Management

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';

const fileIndexService = agent.requireServiceByType(FileIndexService);

// Get available providers
const providers = fileIndexService.getAvailableFileIndexProviders();
console.log('Available providers:', providers);

// Set provider for specific agent session
fileIndexService.setActiveProvider('ephemeral', agent);

// Wait for provider to be ready
await fileIndexService.waitReady(agent);

// Search using active provider
const results = await fileIndexService.search('user authentication', 10, agent);
```

### Using Chat Commands

```typescript
// Commands are automatically registered when plugin is installed
// Usage in agent chat:

// Search across indexed files
/fileindex search function getUser

// Get current provider
/fileindex provider get
// Response: Active provider: ephemeral

// Set specific provider
/fileindex provider set ephemeral
// Response: Active provider set to: ephemeral

// Reset to default provider
/fileindex provider reset
// Response: Default provider: ephemeral

// Interactively select provider
/fileindex provider select
// Shows interactive tree-select menu with available providers
```

### Custom Provider Implementation

```typescript
import FileIndexProvider, { SearchResult } from '@tokenring-ai/file-index/FileIndexProvider';
import fs from 'fs-extra';

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
        
        results.push({
          path: filePath,
          chunk_index: 0,
          content: match[0],
          relevance: match[0].length
        });
      }
    }
    
    return results.slice(0, limit).sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }

  async fullTextSearch(query: string, limit?: number): Promise<SearchResult[]> {
    return this.search(query, limit);
  }

  async processFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf8');
    this.indexedFiles.set(filePath, content);
  }

  onFileChanged(type: string, filePath: string): void {
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
    this.indexedFiles.clear();
    this.isReady = false;
  }

  private async loadAllFiles(): Promise<void> {
    // Load and index files from your custom storage
  }
}

// Register with service
fileIndexService.registerFileIndexProvider('custom', new CustomFileIndexProvider());
```

### Agent State Persistence

```typescript
import { FileIndexState } from '@tokenring-ai/file-index/state/FileIndexState';

// State is automatically managed per agent
const fileIndexService = agent.requireServiceByType(FileIndexService);

// State persists across agent sessions via serialization
const state = agent.getState(FileIndexState);

// Check current provider
const activeProvider = state.activeProvider;

// Serialize state for storage
const serialized = state.serialize();
// { activeProvider: 'ephemeral' }

// Restore state from storage
state.deserialize(serialized);

// Display state information
const stateInfo = state.show();
console.log(stateInfo.join('\n'));
// "Active FileIndex Provider: ephemeral"
```

## Configuration

### Plugin Configuration Schema

```typescript
import { FileIndexServiceConfigSchema } from '@tokenring-ai/file-index/schema';
import { z } from 'zod';

export const FileIndexServiceConfigSchema = z.object({
  providers: z.record(z.string(), z.any()),
  agentDefaults: z.object({
    provider: z.string()
  })
});

export const FileIndexAgentConfigSchema = z.object({
  provider: z.string().optional()
}).default({});
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

The agent's configuration slice is merged with the service's `agentDefaults` during service attachment using deep merge.

## Integration

### Plugin Registration

The package follows the standard TokenRing plugin pattern:

```typescript
import { TokenRingPlugin } from '@tokenring-ai/app';
import { z } from 'zod';
import agentCommands from '@tokenring-ai/file-index/commands';
import EphemeralFileIndexProvider from '@tokenring-ai/file-index/EphemeralFileIndexProvider';
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';
import packageJSON from './package.json' with { type: 'json' };
import { FileIndexServiceConfigSchema } from '@tokenring-ai/file-index/schema';
import tools from '@tokenring-ai/file-index/tools';
import { ChatService } from '@tokenring-ai/chat';
import { AgentCommandService } from '@tokenring-ai/agent';

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
      agentCommandService.addAgentCommands(agentCommands)
    );
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### Service Registration

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';

const fileIndexService = new FileIndexService(config);
app.addServices(fileIndexService);
```

## RPC Endpoints

This package does not define RPC endpoints. It provides functionality through:
- Chat tools (hybridSearchFileIndex)
- Chat commands (/fileindex)
- Direct service method calls

## State Management

### State Slice

The `FileIndexState` class manages agent-specific state:

```typescript
import { FileIndexState } from '@tokenring-ai/file-index/state/FileIndexState';

const state = agent.getState(FileIndexState);
```

**State Properties:**
- `activeProvider`: Name of currently active provider (nullable)

**Persistence:**
- State is automatically serialized when agent state is saved
- State is restored when agent is reinitialized
- Active provider persists across agent sessions

### Checkpoint Generation

State is automatically checkpointed as part of the agent's state management system. The `FileIndexState` implements the `AgentStateSlice` interface:

```typescript
serializationSchema = z.object({
  activeProvider: z.string().nullable()
});
```

## Chat Commands

### /fileindex

Main command router for file index operations.

#### /fileindex provider get

Display the currently active file index provider.

```
/fileindex provider get
```

**Response:**
```
Active provider: ephemeral
```

#### /fileindex provider set <name>

Set a specific file index provider by name.

```
/fileindex provider set ephemeral
```

**Response:**
```
Active provider set to: ephemeral
```

**Error Handling:**
- If provider name is empty: `Provider "" not found. Available providers: ephemeral, persistent`

#### /fileindex provider reset

Reset to the default provider from agent configuration.

```
/fileindex provider reset
```

**Response:**
```
Default provider: ephemeral
```

#### /fileindex provider select

Interactively select an active file index provider from available options.

```
/fileindex provider select
```

**Behavior:**
- Shows interactive tree-select menu with available providers
- Displays "(current)" marker for currently active provider
- Auto-selects sole available provider if only one is configured
- Returns early if no providers are registered
- Returns "Provider selection cancelled." if user cancels

#### /fileindex search <query>

Search for text across indexed files.

```
/fileindex search function getUser
```

**Response:**
```
Found 3 result(s):
📄 /path/to/file.ts:
...matching content...
```

**Error Handling:**
- If no results found: `No results found.`

## Tools

### hybridSearchFileIndex

Advanced hybrid search tool combining full-text search, token overlap scoring, and embedding similarity with intelligent result merging.

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
  execute: async (params, agent: Agent): Promise<TokenRingToolJSONResult<HybridSearchResult[]>>
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

**Returns:** `TokenRingToolJSONResult<HybridSearchResult[]>`

**HybridSearchResult Interface:**

```typescript
interface HybridSearchResult {
  path: string;         // Full path to the file
  start: number;        // Starting chunk index
  end: number;          // Ending chunk index
  hybridScore: number;  // Combined relevance score (0-1 range)
  content: string;      // Merged content of all chunks
}
```

**Search Algorithm:**

1. Executes both embedding-based and full-text search in parallel
2. Computes token overlap score using frequency analysis (BM25-like)
3. Normalizes and combines scores using weighted formula:
   - `hybridScore = (1 - textWeight - fullTextWeight) * embScore + textWeight * textScore + fullTextWeight * normalizedFullText`
4. Merges adjacent/nearby chunks within mergeRadius per file
5. Returns top K merged results sorted by hybrid score

**Example Usage:**

```typescript
import { hybridSearchFileIndex } from '@tokenring-ai/file-index/tools';

const results = await hybridSearchFileIndex.execute(
  {
    query: 'user authentication',
    topK: 5,
    textWeight: 0.3,
    fullTextWeight: 0.3,
    mergeRadius: 1
  },
  agent
);

console.log(results);
// [
//   {
//     path: '/src/auth.ts',
//     start: 5,
//     end: 8,
//     hybridScore: 0.85,
//     content: '...merged content from chunks 5-8...'
//   }
// ]
```

## Best Practices

### Search Weight Tuning

Experiment with different search weight combinations for your use case:

```typescript
// More emphasis on token overlap
const results1 = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.5, fullTextWeight: 0.2, mergeRadius: 1 },
  agent
);

// More emphasis on full-text matching
const results2 = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.2, fullTextWeight: 0.6, mergeRadius: 1 },
  agent
);

// Aggressive merging for broader context
const results3 = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.3, fullTextWeight: 0.3, mergeRadius: 2 },
  agent
);
```

### Provider Selection

- Use `ephemeral` provider for development and testing
- Consider implementing persistent providers for production use
- Let agents choose providers via `provider select` command for flexibility

### Chunk Size Optimization

The default chunk size is ~1000 characters. For specific use cases:

- Smaller chunks (500-700): Better for precise keyword matching
- Larger chunks (1200-1500): Better for broader context understanding

### Performance Considerations

- Batch processing with 10 parallel tasks for file indexing
- 250ms polling interval for file change detection
- Lazy initialization to avoid blocking startup

## Testing and Development

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

## Package Structure

```
pkg/file-index/
├── index.ts                          # Main entry point and exports
├── package.json                      # Package metadata and dependencies
├── plugin.ts                         # Plugin definition for app installation
├── schema.ts                         # Zod schemas for configuration
├── FileIndexProvider.ts              # Abstract provider interface
├── FileIndexService.ts               # Service registry for providers
├── StringSearchFileIndexService.ts   # Alternative file search implementation
├── EphemeralFileIndexProvider.ts     # In-memory provider implementation
├── commands.ts                       # Exports chat commands
│   └── commands/
│       └── fileindex/
│           ├── search.ts             # Search command implementation
│           └── provider/
│               ├── get.ts            # Display current provider
│               ├── set.ts            # Set provider by name
│               ├── reset.ts          # Reset to default provider
│               └── select.ts         # Interactive provider selection
├── tools.ts                          # Exports tools
│   └── tools/
│       └── hybridSearchFileIndex.ts  # Hybrid search tool
├── state/
│   └── FileIndexState.ts             # State management for file index
├── util/
│   ├── ComputeChunkLineStarts.ts     # Compute line starts for chunks
│   ├── chunker.ts                    # Token-aware chunking
│   └── sha256.ts                     # SHA256 hash utility
├── symbols/
│   └── symbolExtractor.ts            # Symbol extraction using tree-sitter
└── vitest.config.ts                  # Test configuration
```

## Dependencies

### Runtime Dependencies

All Token Ring packages are referenced as `@tokenring-ai/*` versions from the catalog:

| Package | Version | Purpose |
|---------|---------|---------|
| `@tokenring-ai/app` | 0.2.0 | Base application framework and plugin system |
| `@tokenring-ai/chat` | 0.2.0 | Chat and tool system |
| `@tokenring-ai/agent` | 0.2.0 | Agent orchestration and state management |
| `@tokenring-ai/filesystem` | 0.2.0 | File system operations |
| `@tokenring-ai/utility` | 0.2.0 | Shared utility functions |
| `zod` | ^4.3.6 | Schema validation |
| `fs-extra` | ^11.3.4 | File system operations |
| `chokidar` | ^5.0.0 | File watching |
| `commander` | ^14.0.3 | Command-line interface |
| `glob-gitignore` | ^1.0.15 | Gitignore-style pattern matching |
| `gpt-tokenizer` | ^3.4.0 | Token counting for chunking |
| `mysql2` | ^3.20.0 | MySQL client |
| `sentencex` | ^1.0.17 | Sentence segmentation |
| `sqlite-vec` | 0.1.8-alpha.1 | Vector database |
| `tree-sitter` | ^0.25.0 | Syntax parsing |
| `tree-sitter-javascript` | ^0.25.0 | JavaScript grammar |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.1.1 | Unit testing framework |
| `typescript` | ^6.0.2 | TypeScript compiler |
| `@types/fs-extra` | ^11.0.4 | Type definitions for fs-extra |

## Error Handling

### Common Errors

**No Active Provider:**
```
Error: No file index provider has been enabled.
```

**Solution:** Set an active provider before searching:
```typescript
fileIndexService.setActiveProvider('ephemeral', agent);
```

**Command Failed Errors:**

- Empty query: `No results found.`
- Provider not found: `Provider "name" not found. Available providers: ...`

### Error Types

- `CommandFailedError`: Thrown when command parameters are invalid
- Generic `Error`: Thrown when no active provider is set

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

## Related Components

- **@tokenring-ai/agent**: Agent orchestration and state management
- **@tokenring-ai/chat**: Chat and tool system
- **@tokenring-ai/app**: Base application framework
- **@tokenring-ai/filesystem**: File system operations
- **@tokenring-ai/utility**: Shared utility functions

## License

MIT License - see LICENSE file for details.
