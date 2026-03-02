import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export default {
  name: "fileindex provider get",
  description: "/fileindex provider get - Show active provider",
  help: `# /fileindex provider get

Display the currently active file index provider.

## Example

/fileindex provider get`,
  execute: async (_remainder: string, agent: Agent): Promise<string> =>
    `Active provider: ${agent.getState(FileIndexState).activeProvider ?? 'none'}`,
} satisfies TokenRingAgentCommand;
