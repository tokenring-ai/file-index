import Agent from "@tokenring-ai/agent/Agent";
import FileIndexService from "../FileIndexService.ts";

/**
 * /foreachSearch <query> -- <command> - Run a command for each file matching the search query
 */

export const description =
  "/foreachSearch <search-query> -- <command> - Search for text across files and run a command for each matching file";

export async function execute(remainder: string, agent: Agent) {
  const fileIndexService = agent.requireFirstServiceByType(FileIndexService);

  // Check if we have a valid remainder
  if (!remainder || !remainder.trim()) {
    for (const line of help()) {
      agent.infoLine(line);
    }
    return;
  }

  // Split the remainder into query and command parts
  const parts = remainder.split(/\s+--\s+/);
  if (parts.length < 2) {
    agent.errorLine(
      "Missing '--' separator between search query and command",
    );
    for (const line of help()) {
      agent.infoLine(line);
    }
    return;
  }

  const query = parts[0].trim();
  const command = parts.slice(1).join(" -- ").trim();

  if (!fileIndexService) {
    agent.errorLine(
      "FileIndexService not found. Please add it to your context configuration.",
    );
    return;
  }


  // Wait for the file index to be ready
  await fileIndexService.waitReady(agent);

  agent.infoLine(
    `Searching for: "${query}" and running command: "${command}" on each file...`,
  );

  // Get search results
  const results = await fileIndexService.search(query, undefined, agent);

  if (results.length === 0) {
    agent.infoLine("No results found.");
    return;
  }

  agent.infoLine(
    `Found ${results.length} result(s). Processing each file...`,
  );

  // Process each result
  for (const result of results) {
    const relativePath = (result.path as string)
      .replace(fileIndexService.baseDirectory, "")
      .replace(/^[/\\]/, "");

    agent.infoLine(`\nProcessing file: ${relativePath}`);

    // Set the current file context
    fileIndexService.setCurrentFile(relativePath);

    // Run the command using the shared runCommand helper
    const match = command.match(/^\/?(\S+)(?:\s+(.*))?$/);
    const commandName = match?.[1] ?? "help";
    const remainder = match?.[2] ?? "";
    await agent.runCommand(commandName, remainder);

    // Clear the current file context
    fileIndexService.clearCurrentFile();
  }
}

// noinspection JSUnusedGlobalSymbols
export function help() {
  return [
    "Usage: /foreachSearch <search-query> -- <command>",
    "Search for text across files and run a command for each matching file",
    "Example: /foreachSearch 'function createFile' -- /edit",
    "Example: /foreachSearch 'TODO' -- /codeReview",
  ];
}
