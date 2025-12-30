import Agent from "@tokenring-ai/agent/Agent";
import FileIndexService from "../../FileIndexService.ts";

export async function search(remainder: string, agent: Agent): Promise<void> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);

  if (!remainder || !remainder.trim()) {
    agent.errorLine("Usage: /fileindex search <query>");
    return;
  }

  await fileIndexService.waitReady(agent);

  const limit = 10;
  const query = remainder.trim();

  agent.infoLine(`Searching for: "${query}"...`);

  const results = await fileIndexService.search(query, limit, agent);

  if (results.length === 0) {
    agent.infoLine("No results found.");
    return;
  }

  agent.infoLine(`Found ${results.length} result(s):`);

  for (const result of results) {
    agent.infoLine(`📄 ${result.path}:`);
    const content = result.content.trim();
    agent.chatOutput(content);
    agent.chatOutput("\n");
  }
}
