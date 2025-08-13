import segment from "sentencex";
import {decode, encode} from "gpt-tokenizer/encoding/cl100k_base";

const DEFAULT_MAX = 256;
const DEFAULT_OVERLAP = 32;

interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

/**
 * Chunks text into segments based on token count with optional overlap
 * @param text The text to chunk
 * @param options Configuration options for chunking
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  { maxTokens = DEFAULT_MAX, overlapTokens = DEFAULT_OVERLAP }: ChunkOptions = {},
): string[] {
  if (!text || !text.trim()) return [];

  const sentences = segment("en", text).map((s) => (typeof s === 'string' ? s : s.text || ''));
  const chunks: string[] = [];
  let current: string[] = [],
    currentTok = 0;

  for (const sent of sentences) {
    const sentTok = encode(sent).length;
    if (currentTok + sentTok > maxTokens && current.length) {
      const chunk = current.join(" ").trim();
      chunks.push(chunk);
      const encodedChunk = encode(chunk);
      const overlap = encodedChunk.slice(-overlapTokens);
      current = [decode(overlap)];
      currentTok = overlap.length;
    }
    current.push(sent);
    currentTok += sentTok;
  }

  if (current.length) chunks.push(current.join(" ").trim());
  return chunks;
}