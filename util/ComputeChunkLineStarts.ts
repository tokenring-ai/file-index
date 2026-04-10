/**
 * Computes the starting line numbers for each chunk in the original text
 */
export function computeChunkLineStarts(
  text: string,
  chunks: string[],
): number[] {
  const lineOffsets: number[] = [0];
  let pos = 0;
  for (const chunk of chunks) {
    const idx = text.indexOf(chunk, pos);
    if (idx === -1) {
      lineOffsets.push(lineOffsets[lineOffsets.length - 1]);
      continue;
    }
    const lineNum = text.slice(0, idx).split("\n").length;
    lineOffsets.push(lineNum);
    pos = idx + chunk.length;
  }
  return lineOffsets;
}
