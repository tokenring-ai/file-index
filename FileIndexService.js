import { Service } from "@token-ring/registry";
export default class FileIndexService extends Service {
 name = "FileIndexService";
 description = "Provides FileIndex functionality";

 /**
  * Reports the status of the service.
  * @param {TokenRingRegistry} registry - The package registry
  * @returns {Object} Status information.
  */
 async status(registry) {
  return {
   active: true,
   service: "FileIndexService"
  };
 }
 /**
  * Full-text search through file chunks.
  * @param query - The search query string
  * @param limit - Maximum number of results to return (default: 10)
  * @returns Promise<Array> - Array of matching chunks with relevance scores
  */
 async fullTextSearch(query, limit = 10) {
  throw new Error(`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`);
 }


 /**
  * Similarity search.
  */
 async search(query, limit = 10) {
  throw new Error(`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`);
 }
}