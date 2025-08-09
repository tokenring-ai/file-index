import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import fs from "fs";

/**
 * Extract symbols (tools, classes) from JS/TS file using tree-sitter.
 * Extendable for other languages by passing a different parser.
 */
export async function extractSymbolsFromFile(filePath: string): Promise<
	Array<{ name: string; kind: string; startLine: number; endLine: number }>
> {
	const code = await fs.promises.readFile(filePath, "utf8");
	const parser: any = new (Parser as any)();
	// noinspection JSCheckFunctionSignatures
	parser.setLanguage(JavaScript as any);
	// noinspection JSCheckFunctionSignatures
	const tree = parser.parse(code);

	let symbols: Array<{
		name: string;
		kind: string;
		startLine: number;
		endLine: number;
	}> = [];

	function walk(node: any) {
		if (node.type === "function_declaration" && node.childForFieldName("name")) {
			symbols.push({
				name: node.childForFieldName("name").text,
				kind: "function",
				startLine: node.startPosition.row + 1,
				endLine: node.endPosition.row + 1,
			});
		}
		if (node.type === "class_declaration" && node.childForFieldName("name")) {
			symbols.push({
				name: node.childForFieldName("name").text,
				kind: "class",
				startLine: node.startPosition.row + 1,
				endLine: node.endPosition.row + 1,
			});
		}
		node.children?.forEach((child: any) => walk(child, node));
	}
	walk(tree.rootNode, null);
	return symbols;
}
