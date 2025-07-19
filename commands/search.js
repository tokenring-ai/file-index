import ChatService from "@token-ring/chat/ChatService";
import FileIndexService from "../FileIndexService.js";

/**
 * /search <query> - Search for text across files in the project
 */

export const description =
	"/search <query> - Search for text across files in the project.";

export async function execute(remainder, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const fileIndexService = registry.requireFirstServiceByType(FileIndexService);

	if (!remainder || !remainder.trim()) {
		chatService.errorLine("Usage: /search <query>");
		return;
	}

	if (!fileIndexService) {
		chatService.errorLine(
			"FileIndexService not found. Please add it to your context configuration.",
		);
		return;
	}

	try {
		// Wait for the file index to be ready
		await fileIndexService.waitReady();

		// Default limit to 10 results
		const limit = 10;
		const query = remainder.trim();

		chatService.systemLine(`Searching for: "${query}"...`);

		// Use the search method from StringSearchFileIndexService
		const results = await fileIndexService.search(query, limit);

		if (results.length === 0) {
			chatService.systemLine("No results found.");
			return;
		}

		chatService.systemLine(`Found ${results.length} result(s):`);

		// Display each result
		for (const result of results) {
			const relativePath = result.path
				.replace(fileIndexService.baseDirectory, "")
				.replace(/^[/\\]/, "");

			// Format the output to show the file path and the matching content
			chatService.systemLine(`📄 ${relativePath}:`);

			// Display the content with some context
			const content = result.content.trim();
			chatService.out(content);
			chatService.out("\n");
		}
	} catch (error) {
		chatService.errorLine(`Error during search: ${error.message}`);
		console.error("Search command error:", error);
	}
}

export function help() {
	return ["/search <query> - Search for text across files in the project."];
}
