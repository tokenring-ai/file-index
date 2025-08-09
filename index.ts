export { default as FileIndexService } from "./FileIndexService.ts";
export { default as StringSearchFileIndexService } from "./StringSearchFileIndexService.ts";
export * as chatCommands from "./chatCommands.ts";
export * as tools from "./tools.ts";

export const name = "@token-ring/file-index";
export const description =
	"Service that indexes files and provides a search interface.";
export const version = "0.1.0";
