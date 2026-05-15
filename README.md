# @tokenring-ai/file-index

File indexing and search service for TokenRing AI agents.

## Overview

The `@tokenring-ai/file-index` package provides file indexing and search capabilities for TokenRing AI agents. It enables agents to index project files and perform efficient searches across codebases using full-text matching with relevance scoring and intelligent result merging.

The package implements a provider architecture that allows for different storage backends, with an in-memory ephemeral provider currently available. It integrates seamlessly with TokenRing agents through tools, chat commands, and state management.

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

| Tool                                | Description                                           |
| ----------------------------------- | ----------------------------------------------------- |
| `file-index_hybridSearchFileIndex` | Hybrid search combining full-text and token overlap scoring |

## Configuration

### Plugin Configuration

```yaml
fileIndex:
  agentDefaults:
    provider: ephemeral
```

### Configuration Options

| Field                        | Type   | Default     | Description                      |
| ---------------------------- | ------ | ----------- | -------------------------------- |
| `agentDefaults.provider`     | string | `ephemeral` | Default provider name for agents |

## License

MIT License - see LICENSE file for details.

---

## Developer Reference

### Core Components

#### FileIndexService

The main service class that manages file indexing providers and provides search functionality.

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

**Attach Method**: Initializes agent state with `FileIndexState` using merged configuration.

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

**Features**:

- Stores file contents and chunks in memory
- Background polling for file changes (250ms interval)
- Batch processing with 10 parallel tasks
- Line-based chunking with 1000 character limit
- Relevance scoring based on match count and chunk length

**Key Methods**:

- `start()`: Begin lazy initialization
- `processFile(filePath)`: Read and chunk file content
- `fullTextSearch(query, limit)`: Case-insensitive search with scoring
- `onFileChanged(type, filePath)`: Queue files for reprocessing

### Service Implementation

#### FileIndexService (Service Class)

**Type**: `TokenRingService`

**Name**: `FileIndexService`

**Description**: Provides FileIndex functionality

**Configuration Schema**: `FileIndexServiceConfigSchema`

```typescript
const FileIndexServiceConfigSchema = z.object({
  agentDefaults: z.object({
    provider: z.string(),
  }).default({ provider: "ephemeral" }),
});
```

**State Management**: Uses `FileIndexState` for tracking active provider per agent.

### Schema Definitions

#### FileIndexAgentConfigSchema

```typescript
const FileIndexAgentConfigSchema = z.object({
  provider: z.string().exactOptional(),
}).default({});
```

**Fields**:

- `provider`: Optional provider name override for specific agents

#### FileIndexProviderConfigSchema

```typescript
const FileIndexProviderConfigSchema = z.object({
  type: z.enum(["ephemeral"]),
});
```

**Fields**:

- `type`: Provider type identifier (currently only "ephemeral" available)

### Tool Definitions

#### file-index_hybridSearchFileIndex

**Location**: `tools/hybridSearchFileIndex.ts`

**Description**: Hybrid semantic + full-text + token overlap search with merging and deduplication.

**Input Schema**:

```typescript
const inputSchema = z.object({
  query: z.string().describe("Text or code query"),
  topK: z.number().int().default(10).describe("Number of results (default 10)"),
  textWeight: z.number().default(0.3).describe("Token overlap weight (default 0.3)"),
  fullTextWeight: z.number().default(0.3).describe("Full-text weight (default 0.3)"),
  mergeRadius: z.number().int().default(1).describe("Merge radius for adjacent chunks (default 1)"),
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

**Behavior**: Resets active provider to configured default

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

Run tests with:

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
