// renderer.ts
// This module provides the rendering functionality for Typwiki.
// It includes a function to render the site by compiling Typst files into HTML using the Typst compiler.

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TypwikiConfig } from "../typwiki.config.js";
import type { SiteIndex } from "./model.js";
import { TypwikiError } from "./model.js";
import { pageOutputPath } from "./routing.js";

export async function renderSite(config: TypwikiConfig, index: SiteIndex): Promise<void> {
  for (const page of index.pages) {
    const input = join(config.root, page.file);
    const output = pageOutputPath(config.root, config.publicDir, index.routing, page.id);
    await mkdir(dirname(output), { recursive: true });
    const result = await run(config.typstBin, [
      "compile",
      "--features",
      "html",
      "--root",
      config.root,
      input,
      output,
    ]);
    if (result.exitCode !== 0) {
      throw new TypwikiError([{ file: page.file, message: result.stderr.trim() || "Typst HTML 编译失败。" }]);
    }
  }
}

function run(command: string, args: string[]): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode: exitCode ?? 1, stderr }));
  });
}
