import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {FileIndexState} from "../../../state/FileIndexState.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  return `Active provider: ${agent.getState(FileIndexState).activeProvider ?? 'none'}`;
}

export default {
  name: "fileindex provider get",
  description: "Show active provider",
  inputSchema,
  execute,
  help: `Display the currently active file index provider.

## Example

/fileindex provider get`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
