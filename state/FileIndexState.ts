import type {Agent} from "@tokenring-ai/agent";
import {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import type {FileIndexServiceConfigSchema} from "../schema.ts";

const serializationSchema = z.object({
  activeProvider: z.string().nullable(),
});

export class FileIndexState extends AgentStateSlice<
  typeof serializationSchema
> {
  activeProvider: string | null;

  constructor(
    readonly initialConfig: z.output<
      typeof FileIndexServiceConfigSchema
    >["agentDefaults"],
  ) {
    super("FileIndexState", serializationSchema);
    this.activeProvider = initialConfig.provider;
  }

  transferStateFromParent(parent: Agent): void {
    this.activeProvider = parent.getState(FileIndexState).activeProvider;
  }

  reset(): void {
    this.activeProvider = this.initialConfig.provider;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {activeProvider: this.activeProvider};
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.activeProvider = data.activeProvider;
  }

  show(): string {
    return `Active FileIndex Provider: ${this.activeProvider}`;
  }
}
