import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingToolDefinition} from "@tokenring-ai/chat/types";
import {z} from "zod";
import FileIndexService from "../FileIndexService.ts";

/**
 * Searches the file index for semantically similar chunks to the query.
 */
const name = "file-index_searchFileIndex";
async function execute(
  {query, k = 5}: z.infer<typeof inputSchema>,
  agent: Agent,
): Promise<any[]> {

  const fileIndex = agent.requireServiceByType(FileIndexService);

  if (!query) {
    throw new Error(`[${name}] Missing query parameter`);
  }

  const hits = await fileIndex.search(query, k, agent);
  // Each hit has: {path, chunk_index, content, distance, ...}
  agent.infoLine(
    `[${name}] Found ${hits.length} matching chunks for query: ${query}\n`,
  );
  return hits.map(({path, chunk_index, content, distance}: any) => ({
    path,
    chunk_index,
    content,
    score: Math.max(0, Math.min(1, 1 - (distance || 0))), // Convert distance to similarity score (0-1) and clamp
  }));
}

const description =
  "Semantic search for file/document code/text chunks using the MariaDB vector database.";

const inputSchema = z.object({
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

export default {
  name, description, inputSchema, execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
