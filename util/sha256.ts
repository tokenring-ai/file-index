import {createHash} from "crypto";

/**
 * Calculates SHA256 hash of the input text
 * @param text The text to hash
 * @returns The hex-encoded SHA256 hash
 */
export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}