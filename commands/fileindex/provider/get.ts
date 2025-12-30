import Agent from "@tokenring-ai/agent/Agent";
import FileIndexService from "../../../FileIndexService.ts";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function get(remainder: string, agent: Agent): Promise<void> {
  const activeProvider = agent.getState(FileIndexState).activeProvider;
  agent.infoLine(`Active provider: ${activeProvider ?? 'none'}`);
}
