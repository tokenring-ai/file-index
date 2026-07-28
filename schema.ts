import type { ConfigFieldMeta } from "@tokenring-ai/app/config/metadata";
import { z } from "zod";

export const FileIndexAgentConfigSchema = z
  .object({
    provider: z.string().exactOptional(),
  })
  .default({});

export const FileIndexProviderConfigSchema = z.object({
  type: z.enum(["ephemeral"]),
});

export const FileIndexServiceConfigSchema = z
  .object({
    agentDefaults: z
      .object({
        provider: z.string().meta({ description: "File index provider new agents use by default" } satisfies ConfigFieldMeta),
      })
      .default({ provider: "ephemeral" })
      .meta({ label: "Agent Defaults" } satisfies ConfigFieldMeta),
  })
  .prefault({})
  .meta({ label: "File Index", description: "Fast file lookup/search index for agents" } satisfies ConfigFieldMeta);
