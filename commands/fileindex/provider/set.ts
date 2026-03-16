import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../../../FileIndexService.ts";

const inputSchema = {
  args: {},
  prompt: {
    description: "The provider name to set",
    required: true,
  },
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({prompt, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const providerName = prompt.trim();
  if (!providerName) throw new CommandFailedError("Usage: /fileindex provider set <name>");
  const available = fileIndexService.getAvailableFileIndexProviders();
  if (available.includes(providerName)) {
    fileIndexService.setActiveProvider(providerName, agent);
    return `Active provider set to: ${providerName}`;
  }
  return `Provider "${providerName}" not found. Available providers: ${available.join(", ")}`;
}

export default {
  name: "fileindex provider set", 
  description: "Set the active provider", 
  inputSchema,
  execute,
  help: `# /fileindex provider set <name>

Set the active file index provider by name.

## Example

/fileindex provider set ephemeral`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
