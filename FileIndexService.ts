import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingService } from "@tokenring-ai/app/types";
import deepMerge from "@tokenring-ai/utility/object/deepMerge";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import type { MaybePromise } from "bun";
import type { z } from "zod";

import type FileIndexProvider from "./FileIndexProvider.ts";
import type { SearchResult } from "./FileIndexProvider.ts";

import { FileIndexAgentConfigSchema, type FileIndexServiceConfigSchema } from "./schema.ts";
import { FileIndexState } from "./state/FileIndexState.ts";

export default class FileIndexService implements TokenRingService {
  readonly name = "FileIndexService";
  description = "Provides FileIndex functionality";

  private providers = new KeyedRegistry<FileIndexProvider>();

  registerFileIndexProvider = this.providers.set;
  getAvailableFileIndexProviders = this.providers.keysArray;

  constructor(readonly options: z.output<typeof FileIndexServiceConfigSchema>) {}

  attach(agent: Agent): void {
    const agentConfig = deepMerge(this.options.agentDefaults, agent.getAgentConfigSlice("fileIndex", FileIndexAgentConfigSchema));
    agent.initializeState(FileIndexState, agentConfig);
  }

  requireActiveProvider(agent: Agent): FileIndexProvider {
    const activeProvider = agent.getState(FileIndexState).activeProvider;
    if (!activeProvider) throw new Error("No file index provider has been enabled.");
    return this.providers.require(activeProvider);
  }

  setActiveProvider(name: string, agent: Agent): void {
    agent.mutateState(FileIndexState, state => {
      state.activeProvider = name;
    });
  }

  fullTextSearch(query: string, limit: number = 10, agent: Agent): MaybePromise<SearchResult[]> {
    return this.requireActiveProvider(agent).fullTextSearch(query, limit);
  }

  search(query: string, limit: number = 10, agent: Agent): MaybePromise<SearchResult[]> {
    return this.requireActiveProvider(agent).search(query, limit);
  }

  waitReady(agent: Agent): MaybePromise<void> {
    return this.requireActiveProvider(agent).waitReady();
  }

  close(agent: Agent): MaybePromise<void> {
    return this.requireActiveProvider(agent).close();
  }
}
