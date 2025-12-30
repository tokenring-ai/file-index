import Agent from "@tokenring-ai/agent/Agent";
import FileIndexService from "../../../FileIndexService.ts";

export async function defaultProvider(remainder: string, agent: Agent): Promise<void> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const defaultProvider = fileIndexService.options.defaultProvider;
  agent.infoLine(`Default provider: ${defaultProvider}`);
}
