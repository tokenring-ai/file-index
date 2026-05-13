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

| Command                          | Description                           |
|----------------------------------|---------------------------------------|
| `/fileindex search <query>`      | Search for text across indexed files  |
| `/fileindex provider get`        | Display the currently active provider |
| `/fileindex provider set <name>` | Set a specific provider by name       |
| `/fileindex provider reset`      | Reset to the default provider         |
| `/fileindex provider select`     | Interactively select a provider       |

## Tools

| Tool                    | Description                                         |
|-------------------------|-----------------------------------------------------|
| `hybridSearchFileIndex` | Hybrid search combining full-text and token overlap |

## Configuration

### Plugin Configuration

```yaml
fileIndex:
  agentDefaults:
    provider: ephemeral
```

## License

MIT License - see LICENSE file for details.
