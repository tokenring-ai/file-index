import path from "path";
import fs from "fs-extra";
import FileIndexService from "./FileIndexService.js";

export default class StringSearchFileIndexService extends FileIndexService {
	name = "StringSearchFileIndexService";
	description = "Provides StringSearchFileIndex functionality";

	fileContents = new Map();
	fileQueue = new Set();

	initializing = null;

	async start(registry) {
		this.initializing = this.lazyInit(registry);
	}

	async lazyInit(registry) {
		// Start processing queue periodically
		this.scheduleNextProcessing();

		// Completes once the queue is processed
		await super.start(registry);

		await this.processFiles();

		this.scheduleNextProcessing();
	}

	/**
	 * Called when a file is changed - overrides parent method
	 * @param {string} type - Type of change ('add', 'change', 'unlink')
	 * @param {string} filePath - Absolute path to the file
	 */
	onFileChanged(type, filePath) {
		if (type === "unlink") {
			// Remove from in-memory store
			this.fileQueue.delete(filePath);
			this.fileContents.delete(filePath);
		} else {
			this.fileQueue.add(filePath);
		}
	}

	scheduleNextProcessing() {
		this.timer = setTimeout(async () => {
			await this.processFiles();
			this.scheduleNextProcessing();
		}, 250);
	}

	async waitReady() {
		if (this.initializing != null) {
			console.log("Waiting for database to finish initializing...");
			return this.initializing;
		}
	}

	/*
	 * Process a single file into the database.
	 */
	async processFiles() {
		try {
			const files = Array.from(this.fileQueue.keys());

			const parallelTasks = 10;
			const promises = [];
			for (let i = 0; i < parallelTasks; i++) {
				promises[i] = (async (files, i) => {
					for (; i < files.length; i += parallelTasks) {
						//console.log({i , parallelTasks});
						const relPath = files[i];

						this.fileQueue.delete(relPath);
						try {
							await this.processFile(relPath);
						} catch (err) {
							console.error(`Error in processFile: ${relPath}`, err);
						}
					}
				})(files, i);
			}

			await Promise.all(promises);
		} catch (err) {
			console.error("Error in processFiles:", err);
		}
	}
	/**
	 * Process a single file into memory
	 * @param {string} filePath - Path to the file
	 */
	async processFile(filePath) {
		try {
			const resolvedPath = path.resolve(this.baseDirectory, filePath);

			// Check if file exists
			if (!(await fs.exists(resolvedPath))) {
				this.fileContents.delete(resolvedPath);
				return;
			}

			const content = await fs.readFile(resolvedPath);
			const chunks = this._chunkContent(content);

			// Store in memory
			this.fileContents.set(resolvedPath, {
				content,
				chunks,
				mtime: (await fs.stat(resolvedPath)).mtimeMs,
			});
		} catch (err) {
			console.error(`Error processing file ${filePath}:`, err);
		}
	}

	/**
	 * Split content into manageable chunks.
	 * @param {string} content - File content
	 * @returns {string[]} - Array of text chunks
	 * @private
	 */
	_chunkContent(content) {
		// Simple chunking strategy - split by newline and group into chunks of ~1000 chars
		const lines = content.split("\n");
		const chunks = [];
		let currentChunk = "";

		for (const line of lines) {
			if (currentChunk.length + line.length > 1000) {
				chunks.push(currentChunk);
				currentChunk = line;
			} else {
				currentChunk += (currentChunk ? "\n" : "") + line;
			}
		}

		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	}

	/**
	 * Full-text search through files using substring matching.
	 * @param {string} query - The search query string
	 * @param {number} limit - Maximum number of results to return (default: 10)
	 * @returns {Promise<Array>} - Array of matching chunks with relevance scores
	 */
	async fullTextSearch(query, limit = 10) {
		await this.waitReady();

		if (!query || typeof query !== "string" || query.trim() === "") {
			return [];
		}

		const results = [];
		const normalizedQuery = query.toLowerCase();

		// Search through in-memory file contents
		for (const [filePath, fileData] of this.fileContents.entries()) {
			const { chunks } = fileData;

			for (let i = 0; i < chunks.length; i++) {
				if (results.length >= limit) break;

				const chunk = chunks[i];
				const lowerChunk = chunk.toLowerCase();

				if (lowerChunk.includes(normalizedQuery)) {
					// Calculate a simple relevance score based on number of occurrences
					const count = (
						lowerChunk.match(
							new RegExp(
								normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
								"g",
							),
						) || []
					).length;
					const relevance = count * (1 + 1 / chunk.length); // Boost shorter chunks slightly

					results.push({
						path: filePath,
						chunk_index: i,
						content: chunk,
						relevance: relevance,
					});
				}
			}
		}

		// Sort results by relevance
		return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
	}

	/**
	 * Similarity search - in this implementation, it's the same as fullTextSearch
	 * since we're not using embeddings or other vector similarity methods.
	 * @param {string} query - The search query
	 * @param {number} limit - Maximum number of results to return (default: 10)
	 * @returns {Promise<Array>} - Array of matching chunks with relevance scores
	 */
	async search(query, limit = 10) {
		// For this simple implementation, we'll just use the same method as fullTextSearch
		return this.fullTextSearch(query, limit);
	}

	/**
	 * Dispose of watcher and resources.
	 */
	async close() {
		// Clear timer
		if (this.timer) {
			clearTimeout(this.timer);
		}

		// Clear memory
		this.fileContents.clear();
		this.fileQueue.clear();

		// Call parent close to clean up watcher
		await super.close();
	}
}
