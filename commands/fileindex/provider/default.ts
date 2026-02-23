import Agent from "@tokenring-ai/agent/Agent";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function defaultProvider(remainder: string, agent: Agent): Promise<string> {
  agent.mutateState(FileIndexState, state => {
    state.activeProvider = state.initialConfig.provider;
  });
  const provider = agent.getState(FileIndexState).activeProvider;
  return `Default provider: ${provider}`;
}
