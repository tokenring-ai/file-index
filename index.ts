import {z} from "zod";

export const FileIndexConfigSchema = z.object({
  defaultProvider: z.string(),
});

export const FileIndexAgentConfigSchema = z.object({
  provider: z.string().optional()
}).default({});

export {default as FileIndexService} from "./FileIndexService.ts";
export {default as FileIndexProvider} from "./FileIndexProvider.ts";
export {default as EphemeralFileIndexProvider} from "./EphemeralFileIndexProvider.ts";
