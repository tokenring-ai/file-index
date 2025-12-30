import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingService} from "@tokenring-ai/app/types";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import {z} from "zod";
import FileIndexProvider, {SearchResult} from "./FileIndexProvider.ts";
import {FileIndexAgentConfigSchema, FileIndexConfigSchema} from "./schema.ts";
import {FileIndexState} from "./state/FileIndexState.ts";

export default class FileIndexService implements TokenRingService {
  name = "FileIndexService";
  description = "Provides FileIndex functionality";

  private providers = new KeyedRegistry<FileIndexProvider>();

  registerFileIndexProvider = this.providers.register;
  getAvailableFileIndexProviders = this.providers.getAllItemNames;

  constructor(readonly options: z.output<typeof FileIndexConfigSchema>) {}

  async attach(agent: Agent): Promise<void> {
    const agentConfig = agent.getAgentConfigSlice('fileIndex', FileIndexAgentConfigSchema);
    agent.initializeState(FileIndexState, agentConfig);
  }

  requireActiveProvider(agent: Agent): FileIndexProvider {
    const activeProvider = agent.getState(FileIndexState).activeProvider ?? this.options.defaultProvider;
    return this.providers.requireItemByName(activeProvider);
  }

  setActiveProvider(name: string, agent: Agent): void {
    agent.mutateState(FileIndexState, (state) => {
      state.activeProvider = name;
    });
  }

  async fullTextSearch(query: string, limit: number = 10, agent: Agent): Promise<SearchResult[]> {
    return this.requireActiveProvider(agent).fullTextSearch(query, limit);
  }

  async search(query: string, limit: number = 10, agent: Agent): Promise<SearchResult[]> {
    return this.requireActiveProvider(agent).search(query, limit);
  }

  async waitReady(agent: Agent): Promise<void> {
    return this.requireActiveProvider(agent).waitReady();
  }

  setCurrentFile(filePath: string, agent: Agent) {
    this.requireActiveProvider(agent).setCurrentFile(filePath);
  }

  clearCurrentFile(agent: Agent) {
    this.requireActiveProvider(agent).clearCurrentFile();
  }

  getCurrentFile(agent: Agent) {
    return this.requireActiveProvider(agent).getCurrentFile();
  }

  async close(agent: Agent): Promise<void> {
    return this.requireActiveProvider(agent).close();
  }
}
