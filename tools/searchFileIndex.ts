import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { ToolCallError } from "@tokenring-ai/chat/util/tokenRingTool";
import { z } from "zod";
import FileIndexService from "../FileIndexService.ts";

/**
 * Searches the file index for semantically similar chunks to the query.
 */
const name = "file-index_searchFileIndex";
const displayName = "FileIndex/searchFileIndex";

async function execute({ query, k }: z.output<typeof inputSchema>, agent: Agent): Promise<TokenRingToolResult> {
  const fileIndex = agent.requireService(FileIndexService);

  if (!query) {
    throw new ToolCallError(name, `Missing query parameter`);
  }

  const hits = await fileIndex.search(query, k, agent);

  return {
    failed: hits.length === 0,
    message: `**File Index** Found ${hits.length} matches for ${query}`,
    result: JSON.stringify(
      hits.map(({ path, chunk_index, content, distance }) => ({ path, chunk_index, content, score: Math.max(0, Math.min(1, 1 - (distance ?? 0))) })),
    ),
  };
}

const description = "Semantic search for file/document code/text chunks using the MariaDB vector database.";

const inputSchema = z.object({
  query: z.string().describe("Freeform string query (code, question, natural language, etc) to search for similar file chunks."),
  k: z.number().int().default(5).describe("Number of top results to return (default 5)"),
});

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
