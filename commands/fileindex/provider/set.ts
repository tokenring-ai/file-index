import Agent from "@tokenring-ai/agent/Agent";
import FileIndexService from "../../../FileIndexService.ts";

export async function set(remainder: string, agent: Agent): Promise<void> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const providerName = remainder.trim();

  if (!providerName) {
    agent.errorMessage("Usage: /fileindex provider set <name>");
    return;
  }

  const availableProviders = fileIndexService.getAvailableFileIndexProviders();
  if (availableProviders.includes(providerName)) {
    fileIndexService.setActiveProvider(providerName, agent);
    agent.infoMessage(`Active provider set to: ${providerName}`);
  } else {
    agent.infoMessage(`Provider "${providerName}" not found. Available providers: ${availableProviders.join(", ")}`);
  }
}
