import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import fs from 'fs';

/**
 * Extract symbols (tools, classes) from JS/TS file using tree-sitter.
 * Extendable for other languages by passing a different parser.
 *
 * @param {string} filePath
 * @returns {Promise<Array<{name: string, kind: string, startLine: number, endLine: number}>>}
 */
export async function extractSymbolsFromFile(filePath) {
  const code = await fs.promises.readFile(filePath, 'utf8');
  const parser = new Parser();
  // noinspection JSCheckFunctionSignatures
  parser.setLanguage(JavaScript);
  // noinspection JSCheckFunctionSignatures
 const tree = parser.parse(code);

  let symbols = [];

  function walk(node) {
    if (node.type === "function_declaration" && node.childForFieldName("name")) {
      symbols.push({
        name: node.childForFieldName("name").text,
        kind: 'function',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });
    }
    if (node.type === "class_declaration" && node.childForFieldName("name")) {
      symbols.push({
        name: node.childForFieldName("name").text,
        kind: 'class',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });
    }
    node.children?.forEach(child => walk(child, node));
  }
  walk(tree.rootNode, null);
  return symbols;
}
