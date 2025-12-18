import {z} from "zod";

export const FileIndexConfigSchema = z.object({
  providers: z.record(z.string(), z.any())
}).optional();



export {default as FileIndexService} from "./FileIndexService.ts";
export {default as FileIndexProvider} from "./FileIndexProvider.ts";
export {default as EphemeralFileIndexProvider} from "./EphemeralFileIndexProvider.ts";
