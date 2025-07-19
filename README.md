```markdown
# @token-ring/file-index

This module, `@token-ring/file-index`, provides foundational services for file indexing and search within the Token Ring project. It offers an abstract base class crucial for developing different file indexing strategies and includes a simple, concrete implementation for basic in-memory keyword-based search.

It is designed to be part of a larger, more comprehensive file indexing system within the project. For advanced file indexing capabilities—such as semantic vector search using embeddings, code symbol extraction (e.g., with tree-sitter), and persistent database indexing (e.g., using SQLite-vec or other vector databases)—please refer to other relevant packages in the Token Ring monorepo, such as `[ADVANCED_INDEXER_PACKAGE_NAME_1]` and `[CODE_ANALYSIS_PACKAGE_NAME]` (please replace these placeholders with the actual package names).

## Core Components Exported by This Module

The primary exports of `@token-ring/file-index` are:

-   `FileIndexService`: An abstract base class for file indexing services.
-   `StringSearchFileIndexService`: A concrete implementation for basic keyword search.
-   `tools.hybridSearchFileIndex`: A tool function for combined search approaches.
-   `chatCommands`: A namespace containing chat commands (`search`, `foreachSearch`).

---

### 1. FileIndexService (Abstract Base Class)

`FileIndexService` serves as an abstract base class, defining a standard interface for services that provide file indexing and search functionalities. Concrete implementations of this class are responsible for the specific mechanisms of how files are indexed (e.g., chunking, embedding, storage) and how search operations are performed.

**Key Interface Methods (to be implemented or overridden by subclasses):**

-   `async search(query, limit = 10)`: Intended for similarity or semantic search. The exact nature of the search (keyword, semantic, etc.) depends on the subclass implementation.
-   `async fullTextSearch(query, limit = 10)`: Intended for keyword-based full-text search.
-   `async waitReady()`: A method that should resolve when the service has completed its initialization (e.g., initial scan of `baseDirectory`) and is ready to serve requests.
-   `onFileChanged(type, filePath)`: A handler for file system change events within the monitored directory.
-   Lifecycle methods such as `start(registry)`, `close()`, and internal processing methods like `processFile(filePath)` are also part of its structure and typically managed or overridden by subclasses.

---

### 2. StringSearchFileIndexService

`StringSearchFileIndexService` is a concrete implementation of `FileIndexService` provided by this module. It offers a straightforward, in-memory file indexing and keyword search capability.

**Features:**

-   **In-Memory Storage:** Reads specified files into memory and stores their content. The index is built in memory and is lost when the application process terminates.
-   **Keyword Search:** Implements both `search()` and `fullTextSearch()` methods using simple, case-insensitive string matching. It does **not** perform semantic analysis or vector-based similarity searches.
-   **File Watching:** Monitors a configured `baseDirectory` for file changes (creations, updates, deletions) and updates its in-memory index accordingly.
-   **Basic Chunking:** Splits file content into smaller text chunks to facilitate more granular search results.

**Limitations:**

-   No semantic understanding of content; search is purely keyword-based.
-   No code symbol extraction or awareness.
-   The index is not persistent across application restarts.
-   Best suited for smaller projects or scenarios where advanced semantic search is not critical.

**Configuration:**

`StringSearchFileIndexService` instances typically require a `baseDirectory` property to be configured, specifying the root directory of the files to be indexed.

```javascript
// Example: Registering and configuring StringSearchFileIndexService
import { StringSearchFileIndexService } from '@token-ring/file-index';
import { TokenRingRegistry } from '@token-ring/registry'; // Assuming you use a registry

const registry = new TokenRingRegistry();
const stringSearchService = new StringSearchFileIndexService();

// Configure the base directory for the files you want to index
stringSearchService.baseDirectory = "/path/to/your/project/src";

registry.register(stringSearchService);

// Start the service (which might include an initial scan of the baseDirectory)
// The exact start mechanism can depend on how Service classes are managed in your application.
// stringSearchService.start(registry); // Or similar initialization call
// await stringSearchService.waitReady(); // Ensure it's ready before use
```

---

### 3. Tools

This module exports tools designed for use by AI agents or through direct user invocation in a compatible environment.

#### `tools.hybridSearchFileIndex`

-   **Description:** This tool attempts to provide a "hybrid" search by combining results from both the `search()` and `fullTextSearch()` methods of a registered `FileIndexService`. It then processes these combined results, including merging adjacent or overlapping text blocks.
-   **Function Signature:** `async function hybridSearchFileIndex({ query, topK = 10, textWeight = 0.3, fullTextWeight = 0.3, mergeRadius = 1 }, registry)`
-   **Important Operational Note:** The true nature and effectiveness of `hybridSearchFileIndex` heavily depend on the capabilities of the `FileIndexService` implementation that is active in the `registry`.
    -   If used with `StringSearchFileIndexService` (from this package), both `search()` and `fullTextSearch()` will perform keyword-based matching. Consequently, the "hybrid" search will effectively be a re-ranked and merged keyword search, not a semantic-keyword hybrid.
    -   To achieve genuine semantic-keyword hybrid search, a more advanced `FileIndexService` implementation (e.g., from `[ADVANCED_INDEXER_PACKAGE_NAME_1]`) capable of actual semantic vector search must be registered and active.
-   **Parameters:**
    -   `query` (string): The search query.
    -   `topK` (int, default 10): Number of top merged results to return.
    -   `textWeight` (float, default 0.3): Weight for a token overlap score component.
    -   `fullTextWeight` (float, default 0.3): Weight for the full-text search score component.
    -   `mergeRadius` (int, default 1): Defines how close (in terms of chunk indices) hits must be to be merged into a single region.

---

### 4. Chat Commands

This module provides chat commands for interacting with a registered `FileIndexService` via a chat interface.

#### `chatCommands.search`

-   **Description:** `/search <query>`
-   **Functionality:** Searches for the given `<query>` text across files using the `search()` method of the currently active `FileIndexService`. It then displays matching file paths and content chunks.
-   **Behavior Note:** The type of search performed (keyword-based or potentially semantic) depends on the capabilities of the registered `FileIndexService` implementation. With `StringSearchFileIndexService`, this will be a keyword search.

#### `chatCommands.foreachSearch`

-   **Description:** `/foreachSearch <search-query> -- <command>`
-   **Functionality:** First, it searches for text matching `<search-query>` using the `search()` method of the active `FileIndexService`. Then, for each unique file found in the search results, it sets that file as a temporary context (via `fileIndexService.setCurrentFile()`) and executes the specified `<command>` (e.g., `/edit`, `/codeReview`) using the chat service's command execution mechanism.
-   **Behavior Note:** Similar to `/search`, the initial search phase's nature depends on the active `FileIndexService`.

---

## Dependencies

For the `StringSearchFileIndexService` provided in this package, key direct dependencies include:
-   `fs-extra`: Used for file system operations.
-   It also relies on foundational packages like `@token-ring/registry`.

The `package.json` for `@token-ring/file-index` also lists dependencies such as `tree-sitter`, `sqlite-vec`, and `chokidar`. These are **not directly utilized by `StringSearchFileIndexService`**. They are included to support the broader ecosystem of file indexing within the Token Ring project, particularly for advanced file indexing services provided by other packages (e.g., `[ADVANCED_INDEXER_PACKAGE_NAME_1]`, `[CODE_ANALYSIS_PACKAGE_NAME]`) which might build upon or interact with the abstract `FileIndexService` from this module.
```
