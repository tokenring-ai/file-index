import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import FileIndexService from "../../../FileIndexService.ts";

export async function set(remainder: string, agent: Agent): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const providerName = remainder.trim();

  if (!providerName) {
    throw new CommandFailedError("Usage: /fileindex provider set <name>");
  }

  const availableProviders = fileIndexService.getAvailableFileIndexProviders();
  if (availableProviders.includes(providerName)) {
    fileIndexService.setActiveProvider(providerName, agent);
    return `Active provider set to: ${providerName}`;
  } else {
    return `Provider "${providerName}" not found. Available providers: ${availableProviders.join(", ")}`;
  }
}
