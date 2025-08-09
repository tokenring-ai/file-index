import { Service } from "@token-ring/registry";

export default class FileIndexService extends Service {
	name = "FileIndexService";
	description = "Provides FileIndex functionality";

	// Base directory for resolving relative file paths; default to CWD
	public baseDirectory: string = process.cwd();

	private currentFile: string | null = null;

	/** Optional close hook so subclasses can call super.close() safely */
	async close(_registry?: any): Promise<void> {}

	/** Reports the status of the service. */
	async status(_registry: any): Promise<{ active: boolean; service: string }> {
		return {
			active: true,
			service: "FileIndexService",
		};
	}

	/**
	 * Full-text search through file chunks.
	 * @param query The search query string
	 * @param limit Maximum number of results to return (default: 10)
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async fullTextSearch(_query: string, _limit: number = 10): Promise<any[]> {
		throw new Error(
			`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
		);
	}

	/** Similarity search. */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async search(_query: string, _limit: number = 10): Promise<any[]> {
		throw new Error(
			`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
		);
	}

	setCurrentFile(filePath: string) {
		this.currentFile = filePath;
	}

	clearCurrentFile() {
		this.currentFile = null;
	}

	getCurrentFile() {
		return this.currentFile;
	}
}
