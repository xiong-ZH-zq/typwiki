// renderer.ts
// This module provides the rendering functionality for Typwiki.
// It includes a function to render the site by compiling Typst files into HTML using the Typst compiler.

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TypwikiConfig } from "../typwiki.config.js";
import type { SiteIndex, SitePage } from "./model.js";
import { TypwikiError } from "./model.js";
import { publishTheme, themeStylesheetHref } from "./assets.js";
import { pageHref, pageOutputPath } from "./routing.js";

export async function renderSite(config: TypwikiConfig, index: SiteIndex): Promise<void> {
  const homePage = config.homePageId === undefined ? undefined : resolveHomePage(index, config.homePageId);
  await publishTheme(config.root, config.publicDir, config.theme);
  const stylesheet = themeStylesheetHref(index.baseUrl, config.theme);

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
      throw new TypwikiError([{ file: page.file, message: result.stderr.trim() || "Typst HTML compilation failed." }]);
    }
    await injectThemeIntoFile(output, stylesheet);
  }

  const home = join(config.root, config.publicDir, "index.html");
  await mkdir(dirname(home), { recursive: true });
  if (homePage) {
    const pageHtml = await readFile(pageOutputPath(config.root, config.publicDir, index.routing, homePage.id), "utf8");
    await writeFile(home, injectPageBase(pageHtml, pageHref(index.baseUrl, index.routing, homePage.id)), "utf8");
  } else {
    await writeFile(home, renderHomePage(index, stylesheet), "utf8");
  }
}

export function resolveHomePage(index: SiteIndex, pageId: string): SitePage {
  const page = index.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    throw new TypwikiError([{ message: `Configured homepage page ID does not exist: ${pageId}` }]);
  }
  return page;
}

export function themeLink(stylesheet: string): string {
  return `<link rel="stylesheet" href="${escapeHtml(stylesheet)}">`;
}

export function injectTheme(html: string, stylesheet: string): string {
  const link = themeLink(stylesheet);
  if (html.includes(link)) return html;
  const headEnd = html.indexOf("</head>");
  if (headEnd < 0) throw new TypwikiError([{ message: "Typst HTML is missing </head>; cannot inject the theme." }]);
  return `${html.slice(0, headEnd)}${link}${html.slice(headEnd)}`;
}

export async function injectThemeIntoFile(file: string, stylesheet: string): Promise<void> {
  const html = await readFile(file, "utf8");
  await writeFile(file, injectTheme(html, stylesheet), "utf8");
}

function injectPageBase(html: string, href: string): string {
  if (html.includes("<base ")) return html;
  const headEnd = html.indexOf("</head>");
  if (headEnd < 0) throw new TypwikiError([{ message: "Typst HTML is missing </head>; cannot set homepage asset base." }]);
  return `${html.slice(0, headEnd)}<base href="${escapeHtml(href)}">${html.slice(headEnd)}`;
}

export function renderHomePage(index: Pick<SiteIndex, "baseUrl" | "routing" | "pages">, stylesheet = themeStylesheetHref(index.baseUrl, "academic-paper")): string {
  const items = index.pages
    .map((page) => `<li><a href="${pageHref(index.baseUrl, index.routing, page.id)}">${escapeHtml(page.title)}</a> <code>${escapeHtml(page.id)}</code></li>`)
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${themeLink(stylesheet)}<title>Typwiki</title></head><body><h1>Typwiki</h1><ul>${items}</ul></body></html>`;
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
