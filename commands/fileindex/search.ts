import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../../FileIndexService.ts";

async function execute(remainder: string, agent: Agent): Promise<string> {
  if (!remainder?.trim()) throw new CommandFailedError("Usage: /fileindex search <query>");
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  await fileIndexService.waitReady(agent);
  const results = await fileIndexService.search(remainder.trim(), 10, agent);
  if (results.length === 0) return "No results found.";
  const lines = [`Found ${results.length} result(s):`];
  for (const result of results) {
    lines.push(`📄 ${result.path}:`, result.content.trim(), "");
  }
  return lines.join("\n");
}

export default { name: "fileindex search", description: "/fileindex search - Search across files", help: `# /fileindex search <query>

Search for text across all indexed files. Returns up to 10 matching results with file paths and content.

## Example

/fileindex search function getUser`, execute } satisfies TokenRingAgentCommand;
