// renderer.ts
// This module provides the rendering functionality for Typwiki.
// It includes a function to render the site by compiling Typst files into HTML using the Typst compiler.

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TypwikiConfig } from "../typwiki.config.js";
import type { SiteIndex } from "./model.js";
import { TypwikiError } from "./model.js";
import { pageHref, pageOutputPath } from "./routing.js";

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

  const home = join(config.root, config.publicDir, "index.html");
  await mkdir(dirname(home), { recursive: true });
  await writeFile(home, renderHomePage(index), "utf8");
}

export function renderHomePage(index: SiteIndex): string {
  const items = index.pages
    .map((page) => `<li><a href="${pageHref(index.baseUrl, index.routing, page.id)}">${escapeHtml(page.title)}</a> <code>${escapeHtml(page.id)}</code></li>`)
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Typwiki</title></head><body><h1>Typwiki</h1><ul>${items}</ul></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
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
