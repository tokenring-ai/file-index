import TokenRingApp from "@tokenring-ai/app";
import Agent from "@tokenring-ai/agent/Agent";

import {TokenRingService} from "@tokenring-ai/app/types";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";

export default class StringSearchFileIndexService implements TokenRingService {
  name = "StringSearchFileIndexService";
  description = "Provides StringSearchFileIndex functionality";

  private provider: EphemeralFileIndexProvider;
  private app!: TokenRingApp;

  constructor(app: TokenRingApp, baseDirectory?: string) {
    this.app = app;
    this.provider = new EphemeralFileIndexProvider(baseDirectory);
  }

  async run() {
    await this.provider.start();
  }

  onFileChanged(type: string, filePath: string) {
    this.provider.onFileChanged(type, filePath);
  }

  async waitReady(agent: Agent) {
    if (agent) {
      agent.infoLine(`[${this.name}] Waiting for index to finish initializing...`);
    }
    return this.provider.waitReady();
  }

  async processFile(filePath: string) {
    return this.provider.processFile(filePath);
  }

  async fullTextSearch(query: string, limit: number = 10, agent: Agent) {
    await this.waitReady(agent);
    return this.provider.fullTextSearch(query, limit);
  }

  async search(query: string, limit: number = 10, _agent: Agent) {
    return this.provider.search(query, limit);
  }

  setCurrentFile(filePath: string) {
    this.provider.setCurrentFile(filePath);
  }

  clearCurrentFile() {
    this.provider.clearCurrentFile();
  }

  getCurrentFile() {
    return this.provider.getCurrentFile();
  }

  async close() {
    return this.provider.close();
  }
}
