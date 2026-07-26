# @tokenring-ai/file-index

File indexing and search service for TokenRing AI agents.

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search
capabilities for TokenRing AI agents. It enables agents to index project files
and perform efficient searches across codebases using full-text matching with
relevance scoring and intelligent result merging.

The package implements a provider architecture that allows for different storage
backends, with an in-memory ephemeral provider currently available. It
integrates seamlessly with TokenRing agents through tools, chat commands, and
state management.

### Key Features

- **Full-Text Search**: Case-insensitive string matching with relevance scoring
- **Line-Based Chunking**: Line-based chunking with ~1000 character limit
- **Provider Architecture**: Extensible system for different storage backends
- **Agent Integration**: Integration with TokenRing AI agents through tools
- **Result Merging**: Merges adjacent/nearby chunks for better context coverage
- **Chat Commands**: Command interface for managing providers and searches
- **State Management**: Agent-specific state persistence for active provider
- **Lazy Initialization**: Non-blocking initialization with background processing
- **File Change Detection**: Handles file changes via polling (250ms interval)

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

| Command                          | Description                           |
| -------------------------------- | ------------------------------------- |
| `/fileindex search <query>`      | Search for text across indexed files  |
| `/fileindex provider get`        | Display the currently active provider |
| `/fileindex provider set <name>` | Set a specific provider by name       |
| `/fileindex provider reset`      | Reset to the default provider         |
| `/fileindex provider select`     | Interactively select a provider       |

## Tools

| Tool                                | Display Name                        | Description                                                        |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `file-index_hybridSearchFileIndex`  | FileIndex/hybridSearchFileIndex     | Hybrid search combining full-text and token overlap scoring        |

### Unexported Tools

The following tool implementation exists in the codebase but is not exported in
the main tools array:

| Tool                            | Display Name                  | Description                                                    |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `file-index_searchFileIndex`    | FileIndex/searchFileIndex     | Semantic search for file/document code/text chunks             |

## Configuration

### Plugin Configuration

```yaml
fileIndex:
  agentDefaults:
    provider: ephemeral
```

### Configuration Options

| Field                        | Type   | Default     | Description                                    |
| ---------------------------- | ------ | ----------- | ---------------------------------------------- |
| `agentDefaults.provider`     | string | `ephemeral` | Default file index provider new agents use     |

## License

MIT License - see LICENSE file for details.

---

## Developer Reference

### Core Components

#### FileIndexService

The main service class that manages file indexing providers and provides search
functionality.

**Location**: `FileIndexService.ts`

**Key Methods**:

- `registerFileIndexProvider(name, provider)`: Register a new file index provider
- `getAvailableFileIndexProviders()`: Get list of registered provider names
- `fullTextSearch(query, limit, agent)`: Perform full-text search
- `search(query, limit, agent)`: Perform search (delegates to provider)
- `setActiveProvider(name, agent)`: Set the active provider for an agent
- `requireActiveProvider(agent)`: Get the active provider or throw error
- `waitReady(agent)`: Wait for the active provider to be ready
- `close(agent)`: Close the active provider

**Attach Method**: Initializes agent state with `FileIndexState` using merged
configuration.

#### FileIndexProvider

Abstract base class for file index providers.

**Location**: `FileIndexProvider.ts`

**Abstract Methods**:

- `search(query, limit)`: Search for content
- `fullTextSearch(query, limit)`: Perform full-text search
- `waitReady()`: Wait for provider initialization
- `processFile(filePath)`: Process and index a file
- `onFileChanged(type, filePath)`: Handle file change events
- `close()`: Clean up provider resources
- `setCurrentFile(filePath)`: Set current file context
- `clearCurrentFile()`: Clear current file context
- `getCurrentFile()`: Get current file path

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

#### EphemeralFileIndexProvider

In-memory file index provider with lazy initialization.

**Location**: `EphemeralFileIndexProvider.ts`

**Constructor**:

```typescript
constructor(baseDirectory?: string)
```

- `baseDirectory`: Base directory for file resolution (defaults to `process.cwd()`)

**Features**:

- Stores file contents and chunks in memory
- Background polling for file changes (250ms interval)
- Batch processing with 10 parallel tasks
- Line-based chunking with 1000 character limit
- Relevance scoring based on match count and chunk length
- Note: The `search()` method delegates to `fullTextSearch()`, so no embedding
  or semantic search is performed

**Key Methods**:

- `start()`: Begin lazy initialization
- `processFile(filePath)`: Read and chunk file content
- `fullTextSearch(query, limit)`: Case-insensitive search with scoring
- `onFileChanged(type, filePath)`: Queue files for reprocessing

**Relevance Scoring**:

The `fullTextSearch` method scores results using the formula:

```text
relevance = count * (1 + 1 / chunk.length)
```

Where `count` is the number of times the query appears in the chunk. Shorter
chunks with matches receive higher scores, rewarding precise matches over
matches in large blocks of text.

**Note on Provider Initialization**:

The plugin registers the `EphemeralFileIndexProvider` but does not call
`start()` on it. The provider is lazy-initialized when needed. The
`StringSearchFileIndexService` is the component that explicitly calls `start()`
in its `run()` method.

#### StringSearchFileIndexService

Alternative service implementation that wraps `EphemeralFileIndexProvider`. Not
used by the default plugin installation.

**Location**: `StringSearchFileIndexService.ts`

**Note**: This service is not exported from the package index and is not
registered by the plugin. It may be used for standalone string-based search
scenarios.

### Service Implementation

#### FileIndexService (TokenRingService)

**Type**: `TokenRingService`

**Name**: `FileIndexService`

**Description**: Provides FileIndex functionality

**Configuration Schema**: `FileIndexServiceConfigSchema`

```typescript
const FileIndexServiceConfigSchema = z.object({
  agentDefaults: z.object({
    provider: z.string().meta({
      description: "File index provider new agents use by default",
    }),
  }).default({ provider: "ephemeral" }),
});
```

**State Management**: Uses `FileIndexState` for tracking active provider per
agent.

### Schema Definitions

#### FileIndexServiceConfigSchema

**Location**: `schema.ts`

**Fields**:

- `agentDefaults.provider`: Default provider name for new agents (default:
  `"ephemeral"`)

#### FileIndexAgentConfigSchema

**Location**: `schema.ts`

```typescript
const FileIndexAgentConfigSchema = z.object({
  provider: z.string().exactOptional(),
}).default({});
```

**Fields**:

- `provider`: Optional provider name override for specific agents

#### FileIndexProviderConfigSchema

**Location**: `schema.ts`

```typescript
const FileIndexProviderConfigSchema = z.object({
  type: z.enum(["ephemeral"]),
});
```

**Fields**:

- `type`: Provider type identifier (currently only `"ephemeral"` available)

#### FileIndexConfigSchema

**Location**: `index.ts`

```typescript
const FileIndexConfigSchema = z.object({
  defaultProvider: z.string(),
});
```

**Note**: This schema is exported from the package index but does not match the
`FileIndexServiceConfigSchema` used by the service. It may be legacy or
intended for future use.

### Tool Definitions

#### file-index_hybridSearchFileIndex

**Location**: `tools/hybridSearchFileIndex.ts`

**Display Name**: `FileIndex/hybridSearchFileIndex`

**Description**: Hybrid semantic+full-text+keyword search with merging and
deduplication. Returns merged relevant code/text blocks.

**Input Schema**:

```typescript
const inputSchema = z.object({
  query: z.string().describe(
    "Text or code query: keyword, full-text, and semantic matches are combined.",
  ),
  topK: z.number().int().default(10).describe(
    "Number of top merged results to return (default 10)",
  ),
  textWeight: z.number().default(0.3).describe(
    "Weight (0-1) for token overlap score (default 0.3)",
  ),
  fullTextWeight: z.number().default(0.3).describe(
    "Weight (0-1) for full-text search score (default 0.3)",
  ),
  mergeRadius: z.number().int().default(1).describe(
    "How close (in chunk indices) hits must be to merge into a single region (default: 1)",
  ),
});
```

**Features**:

- Combines embedding similarity, full-text search, and token overlap (BM25-like)
- Normalizes and scores results from multiple search methods
- Merges adjacent/nearby chunks per file for better context
- Returns top-k merged result blocks sorted by hybrid score

**Algorithm**:

1. Fetches results from both `search()` and `fullTextSearch()`
2. Computes token overlap score (BM25-like) for each result
3. Normalizes scores and computes weighted hybrid score
4. Groups results by file and merges adjacent chunks
5. Returns top-k merged blocks with highest hybrid scores

**Result Format**:

The `result` field contains a JSON string with an array of merged result
blocks:

```json
[
  {
    "path": "/absolute/path/to/file.ts",
    "start": 0,
    "end": 3,
    "hybridScore": 0.85,
    "content": "merged content from adjacent chunks"
  }
]
```

| Property        | Type   | Description                                    |
| --------------- | ------ | ---------------------------------------------- |
| `path`          | string | Absolute file path                             |
| `start`         | number | Starting chunk index                           |
| `end`           | number | Ending chunk index                             |
| `hybridScore`   | number | Combined relevance score (0-1)                 |
| `content`       | string | Concatenated content from merged chunks        |

**Note**: When using the `EphemeralFileIndexProvider`, the `search()` method
delegates to `fullTextSearch()`, so the embedding similarity component will
always be zero. The hybrid scoring effectively becomes a combination of full-text
and token overlap scores.

#### file-index_searchFileIndex (Unexported)

**Location**: `tools/searchFileIndex.ts`

**Display Name**: `FileIndex/searchFileIndex`

**Description**: Semantic search for file/document code/text chunks using the
MariaDB vector database.

**Input Schema**:

```typescript
const inputSchema = z.object({
  query: z.string().describe(
    "Freeform string query (code, question, natural language, etc) to search for similar file chunks.",
  ),
  k: z.number().int().default(5).describe(
    "Number of top results to return (default 5)",
  ),
});
```

**Note**: This tool is not exported in `tools.ts` and is not available to agents
by default. The tool description references "MariaDB vector database" but the
actual implementation delegates to `fileIndex.search()`. When using the
`EphemeralFileIndexProvider`, this performs full-text search rather than
semantic search.

### State Management

#### FileIndexState

**Location**: `state/FileIndexState.ts`

**Purpose**: Tracks the active file index provider for each agent.

**Fields**:

- `activeProvider`: Current active provider name (string | null)

**Methods**:

- `transferStateFromParent(parent)`: Inherit state from parent agent
- `reset()`: Reset to initial configuration
- `serialize()`: Serialize state for persistence
- `deserialize(data)`: Restore state from serialized data
- `show()`: Display current state as string

### Command Definitions

#### fileindex search

**Location**: `commands/fileindex/search.ts`

**Description**: Search across files

**Usage**: `/fileindex search <query>`

**Input**:

- `query` (remainder, required): Search query text

**Behavior**:

- Waits for index to be ready
- Performs search with limit of 10 results
- Returns formatted results with file paths and content

#### fileindex provider get

**Location**: `commands/fileindex/provider/get.ts`

**Description**: Show active provider

**Usage**: `/fileindex provider get`

**Behavior**: Returns current active provider name or "none"

#### fileindex provider set

**Location**: `commands/fileindex/provider/set.ts`

**Description**: Set the active provider

**Usage**: `/fileindex provider set <providerName>`

**Input**:

- `providerName` (positional, required): The provider name to set

**Behavior**:

- Validates provider exists in registry
- Sets active provider for agent
- Returns success or error message

#### fileindex provider select

**Location**: `commands/fileindex/provider/select.ts`

**Description**: Interactively select a provider

**Usage**: `/fileindex provider select`

**Behavior**:

- Shows tree selection UI with available providers
- Auto-selects if only one provider available
- Updates active provider on selection

#### fileindex provider reset

**Location**: `commands/fileindex/provider/reset.ts`

**Description**: Reset to default provider

**Usage**: `/fileindex provider reset`

**Behavior**: Resets active provider to the reset configured value

### Usage Examples

#### Registering a Custom Provider

```typescript
import FileIndexService from "@tokenring-ai/file-index/FileIndexService";
import MyCustomProvider from "./MyCustomProvider";

const service = new FileIndexService({ agentDefaults: { provider: "myProvider" } });
service.registerFileIndexProvider("myProvider", new MyCustomProvider());
```

#### Using the Hybrid Search Tool

```typescript
// Via agent tool call
const result = await agent.executeTool("file-index_hybridSearchFileIndex", {
  query: "authentication middleware",
  topK: 5,
  textWeight: 0.4,
  fullTextWeight: 0.3,
  mergeRadius: 2,
});
```

#### Chat Command Usage

```bash
/fileindex search "async function"
/fileindex provider get
/fileindex provider set ephemeral
/fileindex provider select
/fileindex provider reset
```

### Testing

The package includes a test configuration in `bun.config.ts` but currently has
no test files.

```bash
bun test
# or
bun test:watch
```

### Dependencies

- `@tokenring-ai/app`: Base application framework
- `@tokenring-ai/agent`: Agent system integration
- `@tokenring-ai/chat`: Chat and tools integration
- `@tokenring-ai/utility`: Utility functions
- `zod`: Schema validation
- `fs-extra`: File system operations

### Related Components

- `@tokenring-ai/agent`: Core agent system
- `@tokenring-ai/chat`: Chat and tools framework
- `@tokenring-ai/research`: Research package (uses file-index for code search)
