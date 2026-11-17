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
- **Automatic Indexing**: Indexes the agent-allowed host paths, refreshed on search
- **File Change Detection**: Files written by agents are re-indexed on the next search

## Installation

```bash
bun add @tokenring-ai/file-index
```

## Chat Commands

| Command                          | Description                           |
| -------------------------------- | ------------------------------------- |
| `/fileindex search <query>`      | Search across files                   |
| `/fileindex provider get`        | Show active provider                  |
| `/fileindex provider set <name>` | Set the active provider               |
| `/fileindex provider select`     | Interactively select a provider       |
| `/fileindex provider reset`      | Reset to default provider             |

### `/fileindex search`

Search for text across all indexed files. Returns up to 10 matching results
with file paths and content. Waits for the index to be ready before searching.

**Input**:

- `query` (remainder, required): Search query text

### `/fileindex provider get`

Display the currently active file index provider. Returns the provider name or
`"none"` if no provider is active.

### `/fileindex provider set`

Set the active file index provider by name. Validates that the provider exists
in the registry before setting it.

**Input**:

- `providerName` (positional, required): The provider name to set

### `/fileindex provider select`

Interactively select the active file index provider. Presents a tree selection
UI with all available providers. Auto-selects if only one provider is
registered.

### `/fileindex provider reset`

Reset the active file index provider to the initial configured value.

## Tools

| Tool                               | Display Name                    | Description                                                                                                |
| ---------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `file-index_hybridSearchFileIndex` | FileIndex/hybridSearchFileIndex | Hybrid semantic+full-text+keyword search with merging/deduplication. Returns merged relevant code/text blocks. |

### Unexported Tools

The following tool implementation exists in the codebase but is not exported in
the main tools array (commented out in `tools.ts`):

| Tool                          | Display Name              | Description                                                                              |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `file-index_searchFileIndex`  | FileIndex/searchFileIndex | Semantic search for file/document code/text chunks using the MariaDB vector database.    |

### `file-index_hybridSearchFileIndex`

**Description**: Hybrid semantic+full-text+keyword search with merging/deduplication. Returns merged relevant code/text blocks.

**Schema strictness**: The input schema uses `z.object({...})` without `.strict()`.

| Parameter        | Type     | Default | Description                                                                  |
| ---------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `query`          | `string` | —       | Text or code query: keyword, full-text, and semantic matches are combined.  |
| `topK`           | `number` | `10`    | Number of top merged results to return (default 10)                          |
| `textWeight`     | `number` | `0.3`   | Weight (0-1) for token overlap score (default 0.3)                           |
| `fullTextWeight` | `number` | `0.3`   | Weight (0-1) for full-text search score (default 0.3)                        |
| `mergeRadius`    | `number` | `1`     | How close (in chunk indices) hits must be to merge into a single region (default: 1) |

**Algorithm**:

1. Fetches results from both `search()` and `fullTextSearch()` (each limited to `topK * 4`)
2. Computes token overlap score (BM25-like) for each result
3. Normalizes scores and computes weighted hybrid score:
   `(1 - textWeight - fullTextWeight) * embScore + textWeight * textScore + fullTextWeight * normalizedFullText`
4. Groups results by file and merges adjacent chunks within `mergeRadius`
5. Returns top-k merged blocks with highest hybrid scores

**Result Format**:

The `result` field contains a JSON string with an array of merged result
blocks. The `message` field is formatted as
`` `**File Index** Found <count> hits for search <query>` ``.

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

| Property      | Type     | Description                             |
| ------------- | -------- | --------------------------------------- |
| `path`        | `string` | Absolute file path                      |
| `start`       | `number` | Starting chunk index                    |
| `end`         | `number` | Ending chunk index                      |
| `hybridScore` | `number` | Combined relevance score (0-1)          |
| `content`     | `string` | Concatenated content from merged chunks |

**Note**: When using the `EphemeralFileIndexProvider`, the `search()` method
delegates to `fullTextSearch()`, so the embedding similarity component will
always be zero. The hybrid scoring effectively becomes a combination of
full-text and token overlap scores.

### `file-index_searchFileIndex` (Unexported)

**Description**: Semantic search for file/document code/text chunks using the MariaDB vector database.

**Schema strictness**: The input schema uses `z.object({...})` without `.strict()`.

| Parameter | Type     | Default | Description                                                                        |
| --------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `query`   | `string` | —       | Freeform string query (code, question, natural language, etc) to search for similar file chunks. |
| `k`       | `number` | `5`     | Number of top results to return (default 5)                                        |

**Throws** `ToolCallError` if the `query` parameter is missing.

**Result Format**:

The `result` field contains a JSON string with an array of result objects. The
`message` field is formatted as
`` `**File Index** Found <count> matches for <query>` ``.

```json
[
  {
    "path": "/absolute/path/to/file.ts",
    "chunk_index": 0,
    "content": "chunk content",
    "score": 0.85
  }
]
```

| Property       | Type     | Description                                    |
| -------------- | -------- | ---------------------------------------------- |
| `path`         | `string` | Absolute file path                             |
| `chunk_index`  | `number` | Chunk index within the file                    |
| `content`      | `string` | Chunk content                                  |
| `score`        | `number` | Similarity score (0-1, clamped from distance)  |

This tool is not exported in `tools.ts` and is not available to agents by
default. The tool description references "MariaDB vector database" but the
actual implementation delegates to `fileIndex.search()`. When using the
`EphemeralFileIndexProvider`, this performs full-text search rather than
semantic search.

## Configuration

```yaml
fileIndex:
  agentDefaults:
    provider: ephemeral
```

| Field                    | Type     | Required | Default                  | Description                                        |
| ------------------------ | -------- | -------- | ------------------------ | -------------------------------------------------- |
| `agentDefaults`          | `object` | No       | `{ provider: "ephemeral" }` | Agent default configuration                        |
| `agentDefaults.provider` | `string` | No       | `ephemeral`              | File index provider new agents use by default      |

Agents may override the default provider via their own `fileIndex` agent config
slice using `FileIndexAgentConfigSchema`, which accepts an optional `provider`
field.

### Exported Schemas

The package index (`index.ts`) directly exports:

| Schema                      | Description                                                            |
| --------------------------- | --------------------------------------------------------------------- |
| `FileIndexConfigSchema`     | Legacy schema (`{ defaultProvider: string }`); does not match the service config schema |
| `FileIndexAgentConfigSchema`| Per-agent configuration override                                       |

The `schema.ts` module (importable via `@tokenring-ai/file-index/schema`)
defines:

| Schema                        | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `FileIndexServiceConfigSchema` | Plugin-level configuration                              |
| `FileIndexAgentConfigSchema`   | Per-agent configuration override (re-exported from `index.ts`) |
| `FileIndexProviderConfigSchema` | Provider type identifier (`type: "ephemeral"`)          |

### Schema Metadata

The `FileIndexServiceConfigSchema` includes `.meta()` annotations for
configuration UI integration:

- **Top-level**: label `"File Index"`, description `"Fast file lookup/search index for agents"`
- **`agentDefaults`**: label `"Agent Defaults"`
- **`provider`**: description `"File index provider new agents use by default"`

## Core Components

### FileIndexService

The main service class that manages file indexing providers and provides search
functionality. Implements the `TokenRingService` interface.

**Location**: `FileIndexService.ts`

| Method | Description |
| ------ | ----------- |
| `constructor(options?: FileIndexServiceConfig)` | Create the service with optional initial configuration |
| `reconfigure(options: FileIndexServiceConfig): void` | Update the service configuration at runtime |
| `registerFileIndexProvider(name: string, provider: FileIndexProvider): void` | Register a new file index provider (alias for `KeyedRegistry.set`) |
| `getAvailableFileIndexProviders(): string[]` | Get list of registered provider names (alias for `KeyedRegistry.keysArray`) |
| `attach(agent: Agent): void` | Initialize `FileIndexState` on the agent from `agentDefaults` merged with the agent's `fileIndex` config slice |
| `requireActiveProvider(agent: Agent): FileIndexProvider` | Get the active provider for the agent or throw `ConfigurationError` |
| `setActiveProvider(name: string, agent: Agent): void` | Set the active provider for the agent |
| `fullTextSearch(query: string, limit: number = 10, agent: Agent): MaybePromise<SearchResult[]>` | Perform full-text search via the active provider |
| `search(query: string, limit: number = 10, agent: Agent): MaybePromise<SearchResult[]>` | Perform search via the active provider (delegates to provider) |
| `waitReady(agent: Agent): MaybePromise<void>` | Wait for the active provider to finish initialization |
| `close(agent: Agent): MaybePromise<void>` | Close the active provider and clean up resources |

### FileIndexProvider

Abstract base class for file index providers.

**Location**: `FileIndexProvider.ts`

| Method | Description |
| ------ | ----------- |
| `abstract search(query: string, limit?: number): MaybePromise<SearchResult[]>` | Search for content |
| `abstract fullTextSearch(query: string, limit?: number): MaybePromise<SearchResult[]>` | Perform full-text search |
| `abstract waitReady(): MaybePromise<void>` | Wait for provider initialization |
| `abstract processFile(filePath: string): MaybePromise<void>` | Process and index a file |
| `abstract onFileChanged(type: string, filePath: string): void` | Handle file change events |
| `abstract close(): MaybePromise<void>` | Clean up provider resources |
| `abstract setCurrentFile(filePath: string): void` | Set current file context |
| `abstract clearCurrentFile(): void` | Clear current file context |
| `abstract getCurrentFile(): string \| null` | Get current file path |

**SearchResult Interface**:

```typescript
interface SearchResult {
  path: string;
  chunk_index: number;
  content: string;
  relevance?: number | undefined;
  distance?: number | undefined;
}
```

### EphemeralFileIndexProvider

In-memory file index provider. Extends `FileIndexProvider`. It indexes the host
files the agent may read (the filesystem's allowed paths, honoring `.gitignore`
and `.aiignore` like `@` file search) without any setup by the caller.

**Location**: `EphemeralFileIndexProvider.ts`

```typescript
constructor(private readonly app: TokenRingApp)
```

**Indexing**:

- The index is refreshed when a search runs, at most every 15 seconds. Only
  files whose modification time changed are read again.
- Files reported as written through `FileSystemService.onFileWritten` are
  re-read on the next search.
- Files over 1 MB and binary files (a NUL byte in the first 8 KB) are skipped.
- At most 20,000 files are indexed.
- Line-based chunking with a 1000 character limit.
- The `search()` method delegates to `fullTextSearch()`, so no embedding or
  semantic search is performed.

| Method | Description |
| ------ | ----------- |
| `waitReady(): Promise<void>` | Bring the index up to date (shared by concurrent callers) |
| `processFile(filePath: string): Promise<void>` | Read and chunk one file; removes it from the index if it is missing, too large or binary |
| `onFileChanged(type: string, filePath: string): void` | Mark a file to be re-read on the next search; deletes on `"unlink"` events |
| `fullTextSearch(query: string, limit: number = 10): Promise<SearchResult[]>` | Case-insensitive search; ranks all matches before applying `limit` |
| `search(query: string, limit: number = 10): Promise<SearchResult[]>` | Delegates to `fullTextSearch()` |
| `setCurrentFile(filePath: string): void` | Set the current file context |
| `clearCurrentFile(): void` | Clear the current file context |
| `getCurrentFile(): string \| null` | Get the current file path |
| `close(): void` | Stop listening for writes and clear the index |

**Relevance Scoring**:

The `fullTextSearch` method scores results using the formula:

```text
relevance = count * (1 + 1 / chunk.length)
```

Where `count` is the number of times the query appears in the chunk. Shorter
chunks with matches receive higher scores, rewarding precise matches over
matches in large blocks of text.

### FileIndexState

Agent state slice that tracks the active file index provider per agent. Extends
`AgentStateSlice`.

**Location**: `state/FileIndexState.ts`

| Property         | Type             | Description                                |
| ---------------- | ---------------- | ------------------------------------------ |
| `activeProvider` | `string \| null` | Current active provider name               |
| `initialConfig`  | `{ provider: string }` | The agent-defaults config from attach time (readonly) |

| Method | Description |
| ------ | ----------- |
| `constructor(initialConfig: FileIndexServiceConfig["agentDefaults"])` | Initialize state with `activeProvider` from config |
| `transferStateFromParent(parent: Agent): void` | Inherit `activeProvider` from parent agent |
| `reset(): void` | Reset `activeProvider` to the initial configured value |
| `serialize(): { activeProvider: string \| null }` | Serialize state for persistence |
| `deserialize(data: { activeProvider: string \| null }): void` | Restore state from serialized data |
| `show(): string` | Return `Active FileIndex Provider: <activeProvider>` |

## Services

`FileIndexService` implements the `TokenRingService` interface.

### Service Registration

```typescript
import TokenRingApp from "@tokenring-ai/app";
import PluginManager from "@tokenring-ai/app/PluginManager";
import fileIndexPlugin from "@tokenring-ai/file-index/plugin";

const app = new TokenRingApp({ app: { workingDirectory, workspaceDirectory, configDirectories } });
const pluginManager = app.addService(new PluginManager(app));
await pluginManager.installPlugins([fileIndexPlugin]);
```

### Plugin Lifecycle

The plugin defines no agent lifecycle hooks. Plugin-level lifecycle is managed
through `install` and `reconfigure`.

| Property        | Value                                              |
| --------------- | -------------------------------------------------- |
| Name            | `@tokenring-ai/file-index`                         |
| Display Name    | `File Indexing`                                    |
| Version         | `0.2.0`                                            |
| Description     | `File indexing and search service for TokenRing AI agents.` |
| Config Schema   | `z.object({ fileIndex: FileIndexServiceConfigSchema })` |

**`install(app)`**:

1. Adds `FileIndexService` via `app.addService(new FileIndexService())`
2. Registers the `EphemeralFileIndexProvider` under the name `"ephemeral"`
3. Waits for `ChatService` and adds the tools array
4. Waits for `AgentCommandService` and adds the agent commands array

**`reconfigure(app, config)`**:

Calls `app.requireService(FileIndexService).reconfigure(config.fileIndex)` to
update the service configuration at runtime.

## Dependencies

| Package                 | Purpose                           |
| ----------------------- | --------------------------------- |
| `@tokenring-ai/app`     | Base application framework        |
| `@tokenring-ai/agent`   | Agent system integration          |
| `@tokenring-ai/chat`    | Chat and tools integration        |
| `@tokenring-ai/utility` | Utility functions                 |
| `zod`                   | Schema validation                 |
| `@tokenring-ai/filesystem` | Host file access and allowed paths |

## Testing

The package includes a test configuration in `bun.config.ts` but currently has
no test files.

```bash
bun test
# or
bun test --watch
```

## License

MIT License — see LICENSE file for details.
