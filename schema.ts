import {z} from "zod";
export const FileIndexAgentConfigSchema = z.object({
  provider: z.string().optional()
}).default({});

export const FileIndexServiceConfigSchema = z.object({
  providers: z.record(z.string(), z.any()),
  agentDefaults: z.object({
    provider: z.string()
  })
});

