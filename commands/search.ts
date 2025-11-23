import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../FileIndexService.ts";

/**
 * /search <query> - Search for text across files in the project
 */

const description =
  "/search <query> - Search for text across files in the project.";

async function execute(remainder: string, agent: Agent) {
  const fileIndexService: FileIndexService | undefined =
    agent.requireServiceByType(FileIndexService);

  if (!remainder || !remainder.trim()) {
    agent.errorLine("Usage: /search <query>");
    return;
  }

  // Wait for the file index to be ready if it provides a waitReady method
  await fileIndexService.waitReady(agent);

  // Default limit to 10 results
  const limit = 10;
  const query = remainder.trim();

  agent.infoLine(`Searching for: "${query}"...`);

  // Use the search method from StringSearchFileIndexService
  const results = await fileIndexService.search(query, limit, agent);

  if (results.length === 0) {
    agent.infoLine("No results found.");
    return;
  }

  agent.infoLine(`Found ${results.length} result(s):`);

  // Display each result
  for (const result of results) {
    // Format the output to show the file path and the matching content
    agent.infoLine(`📄 ${result.path}:`);

    // Display the content with some context
    const content = result.content.trim();
    agent.chatOutput(content);
    agent.chatOutput("\n");
  }
}

// noinspection JSUnusedGlobalSymbols
export function help() {
  return ["/search <query> - Search for text across files in the project."];
}

export default {
  description,
  execute,
  help,
} as TokenRingAgentCommand
