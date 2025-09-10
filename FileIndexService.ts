import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingService} from "@tokenring-ai/agent/types";
import KeyedRegistryWithSingleSelection from "@tokenring-ai/utility/KeyedRegistryWithSingleSelection";
import FileIndexProvider, {SearchResult} from "./FileIndexProvider.ts";

export default class FileIndexService implements TokenRingService {
  name = "FileIndexService";
  description = "Provides FileIndex functionality";

  private fileIndexProviderRegistry = new KeyedRegistryWithSingleSelection<FileIndexProvider>();

  registerFileIndexProvider = this.fileIndexProviderRegistry.register;
  getActiveFileIndexProviderName = this.fileIndexProviderRegistry.getActiveItemName;
  setActiveFileIndexProviderName = this.fileIndexProviderRegistry.setEnabledItem;
  getAvailableFileIndexProviders = this.fileIndexProviderRegistry.getAllItemNames;

  async fullTextSearch(query: string, limit: number = 10, agent: Agent): Promise<SearchResult[]> {
    return this.fileIndexProviderRegistry.getActiveItem().fullTextSearch(query, limit);
  }

  async search(query: string, limit: number = 10, agent: Agent): Promise<SearchResult[]> {
    return this.fileIndexProviderRegistry.getActiveItem().search(query, limit);
  }

  async waitReady(agent: Agent): Promise<void> {
    return this.fileIndexProviderRegistry.getActiveItem().waitReady();
  }

  setCurrentFile(filePath: string) {
    this.fileIndexProviderRegistry.getActiveItem().setCurrentFile(filePath);
  }

  clearCurrentFile() {
    this.fileIndexProviderRegistry.getActiveItem().clearCurrentFile();
  }

  getCurrentFile() {
    return this.fileIndexProviderRegistry.getActiveItem().getCurrentFile();
  }

  async close(): Promise<void> {
    return this.fileIndexProviderRegistry.getActiveItem().close();
  }
}
