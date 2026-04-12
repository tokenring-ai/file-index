# @tokenring-ai/file-index

File indexing and search service for TokenRing AI agents.

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search
capabilities for TokenRing AI agents. It enables agents to index project files
and perform efficient searches across codebases using full-text matching with
relevance scoring and intelligent result merging.

The package implements a provider architecture that allows for different storage
backends, with an in-memory ephemeral provider currently available. It integrates
seamlessly with TokenRing agents through tools, chat commands, and state management.

### Key Features

- **Full-Text Search**: Case-insensitive string matching with relevance scoring
- **Line-Based Chunking**: Line-based chunking with ~1000 character limit
- **Provider Architecture**: Extensible system for different storage backends
- **Agent Integration**: Integration with TokenRing AI agents through tools
- **Result Merging**: Merges adjacent/nearby chunks for better context coverage
- **Chat Commands**: Command interface for managing providers and searches
- **Hybrid Search Tool**: Combines full-text search with token overlap scoring
- **State Management**: Agent-specific state persistence for active provider
- **Lazy Initialization**: Non-blocking initialization with background processing
- **File Change Detection**: Handles file changes via polling

## Installation

```bash
bun install @tokenring-ai/file-index
```

## Features

- Full-text search with case-insensitive matching and relevance scoring
- Line-based text chunking with 1000 character limit
- Extensible provider architecture for custom implementations
- Agent integration via tools and chat commands
- Advanced result merging with configurable merge radius
- Interactive provider management through chat commands
- State persistence across agent sessions
- Lazy file indexing with batch processing (10 parallel tasks)
- File change detection with 250ms polling interval

## Chat Commands

| Command | Description |
|---------|-------------|
| `/fileindex search <query>` | Search for text across indexed files |
| `/fileindex provider get` | Display the currently active provider |
| `/fileindex provider set <name>` | Set a specific provider by name |
| `/fileindex provider reset` | Reset to the default provider |
| `/fileindex provider select` | Interactively select a provider |

## Tools

| Tool | Description |
|------|-------------|
| `hybridSearchFileIndex` | Hybrid search combining full-text and token overlap |

## Configuration

### Environment Variables

This package does not require any environment variables.

### Plugin Configuration

```yaml
fileIndex:
  agentDefaults:
    provider: ephemeral
```

## License

MIT License - see LICENSE file for details.

## Core Components/API

### FileIndexProvider

Abstract base class defining the interface for all file indexing providers.
All providers must implement this interface.

```typescript
export interface SearchResult {
  path: string;
  chunk_index: number;
  content: string;
  relevance?: number;
  distance?: number;
}

export default abstract class FileIndexProvider {
  abstract search(
    query: string,
    limit?: number
  ): MaybePromise<SearchResult[]>;

  abstract fullTextSearch(
    query: string,
    limit?: number
  ): MaybePromise<SearchResult[]>;

  abstract waitReady(): MaybePromise<void>;
  abstract processFile(filePath: string): MaybePromise<void>;
  abstract onFileChanged(type: string, filePath: string): void;
  abstract close(): MaybePromise<void>;

  abstract setCurrentFile(filePath: string): void;
  abstract clearCurrentFile(): void;
  abstract getCurrentFile(): string | null;
}
```

### EphemeralFileIndexProvider

In-memory implementation providing fast, non-persistent file indexing.
This is the only currently available provider implementation.

```typescript
import EphemeralFileIndexProvider
  from '@tokenring-ai/file-index/EphemeralFileIndexProvider';

const provider = new EphemeralFileIndexProvider('/path/to/project');
await provider.start();
```

**Key Features:**

- In-memory storage using Map for file contents and chunks
- Queue-based batch processing (250ms interval, 10 parallel tasks)
- Case-insensitive full-text search with relevance scoring
- Lazy initialization with background file processing
- File change handling (unlinks remove from index)

**Chunking Strategy:**

- Line-based splitting with 1000 character limit per chunk
- Chunks concatenated with newlines between them
- Simple and fast, no tokenization or sentence segmentation

**Constructor:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseDirectory` | `string` | `process.cwd()` | Base directory for file operations |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `start()` | - | `Promise<void>` | Start lazy initialization |
| `waitReady()` | - | `Promise<void>` | Wait for initialization |
| `processFile()` | `filePath: string` | `Promise<void>` | Process and index file |
| `onFileChanged()` | `type: string`, `filePath: string` | `void` | Handle file changes |
| `fullTextSearch()` | `query: string`, `limit: number` | `Promise<SearchResult[]>` | Full-text search |
| `search()` | `query: string`, `limit: number` | `Promise<SearchResult[]>` | Search |
| `setCurrentFile()` | `filePath: string` | `void` | Set current file context |
| `clearCurrentFile()` | - | `void` | Clear current file context |
| `getCurrentFile()` | - | `string \| null` | Get current file context |
| `close()` | - | `Promise<void>` | Cleanup and clear data |

### FileIndexService

Registry service that manages multiple providers and allows dynamic switching
between implementations. Implements the `TokenRingService` interface.

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';
import { FileIndexServiceConfigSchema } from '@tokenring-ai/file-index/schema';
import { z } from 'zod';

const config: z.input<typeof FileIndexServiceConfigSchema> = {
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const service = new FileIndexService(config);
```

**Service Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Service name: "FileIndexService" |
| `description` | `string` | Service description |
| `options` | `object` | Service configuration from schema |

**Key Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `registerFileIndexProvider` | `name: string`, `provider: FileIndexProvider` | `void` | Register a new provider |
| `getAvailableFileIndexProviders` | - | `string[]` | Get registered provider names |
| `setActiveProvider` | `name: string`, `agent: Agent` | `void` | Set active provider |
| `requireActiveProvider` | `agent: Agent` | `FileIndexProvider` | Get current provider |
| `search` | `query: string`, `limit: number`, `agent: Agent` | `Promise<SearchResult[]>` | Execute search |
| `fullTextSearch` | `query: string`, `limit: number`, `agent: Agent` | `Promise<SearchResult[]>` | Full-text search |
| `waitReady` | `agent: Agent` | `Promise<void>` | Wait for initialization |
| `close` | `agent: Agent` | `Promise<void>` | Close and cleanup |
| `attach` | `agent: Agent` | `void` | Attach service to agent |

### StringSearchFileIndexService

Alternative service implementation that wraps EphemeralFileIndexProvider
for direct usage with TokenRingApp.

```typescript
import StringSearchFileIndexService
  from '@tokenring-ai/file-index/StringSearchFileIndexService';

const service = new StringSearchFileIndexService(app, '/path/to/project');
await service.run();

const results = await service.search('query', 10, agent);
```

**Key Features:**

- Wrapper around EphemeralFileIndexProvider
- Implements TokenRingService interface
- Integration with TokenRingApp
- Agent-aware initialization and waiting

**Constructor:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `TokenRingApp` | Application instance |
| `baseDirectory` | `string` | Optional base directory |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `run()` | - | `Promise<void>` | Start the provider |
| `waitReady()` | `agent: Agent` | `Promise<void>` | Wait for initialization |
| `fullTextSearch()` | `query: string`, `limit: number`, `agent: Agent` | `Promise<SearchResult[]>` | Full-text search |
| `search()` | `query: string`, `limit: number`, `agent: Agent` | `Promise<SearchResult[]>` | Search |
| `close()` | - | `Promise<void>` | Close provider |

### FileIndexState

Manages agent-specific state for file index including active provider selection.
Extends `AgentStateSlice`.

```typescript
import { FileIndexState } from '@tokenring-ai/file-index/state/FileIndexState';

const state = agent.getState(FileIndexState);
console.log(state.activeProvider);
```

**State Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `activeProvider` | `string \| null` | Name of currently active provider |
| `initialConfig` | `object` | Agent defaults configuration |

**State Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `transferStateFromParent` | `parent: Agent` | `void` | Inherit from parent |
| `reset` | - | `void` | Reset to initial config |
| `serialize` | - | `{ activeProvider: string \| null }` | Serialize state |
| `deserialize` | `data: object` | `void` | Restore state |
| `show` | - | `string` | Display state info |

**Serialization Schema:**

```typescript
const serializationSchema = z.object({
  activeProvider: z.string().nullable()
});
```

## Usage Examples

### Plugin Installation

```typescript
import { TokenRingApp } from '@tokenring-ai/app';
import fileIndexPlugin from '@tokenring-ai/file-index/plugin';

const app = new TokenRingApp();

await app.install(fileIndexPlugin, {
  fileIndex: {
    agentDefaults: {
      provider: 'ephemeral'
    }
  }
});
```

### Direct Service Setup

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';
import EphemeralFileIndexProvider
  from '@tokenring-ai/file-index/EphemeralFileIndexProvider';
import { FileIndexServiceConfigSchema } from '@tokenring-ai/file-index/schema';
import { z } from 'zod';

const config: z.input<typeof FileIndexServiceConfigSchema> = {
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const fileIndexService = new FileIndexService(config);
app.addServices(fileIndexService);

fileIndexService.registerFileIndexProvider(
  'ephemeral',
  new EphemeralFileIndexProvider()
);
```

### Using the Hybrid Search Tool

```typescript
import { hybridSearchFileIndex } from '@tokenring-ai/file-index/tools';

const results = await hybridSearchFileIndex.execute(
  {
    query: 'implement user authentication flow',
    topK: 5,
    textWeight: 0.3,
    fullTextWeight: 0.3,
    mergeRadius: 1
  },
  agent
);

console.log(`Found ${results.data.length} merged regions:`);
for (const result of results.data) {
  console.log(`\n📄 ${result.path} (chunks ${result.start}-${result.end}):`);
  console.log(`   Score: ${result.hybridScore.toFixed(3)}`);
  console.log(`   Content:\n${result.content}`);
}
```

### Provider Management

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';

const fileIndexService = agent.requireServiceByType(FileIndexService);

const providers = fileIndexService.getAvailableFileIndexProviders();
console.log('Available providers:', providers);

fileIndexService.setActiveProvider('ephemeral', agent);

await fileIndexService.waitReady(agent);

const results = await fileIndexService.search(
  'user authentication',
  10,
  agent
);
console.log(`Found ${results.length} results`);
```

### Using StringSearchFileIndexService

```typescript
import StringSearchFileIndexService
  from '@tokenring-ai/file-index/StringSearchFileIndexService';
import TokenRingApp from '@tokenring-ai/app';

const app = new TokenRingApp();
const service = new StringSearchFileIndexService(app, '/path/to/project');

await service.run();
await service.waitReady(agent);

const results = await service.search('query', 10, agent);
console.log(`Found ${results.length} results`);

await service.close();
```

### Using Chat Commands

```typescript
// Commands are automatically registered when plugin is installed

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
import FileIndexProvider, { SearchResult }
  from '@tokenring-ai/file-index/FileIndexProvider';
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

    return results.slice(0, limit)
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
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
fileIndexService.registerFileIndexProvider(
  'custom',
  new CustomFileIndexProvider()
);
```

### Agent State Persistence

```typescript
import { FileIndexState } from '@tokenring-ai/file-index/state/FileIndexState';

const fileIndexService = agent.requireServiceByType(FileIndexService);

const state = agent.getState(FileIndexState);

const activeProvider = state.activeProvider;

const serialized = state.serialize();
// { activeProvider: 'ephemeral' }

state.deserialize(serialized);

const stateInfo = state.show();
console.log(stateInfo);
// "Active FileIndex Provider: ephemeral"
```

## Configuration

### Plugin Configuration Schema

The plugin accepts configuration through the `fileIndex` property:

```typescript
import { FileIndexServiceConfigSchema }
  from '@tokenring-ai/file-index/schema';
import { z } from 'zod';

export const FileIndexAgentConfigSchema = z
  .object({
    provider: z.string().optional()
  })
  .default({});

export const FileIndexProviderConfigSchema = z.object({
  type: z.enum(['ephemeral'])
});

export const FileIndexServiceConfigSchema = z.object({
  agentDefaults: z
    .object({
      provider: z.string()
    })
    .default({ provider: 'ephemeral' })
});
```

**Schema Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `agentDefaults` | `object` | Yes | Default agent configuration |
| `agentDefaults.provider` | `string` | Yes | Default provider name |
| `type` | `"ephemeral"` | Yes | Provider type |

### Plugin Configuration Example

```typescript
const config = {
  fileIndex: {
    agentDefaults: {
      provider: 'ephemeral'
    }
  }
};
```

### Service Configuration

When creating the service directly:

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';

const config = {
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const service = new FileIndexService(config);
```

### Agent Configuration

Agents can override the default provider through agent configuration slices.
The agent's configuration is merged with the service's `agentDefaults`
using deep merge:

```typescript
const agentConfig = {
  provider: 'ephemeral'
};
```

## Integration

### Plugin Registration

The package follows the standard TokenRing plugin pattern. The plugin
automatically:

1. Creates and registers the `FileIndexService`
2. Registers the `ephemeral` provider
3. Registers tools with `ChatService`
4. Registers chat commands with `AgentCommandService`

```typescript
import { AgentCommandService } from '@tokenring-ai/agent';
import type { TokenRingPlugin } from '@tokenring-ai/app';
import { ChatService } from '@tokenring-ai/chat';
import { z } from 'zod';
import agentCommands from './commands';
import EphemeralFileIndexProvider from './EphemeralFileIndexProvider';
import FileIndexService from './FileIndexService';
import packageJSON from './package.json' with { type: 'json' };
import { FileIndexServiceConfigSchema } from './schema';
import tools from './tools';

const packageConfigSchema = z.object({
  fileIndex: FileIndexServiceConfigSchema.prefault({})
});

export default {
  name: packageJSON.name,
  displayName: 'File Indexing',
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    const fileIndexService = new FileIndexService(config.fileIndex);
    app.addServices(fileIndexService);

    fileIndexService.registerFileIndexProvider(
      'ephemeral',
      new EphemeralFileIndexProvider()
    );

    app.waitForService(ChatService, (chatService) =>
      chatService.addTools(tools)
    );
    app.waitForService(AgentCommandService, (agentCommandService) =>
      agentCommandService.addAgentCommands(agentCommands)
    );
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### Manual Service Registration

For direct service registration without the plugin:

```typescript
import FileIndexService from '@tokenring-ai/file-index/FileIndexService';
import EphemeralFileIndexProvider
  from '@tokenring-ai/file-index/EphemeralFileIndexProvider';

const config = {
  agentDefaults: {
    provider: 'ephemeral'
  }
};

const fileIndexService = new FileIndexService(config);
app.addServices(fileIndexService);

fileIndexService.registerFileIndexProvider(
  'ephemeral',
  new EphemeralFileIndexProvider()
);

chatService.addTools(tools);
agentCommandService.addAgentCommands(agentCommands);
```

### Agent Integration

The service integrates with agents through:

1. **State Management**: `FileIndexState` is attached to each agent
2. **Tools**: `hybridSearchFileIndex` tool is available to agents
3. **Commands**: `/fileindex` commands are available in agent chat
4. **Service Access**: Agents can access the service via
   `agent.requireServiceByType(FileIndexService)`

```typescript
const fileIndexService = agent.requireServiceByType(FileIndexService);

const state = agent.getState(FileIndexState);
console.log(state.activeProvider);
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

State is automatically checkpointed as part of the agent's state management
system. The `FileIndexState` implements the `AgentStateSlice` interface:

```typescript
serializationSchema = z.object({
  activeProvider: z.string().nullable()
});
```

## Chat Commands

### /fileindex provider get

Display the currently active file index provider.

**Syntax:**

```
/fileindex provider get
```

**Example:**

```
/fileindex provider get
```

**Response:**

```
Active provider: ephemeral
```

**Description:** Shows the name of the currently active file index provider.
Returns "none" if no provider is set.

### /fileindex provider set <providerName>

Set a specific file index provider by name.

**Syntax:**

```
/fileindex provider set <providerName>
```

**Example:**

```
/fileindex provider set ephemeral
```

**Response (success):**

```
Active provider set to: ephemeral
```

**Response (error):**

```
Provider "invalid" not found. Available providers: ephemeral
```

**Parameters:**

- `providerName` (required): The name of the provider to activate

**Description:** Sets the active file index provider for the current agent
session. The provider must be registered with the service.

### /fileindex provider reset

Reset to the default provider from agent configuration.

**Syntax:**

```
/fileindex provider reset
```

**Example:**

```
/fileindex provider reset
```

**Response:**

```
Default provider: ephemeral
```

**Description:** Resets the active provider to the default configured in
the agent's initial configuration.

### /fileindex provider select

Interactively select an active file index provider from available options.

**Syntax:**

```
/fileindex provider select
```

**Example:**

```
/fileindex provider select
```

**Response:**

```
Active provider set to: ephemeral
```

**Behavior:**

- Shows interactive tree-select menu with available providers
- Displays "(current)" marker for currently active provider
- Auto-selects sole available provider if only one is configured
- Returns "No file index providers are registered." if no providers exist
- Returns "Provider selection cancelled." if user cancels

### /fileindex search <query>

Search for text across indexed files.

**Syntax:**

```
/fileindex search <query>
```

**Example:**

```
/fileindex search function getUser
```

**Response:**

```
Found 3 result(s):
📄 /path/to/file.ts:
...matching content...

📄 /path/to/another.ts:
...matching content...
```

**Parameters:**

- `query` (required): The search query string

**Description:** Performs a full-text search across all indexed files and
returns up to 10 matching results with file paths and content. Waits for
the provider to be ready before searching.

**Response (no results):**

```
No results found.
```

## Tools

### hybridSearchFileIndex

Advanced hybrid search tool combining full-text search and token overlap
scoring with intelligent result merging.

**Tool Definition:**

```typescript
const hybridSearchFileIndex = {
  name: 'file-index_hybridSearchFileIndex',
  displayName: 'FileIndex/hybridSearchFileIndex',
  description:
    'Hybrid full-text+keyword search with merging/deduplication.',
  inputSchema: z.object({
    query: z.string().describe(
      'Text or code query: keyword and full-text matches combined.'
    ),
    topK: z.number().int().default(10).describe(
      'Number of top merged results to return (default 10)'
    ),
    textWeight: z.number().default(0.3).describe(
      'Weight (0-1) for token overlap score (default 0.3)'
    ),
    fullTextWeight: z.number().default(0.3).describe(
      'Weight (0-1) for full-text search score (default 0.3)'
    ),
    mergeRadius: z.number().int().default(1).describe(
      'How close (in chunk indices) hits must be to merge (default: 1)'
    )
  }),
  execute: async (params, agent: Agent)
    : Promise<TokenRingToolJSONResult<HybridSearchResult[]>>
};
```

**Input Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | - | Text or code query to search for |
| `topK` | number | 10 | Number of top merged results to return |
| `textWeight` | number | 0.3 | Weight for token overlap score |
| `fullTextWeight` | number | 0.3 | Weight for full-text search score |
| `mergeRadius` | number | 1 | Maximum gap between chunks to merge |

**Returns:** `TokenRingToolJSONResult<HybridSearchResult[]>`

**HybridSearchResult Interface:**

```typescript
interface HybridSearchResult {
  path: string;         // Full path to the file (absolute path)
  start: number;        // Starting chunk index in the file
  end: number;          // Ending chunk index in the file
  hybridScore: number;  // Combined relevance score
  content: string;      // Merged content of all chunks in the range
}
```

**Search Algorithm:**

1. **Parallel Search**: Executes both `fileIndex.search` and
   `fileIndex.fullTextSearch` in parallel with `topK * 4` results each
2. **Token Overlap (BM25-like)**: Computes token overlap score by counting
   query tokens found in each chunk

   ```typescript
   const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
   const textTokens = text.toLowerCase().split(/\W+/).filter(Boolean);
   const overlap = textTokens.filter((t) => queryTokens.includes(t)).length;
   const textScore = overlap / (queryTokens.length || 1);
   ```

3. **Score Combination**: Normalizes and combines scores using weighted formula:
   - `embScore = 1 - distance` (converts embedding distance to similarity)
   - `normalizedFullText = fullTextScore / maxFullTextScore`
   - `hybridScore = (1 - textWeight - fullTextWeight) * embScore
     + textWeight * textScore + fullTextWeight * normalizedFullText`
4. **Chunk Merging**: Groups results by file and merges adjacent/nearby
   chunks within `mergeRadius`
5. **Result Selection**: Returns top K merged result blocks sorted by
   hybrid score

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

console.log(`Found ${results.data.length} merged regions`);
for (const result of results.data) {
  console.log(`\n📄 ${result.path} (chunks ${result.start}-${result.end}):`);
  console.log(`   Score: ${result.hybridScore.toFixed(3)}`);
  console.log(`   Content:\n${result.content}`);
}
```

**Tuning Parameters:**

```typescript
// Emphasis on token overlap (keyword matching)
const keywordFocused = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.5, fullTextWeight: 0.2, mergeRadius: 1 },
  agent
);

// Emphasis on full-text matching
const fullTextFocused = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.2, fullTextWeight: 0.6, mergeRadius: 1 },
  agent
);

// Aggressive merging for broader context
const broadContext = await hybridSearchFileIndex.execute(
  { query, topK, textWeight: 0.3, fullTextWeight: 0.3, mergeRadius: 2 },
  agent
);
```

**Note:** The tool requires an active file index provider to be set.
If no provider is active, it will throw an error.

### Available Tools Export

Tools are exported from `@tokenring-ai/file-index/tools`:

```typescript
import tools from '@tokenring-ai/file-index/tools';

// Currently exports:
// - hybridSearchFileIndex

// Note: searchFileIndex tool is commented out in the current implementation
// and not included in the exported tools.
```

## Best Practices

### Search Weight Tuning

The hybrid search tool allows tuning of search weights for different use cases.
See the **Tools** section for detailed parameter tuning examples.

### Provider Selection

- Use `ephemeral` provider for development and testing
- Consider implementing persistent providers for production use
- Let agents choose providers via `/fileindex provider select` command

### Chunk Size Considerations

The default chunk size is ~1000 characters with line-based splitting.
For custom chunking strategies:

- Implement a custom `FileIndexProvider` with your preferred chunking logic
- Smaller chunks (500-700): Better for precise keyword matching
- Larger chunks (1200-1500): Better for broader context understanding

### Performance Considerations

- **Batch Processing**: 10 parallel tasks for file indexing
- **Polling Interval**: 250ms for file change detection
- **Lazy Initialization**: Non-blocking startup with background processing
- **Memory Usage**: The ephemeral provider stores all indexed content in memory

### Query Optimization

- Use specific queries for better results
- The hybrid search combines multiple strategies, so natural language
  queries work well
- For keyword-heavy searches, increase `textWeight` parameter

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
├── StringSearchFileIndexService.ts   # Alternative service wrapper
├── EphemeralFileIndexProvider.ts     # In-memory provider implementation
├── commands.ts                       # Exports all chat commands
│   └── commands/
│       └── fileindex/
│           ├── search.ts             # /fileindex search command
│           └── provider/
│               ├── get.ts            # /fileindex provider get command
│               ├── set.ts            # /fileindex provider set command
│               ├── reset.ts          # /fileindex provider reset command
│               └── select.ts         # /fileindex provider select command
├── tools.ts                          # Exports all tools
│   └── tools/
│       ├── hybridSearchFileIndex.ts  # Hybrid search tool implementation
│       └── searchFileIndex.ts        # Semantic search tool (commented out)
├── state/
│   └── FileIndexState.ts             # Agent state slice for file index
├── util/
│   ├── ComputeChunkLineStarts.ts     # Compute line starts utility
│   ├── chunker.ts                    # Line-based chunking utility
│   └── sha256.ts                     # SHA256 hash utility
├── symbols/
│   └── symbolExtractor.ts            # Symbol extraction utility
└── vitest.config.ts                  # Test configuration
```

**Key Files:**

| File | Purpose |
|------|---------|
| `index.ts` | Main entry point exporting schemas and class types |
| `plugin.ts` | TokenRing plugin for installation |
| `schema.ts` | Zod schemas for service and agent configuration |
| `FileIndexProvider.ts` | Abstract base class for all providers |
| `FileIndexService.ts` | Main service managing providers |
| `EphemeralFileIndexProvider.ts` | In-memory provider implementation |
| `StringSearchFileIndexService.ts` | Alternative service wrapper |
| `commands.ts` | Aggregates all chat command definitions |
| `tools.ts` | Aggregates all tool definitions |
| `state/FileIndexState.ts` | Agent state management |

## Dependencies

### Runtime Dependencies

All Token Ring packages are workspace dependencies (version 0.2.0):

| Package | Version | Purpose |
|---------|---------|---------|
| `@tokenring-ai/app` | 0.2.0 | Base application framework |
| `@tokenring-ai/chat` | 0.2.0 | Chat and tool system |
| `@tokenring-ai/agent` | 0.2.0 | Agent orchestration |
| `@tokenring-ai/filesystem` | 0.2.0 | File system operations |
| `@tokenring-ai/utility` | 0.2.0 | Shared utility functions |
| `zod` | ^4.3.6 | Schema validation |
| `fs-extra` | ^11.3.4 | File system operations |
| `commander` | ^14.0.3 | Command-line interface |
| `glob-gitignore` | ^1.0.15 | Gitignore-style pattern matching |
| `gpt-tokenizer` | ^3.4.0 | Token counting for chunking |
| `mysql2` | ^3.20.0 | MySQL client (listed but unused) |
| `sentencex` | ^1.0.17 | Sentence segmentation (listed but unused) |
| `sqlite-vec` | 0.1.8-alpha.1 | Vector database (listed but unused) |
| `tree-sitter` | ^0.25.0 | Syntax parsing (listed but unused) |
| `tree-sitter-javascript` | ^0.25.0 | JavaScript grammar (listed but unused) |
| `chokidar` | ^5.0.0 | File watcher (listed but unused) |

**Note:** Several dependencies (mysql2, sentencex, sqlite-vec, tree-sitter,
tree-sitter-javascript, chokidar) are listed but not currently used in the
implementation. The `EphemeralFileIndexProvider` uses a simple polling
mechanism (setTimeout) for file change detection.

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

- **Memory Usage**: The ephemeral provider stores all indexed files in memory,
  which may be unsuitable for very large codebases (5000+ files)
- **Search Methods**: The default `search()` method delegates to
  `fullTextSearch()`, so both achieve similar results
- **Storage Backend**: Currently only ephemeral in-memory provider is implemented
- **File Types**: Focuses on text files. Binary files are silently skipped
- **Search Dimensions**: Currently provides full-text and hybrid scoring
- **Indexing Performance**: Large codebases may experience initial indexing lag
- **Chunk Size**: Fixed at ~1000 characters with simple line-based splitting
- **Result Merging**: Merge behavior is controlled by `mergeRadius` parameter
- **Provider Switching**: Provider selection is session-specific
- **Updates**: File modifications are only indexed after processing queue
  settles (250ms delay)

## Related Components

- **@tokenring-ai/agent**: Agent orchestration and state management
- **@tokenring-ai/chat**: Chat and tool system
- **@tokenring-ai/app**: Base application framework
- **@tokenring-ai/filesystem**: File system operations
- **@tokenring-ai/utility**: Shared utility functions
