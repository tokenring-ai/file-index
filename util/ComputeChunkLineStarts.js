export function computeChunkLineStarts(text, chunks) {
 let lineOffsets = [0];
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