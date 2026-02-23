import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import FileIndexService from "../../FileIndexService.ts";

export async function search(remainder: string, agent: Agent): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);

  if (!remainder || !remainder.trim()) {
    throw new CommandFailedError("Usage: /fileindex search <query>");
  }

  await fileIndexService.waitReady(agent);

  const limit = 10;
  const query = remainder.trim();

  const results = await fileIndexService.search(query, limit, agent);

  if (results.length === 0) {
    return "No results found.";
  }

  const lines: string[] = [`Found ${results.length} result(s):`];

  for (const result of results) {
    lines.push(`📄 ${result.path}:`);
    const content = result.content.trim();
    lines.push(content);
    lines.push("");
  }

  return lines.join("\n");
}
