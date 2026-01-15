import Agent from "@tokenring-ai/agent/Agent";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function get(remainder: string, agent: Agent): Promise<void> {
  const activeProvider = agent.getState(FileIndexState).activeProvider;
  agent.infoMessage(`Active provider: ${activeProvider ?? 'none'}`);
}
