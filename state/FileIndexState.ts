import {Agent} from "@tokenring-ai/agent";
import type {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import type {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import {FileIndexServiceConfigSchema} from "../schema.ts";

export class FileIndexState implements AgentStateSlice {
  name = "FileIndexState";
  activeProvider: string | null;

  constructor(readonly initialConfig: z.output<typeof FileIndexServiceConfigSchema>["agentDefaults"]) {
    this.activeProvider = initialConfig.provider;
  }

  transferStateFromParent(parent: Agent): void {
    this.activeProvider = parent.getState(FileIndexState).activeProvider;
  }

  reset(what: ResetWhat[]): void {}

  serialize(): object {
    return { activeProvider: this.activeProvider };
  }

  deserialize(data: any): void {
    this.activeProvider = data.activeProvider;
  }

  show(): string[] {
    return [`Active FileIndex Provider: ${this.activeProvider}`];
  }
}
