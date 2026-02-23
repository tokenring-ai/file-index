import Agent from "@tokenring-ai/agent/Agent";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function get(remainder: string, agent: Agent): Promise<string> {
  const activeProvider = agent.getState(FileIndexState).activeProvider;
  return `Active provider: ${activeProvider ?? 'none'}`;
}
