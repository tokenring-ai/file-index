import { createHash } from "crypto";
/**
 * Calculates SHA256 hash of the input text
 * @param {string} text - The text to hash
 * @returns {string} The hex-encoded SHA256 hash
 */
export function sha256(text) {
 return createHash("sha256").update(text, "utf8").digest("hex");
}