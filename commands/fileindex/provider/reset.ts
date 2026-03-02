import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export default {
  name: "fileindex provider reset",
  description: "/fileindex provider reset - Reset to default provider",
  help: `# /fileindex provider reset

Reset the active file index provider to the reset configured value.

## Example

/fileindex provider reset`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    agent.mutateState(FileIndexState, state => { state.activeProvider = state.initialConfig.provider; });
    return `Default provider: ${agent.getState(FileIndexState).activeProvider}`;
  },
} satisfies TokenRingAgentCommand;
