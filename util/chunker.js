import segment from "sentencex";
import { encode, decode } from "gpt-tokenizer/encoding/cl100k_base";

const DEFAULT_MAX = 256;
const DEFAULT_OVERLAP = 32;

export function chunkText(
	text,
	{ maxTokens = DEFAULT_MAX, overlapTokens = DEFAULT_OVERLAP } = {},
) {
	if (!text || !text.trim()) return [];

	const sentences = segment("en", text).map((s) => s.text || s);
	const chunks = [];
	let current = [],
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
