import ChatService from "@token-ring/chat/ChatService";
import FileIndexService from "../FileIndexService.ts";
import type {Registry} from "@token-ring/registry";
import { runCommand } from "@token-ring/chat/runCommand";

/**
 * /foreachSearch <query> -- <command> - Run a command for each file matching the search query
 */

export const description =
	"/foreachSearch <search-query> -- <command> - Search for text across files and run a command for each matching file";

export async function execute(remainder: string, registry: Registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const fileIndexService: FileIndexService | undefined =
		registry.requireFirstServiceByType(FileIndexService);

	// Check if we have a valid remainder
	if (!remainder || !remainder.trim()) {
        for (const line of help()) {
            chatService.systemLine(line);
        }
		return;
	}

	// Split the remainder into query and command parts
	const parts = remainder.split(/\s+--\s+/);
	if (parts.length < 2) {
        chatService.errorLine(
            "Missing '--' separator between search query and command",
        );
        for (const line of help()) {
            chatService.systemLine(line);
        }
		return;
	}

	const query = parts[0].trim();
	const command = parts.slice(1).join(" -- ").trim();

	if (!fileIndexService) {
		chatService.errorLine(
			"FileIndexService not found. Please add it to your context configuration.",
		);
		return;
	}

	try {
		// Wait for the file index to be ready
		await (fileIndexService as any).waitReady?.();

		chatService.systemLine(
			`Searching for: "${query}" and running command: "${command}" on each file...`,
		);

		// Get search results
		const results = await fileIndexService.search(query);

		if (results.length === 0) {
			chatService.systemLine("No results found.");
			return;
		}

		chatService.systemLine(
			`Found ${results.length} result(s). Processing each file...`,
		);

		// Process each result
		for (const result of results) {
			const relativePath = (result.path as string)
				.replace(fileIndexService.baseDirectory, "")
				.replace(/^[/\\]/, "");

			chatService.systemLine(`\nProcessing file: ${relativePath}`);

			// Set the current file context
			fileIndexService.setCurrentFile(relativePath);

			// Run the command using the shared runCommand helper
			const match = command.match(/^\/?(\S+)(?:\s+(.*))?$/);
			const commandName = match?.[1] ?? "help";
			const remainder = match?.[2] ?? "";
			await runCommand(commandName, remainder, registry);

			// Clear the current file context
			fileIndexService.clearCurrentFile();
		}
	} catch (error: any) {
		chatService.errorLine(`Error during foreachSearch: ${error.message}`);
		console.error("ForeachSearch command error:", error);
	}
}

export function help() {
	return [
		"Usage: /foreachSearch <search-query> -- <command>",
		"Search for text across files and run a command for each matching file",
		"Example: /foreachSearch 'function createFile' -- /edit",
		"Example: /foreachSearch 'TODO' -- /codeReview",
	];
}
