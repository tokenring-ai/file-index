import ChatService from "@token-ring/chat/ChatService";
import { Registry } from "@token-ring/registry";
import { z } from "zod";
import FileIndexService from "../FileIndexService.ts";

/**
 * Searches the file index for semantically similar chunks to the query.
 */
export const name = "file-index/searchFileIndex";

export async function execute(
  { query, k = 5 }: { query?: string; k?: number },
  registry: Registry,
): Promise<any[]> {
  const chatService = registry.requireFirstServiceByType(ChatService);

  const fileIndex = registry.requireFirstServiceByType(FileIndexService);

  if (!query) {
    throw new Error(`[${name}] Missing query parameter`);
  }

  const hits = await fileIndex.search(query, k);
  // Each hit has: {path, chunk_index, content, distance, ...}
  chatService.systemLine(
    `[${name}] Found ${hits.length} matching chunks for query: ${query}\n`,
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
