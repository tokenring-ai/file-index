import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../../../FileIndexService.ts";

async function execute(remainder: string, agent: Agent): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const providerName = remainder.trim();
  if (!providerName) throw new CommandFailedError("Usage: /fileindex provider set <name>");
  const available = fileIndexService.getAvailableFileIndexProviders();
  if (available.includes(providerName)) {
    fileIndexService.setActiveProvider(providerName, agent);
    return `Active provider set to: ${providerName}`;
  }
  return `Provider "${providerName}" not found. Available providers: ${available.join(", ")}`;
}

export default {
  name: "fileindex provider set", description: "Set the active provider", help: `# /fileindex provider set <name>

Set the active file index provider by name.

## Example

/fileindex provider set ephemeral`, execute } satisfies TokenRingAgentCommand;
