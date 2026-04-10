import {createHash} from "node:crypto";

/**
 * Calculates SHA256 hash of the input text
 */
export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
