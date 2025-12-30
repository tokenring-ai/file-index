import {z} from "zod";

export const FileIndexConfigSchema = z.object({
  defaultProvider: z.string(),
  providers: z.record(z.string(), z.any())
});

export const FileIndexAgentConfigSchema = z.object({
  provider: z.string().optional()
}).default({});
