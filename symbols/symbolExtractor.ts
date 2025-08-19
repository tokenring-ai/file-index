import fs from "fs";
import Parser, {SyntaxNode} from "tree-sitter";
import JavaScript from "tree-sitter-javascript";

/**
 * Extract symbols (tools, classes) from JS/TS file using tree-sitter.
 * Extendable for other languages by passing a different parser.
 */
export async function extractSymbolsFromFile(filePath: string): Promise<
  Array<{ name: string; kind: string; startLine: number; endLine: number }>
> {
  const code = await fs.promises.readFile(filePath, "utf8");
  const parser = new Parser();
  // noinspection JSCheckFunctionSignatures
  parser.setLanguage(JavaScript as Parser.Language);
  // noinspection JSCheckFunctionSignatures
  const tree = parser.parse(code);

  let symbols: Array<{
    name: string;
    kind: string;
    startLine: number;
    endLine: number;
  }> = [];

  function walk(node: SyntaxNode) {
    if (node.type === "function_declaration" && node.childForFieldName("name")) {
      symbols.push({
        name: node.childForFieldName("name")?.text ?? '',
        kind: "function",
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });
    }
    if (node.type === "class_declaration" && node.childForFieldName("name")) {
      symbols.push({
        name: node.childForFieldName("name")?.text ?? '',
        kind: "class",
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });
    }
    node.children?.forEach(walk);
  }

  walk(tree.rootNode);
  return symbols;
}
