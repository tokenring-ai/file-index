import {z} from "zod";

export const FileIndexAgentConfigSchema = z
  .object({
    provider: z.string().optional(),
  })
  .default({});

export const FileIndexProviderConfigSchema = z.object({
  type: z.enum(["ephemeral"]),
});

export const FileIndexServiceConfigSchema = z.object({
  agentDefaults: z
    .object({
      provider: z.string(),
    })
    .default({provider: "ephemeral"}),
});
