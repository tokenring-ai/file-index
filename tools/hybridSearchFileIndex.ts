import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import type { SearchResult } from "../FileIndexProvider.ts";
import FileIndexService from "../FileIndexService.ts";

const name = "file-index_hybridSearchFileIndex";
const displayName = "FileIndex/hybridSearchFileIndex";

/**
 * Hybrid semantic + full-text + token overlap search.
 *
 * Combines: (1) embedding similarity (2) full-text search (3) token overlap
 */
async function execute(
  { query, topK = 10, textWeight = 0.3, fullTextWeight = 0.3, mergeRadius = 1 }: z.output<typeof inputSchema>,
  agent: Agent,
): Promise<TokenRingToolResult> {
  const fileIndex = agent.requireServiceByType(FileIndexService);

  // Get results from both search methods
  const [embeddingHits, fullTextHits] = await Promise.all([fileIndex.search(query, topK * 4, agent), fileIndex.fullTextSearch(query, topK * 4, agent)]);

  // Token overlap (BM25-ish)
  const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);

  function bm25ish(text: string) {
    const textTokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = textTokens.filter(t => queryTokens.includes(t)).length;
    return overlap / (queryTokens.length || 1);
  }

  // Combine and normalize scores
  interface EnrichedHit extends SearchResult {
    embScore: number;
    fullTextScore: number;
    textScore: number;
  }
  interface HitWithHybridScore extends EnrichedHit {
    hybridScore: number;
  }
  const allHits = new Map<string, EnrichedHit>();

  // Process embedding hits
  for (const hit of embeddingHits) {
    const key = `${hit.path}-${hit.chunk_index}`;
    allHits.set(key, {
      ...hit,
      embScore: 1 - (hit.distance || 0), // Convert distance to similarity
      fullTextScore: 0,
      textScore: bm25ish(hit.content),
    });
  }

  // Process full-text hits
  for (const hit of fullTextHits) {
    const key = `${hit.path}-${hit.chunk_index}`;
    const existing = allHits.get(key);
    if (existing) {
      existing.fullTextScore = hit.relevance ?? 0;
    } else {
      allHits.set(key, {
        ...hit,
        embScore: 0,
        fullTextScore: hit.relevance ?? 0,
        textScore: bm25ish(hit.content),
      });
    }
  }

  // Normalize scores and compute hybrid score
  const maxFullText = Math.max(...Array.from(allHits.values()).map((h: EnrichedHit) => h.fullTextScore));
  const rescored = Array.from(allHits.values()).map((hit: EnrichedHit): HitWithHybridScore => {
    const normalizedFullText = maxFullText ? hit.fullTextScore / maxFullText : 0;
    const hybridScore = (1 - textWeight - fullTextWeight) * hit.embScore + textWeight * hit.textScore + fullTextWeight * normalizedFullText;
    return { ...hit, hybridScore };
  });

  // Sort by hybrid score
  const sorted = rescored.sort((a: HitWithHybridScore, b: HitWithHybridScore) => b.hybridScore - a.hybridScore);

  // Deduplicate and merge overlapping/adjacent chunks (per file)
  const byFile: Record<string, HitWithHybridScore[]> = {};
  for (const hit of sorted) {
    const { path } = hit;
    if (!byFile[path]) byFile[path] = [];
    byFile[path].push(hit);
  }

  const mergedBlocks: { path: string; indices: number[] }[] = [];
  for (const path in byFile) {
    // Sort chunk indices and merge adjacent/nearby
    const ranges = byFile[path].map(h => h.chunk_index).sort((a: number, b: number) => a - b);
    let group: number[] = [];
    let last: number | null = null;
    for (const idx of ranges) {
      if (last !== null && idx > last + mergeRadius) {
        mergedBlocks.push({ path, indices: [...group] });
        group = [];
      }
      group.push(idx);
      last = idx;
    }
    if (group.length) mergedBlocks.push({ path, indices: group });
  }

  // For each block, get the best scoring chunk and concatenate contents
  const results = mergedBlocks.map(({ path, indices }) => {
    const blockChunks = indices
      .map(idx => sorted.find((h: HitWithHybridScore) => h.path === path && h.chunk_index === idx))
      .filter((h): h is HitWithHybridScore => h !== undefined);

    const content = blockChunks.map(b => b.content).join("\n");
    const hybridScore = Math.max(...blockChunks.map(b => b.hybridScore));
    const start = Math.min(...indices);
    const end = Math.max(...indices);
    // TODO: make this a relative path
    return {
      path,
      start,
      end,
      hybridScore,
      content,
    };
  });

  // Sort blocks by score, return topK
  const finalResults = results.sort((a, b) => b.hybridScore - a.hybridScore).slice(0, topK);

  agent.infoMessage(`[${name}] Hybrid+merge search for: "${query}" => ${finalResults.length} merged regions.\n`);
  return {
    summary: `Hybrid search found ${finalResults.length} result(s) for "${query}"`,
    result: JSON.stringify(finalResults),
  };
}

const description = "Hybrid semantic+full-text+keyword search with merging/deduplication. Returns merged relevant code/text blocks.";

const inputSchema = z.object({
  query: z.string().describe("Text or code query: keyword, full-text, and semantic matches are combined."),
  topK: z.number().int().default(10).describe("Number of top merged results to return (default 10)"),
  textWeight: z.number().default(0.3).describe("Weight (0-1) for token overlap score (default 0.3)"),
  fullTextWeight: z.number().default(0.3).describe("Weight (0-1) for full-text search score (default 0.3)"),
  mergeRadius: z.number().int().default(1).describe("How close (in chunk indices) hits must be to merge into a single region (default: 1)"),
});

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
