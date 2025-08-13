import ChatService from "@token-ring/chat/ChatService";
import FileIndexService from "../FileIndexService.ts";
import { z } from "zod";
import {Registry} from "@token-ring/registry";

/**
 * Searches the file index for semantically similar chunks to the query.
 */
export default async function (
	{ query, k = 5 }: { query: string; k?: number },
	registry: Registry,
) {
	const chatService = registry.requireFirstServiceByType(ChatService);

	const fileIndex = registry.requireFirstServiceByType(FileIndexService);
	if (!fileIndex) {
		chatService.errorLine("[ERROR] FileIndexService not found\n");
		return [] as any[];
	}
	const hits = await fileIndex.search(query, k);
	// Each hit has: {path, chunk_index, content, distance, ...}
	chatService.systemLine(
		`[FileIndex] Found ${hits.length} matching chunks for query: ${query}\n`,
	);
	return hits.map(({ path, chunk_index, content, distance }: any) => ({
		path,
		chunk_index,
		content,
		score: Math.max(0, Math.min(1, 1 - (distance || 0))), // Convert distance to similarity score (0-1) and clamp
	}));
}

export const description =
	"Semantic search for file/document code/text chunks using the MariaDB vector database.";

export const parameters = z.object({
	query: z
		.string()
		.describe(
			"Freeform string query (code, question, natural language, etc) to search for similar file chunks.",
		),
	k: z
		.number()
		.int()
		.default(5)
		.describe("Number of top results to return (default 5)"),
});
