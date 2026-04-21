import { z } from "zod";

export const FileIndexConfigSchema = z.object({
  defaultProvider: z.string(),
});

export const FileIndexAgentConfigSchema = z
  .object({
    provider: z.string().exactOptional(),
  })
  .default({});

export { default as EphemeralFileIndexProvider } from "./EphemeralFileIndexProvider.ts";
export { default as FileIndexProvider } from "./FileIndexProvider.ts";
export { default as FileIndexService } from "./FileIndexService.ts";
