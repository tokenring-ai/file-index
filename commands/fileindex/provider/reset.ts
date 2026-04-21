import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import { FileIndexState } from "../../../state/FileIndexState.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

function execute({ agent }: AgentCommandInputType<typeof inputSchema>): string {
  agent.mutateState(FileIndexState, state => {
    state.reset();
  });
  return `Default provider: ${agent.getState(FileIndexState).activeProvider}`;
}

export default {
  name: "fileindex provider reset",
  description: "Reset to default provider",
  inputSchema,
  execute,
  help: `Reset the active file index provider to the reset configured value.

## Example

/fileindex provider reset`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
