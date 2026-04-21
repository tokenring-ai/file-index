import type Agent from "@tokenring-ai/agent/Agent";
import type TokenRingApp from "@tokenring-ai/app";

import type { TokenRingService } from "@tokenring-ai/app/types";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";

export default class StringSearchFileIndexService implements TokenRingService {
  readonly name = "StringSearchFileIndexService";
  description = "Provides StringSearchFileIndex functionality";

  private provider: EphemeralFileIndexProvider;

  constructor(
    private app: TokenRingApp,
    private baseDirectory?: string,
  ) {
    this.provider = new EphemeralFileIndexProvider(baseDirectory);
  }

  async run() {
    await this.provider.start();
  }

  waitReady(agent: Agent) {
    if (agent) {
      agent.infoMessage(`[${this.name}] Waiting for index to finish initializing...`);
    }
    return this.provider.waitReady();
  }

  async fullTextSearch(query: string, limit: number = 10, agent: Agent) {
    await this.waitReady(agent);
    return this.provider.fullTextSearch(query, limit);
  }

  search(query: string, limit: number = 10, _agent: Agent) {
    return this.provider.search(query, limit);
  }

  close() {
    return this.provider.close();
  }
}
