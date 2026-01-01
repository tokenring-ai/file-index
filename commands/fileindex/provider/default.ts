import Agent from "@tokenring-ai/agent/Agent";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function defaultProvider(remainder: string, agent: Agent): Promise<void> {
  agent.mutateState(FileIndexState, state => {
    state.activeProvider = state.initialConfig.provider;
  });
  agent.infoLine(`Default provider: ${defaultProvider}`);
}
