import { afterEach, describe, expect, it, spyOn } from "bun:test";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { FileSystemConfigSchema } from "@tokenring-ai/filesystem/schema";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";

describe("EphemeralFileIndexProvider", () => {
  let root = "";
  afterEach(async () => {
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  async function setup(files: Record<string, string | Buffer>) {
    root = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), "file-index-")));
    for (const [name, content] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), content);
    }
    const app = createTestingApp();
    const fileSystem = new FileSystemService(app, FileSystemConfigSchema.parse({ allowedPaths: [{ path: root, permission: "write" }] }));
    app.addService(FileSystemService, fileSystem);
    // The testing app's workspace directory (always allowed) is the shared temp folder; index only this test's files.
    spyOn(fileSystem, "getAllowedPaths").mockReturnValue([{ path: root, permission: "write" }]);
    return { provider: new EphemeralFileIndexProvider(app), fileSystem };
  }

  it("indexes the allowed host paths on its own and finds text in them", async () => {
    const { provider } = await setup({
      "src/auth.ts": "export function login() {\n  return checkPassword();\n}\n",
      "src/other.ts": "const unrelated = 1;\n",
      "ignored/secret.ts": "checkPassword in an ignored file\n",
      ".gitignore": "ignored/\n",
      "image.bin": Buffer.from([0, 1, 2, 99, 104, 101, 99, 107]),
    });

    const results = await provider.search("checkPassword");
    expect(results.map(result => result.path)).toEqual([path.join(root, "src/auth.ts")]);
    expect(results[0]!.content).toContain("return checkPassword();");
  });

  it("ranks every match before applying the limit", async () => {
    const { provider } = await setup({
      "a.txt": "needle\n",
      "b.txt": "needle needle needle\n",
    });
    const [best] = await provider.search("needle", 1);
    expect(best?.path).toBe(path.join(root, "b.txt"));
  });

  it("picks up a file the filesystem writes, without waiting for the next full refresh", async () => {
    const { provider, fileSystem } = await setup({ "notes.md": "first draft\n" });
    expect(await provider.search("second")).toEqual([]);

    const notes = path.join(root, "notes.md");
    await fs.writeFile(notes, "second draft\n");
    // Bump the mtime so the change is visible even on filesystems with coarse timestamps.
    await fs.utimes(notes, new Date(), new Date(Date.now() + 5_000));
    (fileSystem as unknown as { notifyFileWritten(filePath: string): void }).notifyFileWritten(notes);

    expect((await provider.search("second")).map(result => result.path)).toEqual([notes]);
    provider.close();
  });
});
