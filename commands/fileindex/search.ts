import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../../FileIndexService.ts";

const inputSchema = {
  args: {},
  prompt: {
    description: "Search query",
    required: true,
  },
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({prompt, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  if (!prompt?.trim()) throw new CommandFailedError("Usage: /fileindex search <query>");
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  await fileIndexService.waitReady(agent);
  const results = await fileIndexService.search(prompt.trim(), 10, agent);
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
  help: `# /fileindex search <query>

Search for text across all indexed files. Returns up to 10 matching results with file paths and content.

## Example

/fileindex search function getUser`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
