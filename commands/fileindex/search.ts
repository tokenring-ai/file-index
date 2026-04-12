import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../../FileIndexService.ts";

const inputSchema = {
  args: {},
  remainder: {name: "query", description: "Search query", required: true},
} as const satisfies AgentCommandInputSchema;

async function execute({
                         remainder,
                         agent,
                       }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  await fileIndexService.waitReady(agent);
  const results = await fileIndexService.search(remainder, 10, agent);
  if (results.length === 0) return "No results found.";
  const lines = [`Found ${results.length} result(s):`];
  for (const result of results) {
    lines.push(`📄 ${result.path}:`, result.content.trim(), "");
  }
  return lines.join("\n");
}

export default {
  name: "fileindex search",
  description: "Search across files",
  inputSchema,
  execute,
  help: `Search for text across all indexed files. Returns up to 10 matching results with file paths and content.

## Example

/fileindex search function getUser`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
