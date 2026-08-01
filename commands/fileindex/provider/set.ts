import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import FileIndexService from "../../../FileIndexService.ts";

const inputSchema = {
  args: {},
  positionals: [
    {
      name: "providerName",
      description: "The provider name to set",
      required: true,
    },
  ],
} as const satisfies AgentCommandInputSchema;

function execute({ args: { providerName }, agent }: AgentCommandInputType<typeof inputSchema>): string {
  const fileIndexService = agent.requireService(FileIndexService);

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
  help: `Set the active file index provider by name.

## Example

/fileindex provider set ephemeral`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
