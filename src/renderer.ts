// renderer.ts
// This module provides the rendering functionality for Typwiki.
// It includes a function to render the site by compiling Typst files into HTML using the Typst compiler.

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TypwikiConfig } from '../typwiki.config.js';
import { publishTheme, themeStylesheetHref } from './assets.js';
import { escapeHtml } from './build/html.js';
import type { SiteIndex, SitePage } from './model.js';
import { TypwikiError } from './model.js';
import { pageHref, pageOutputPath } from './routing.js';
import { extractHeadings, renderDocumentShell } from './site-shell.js';

export async function renderSite(config: TypwikiConfig, index: SiteIndex): Promise<void> {
  const homePage = config.homePageId === undefined ? undefined : resolveHomePage(index, config.homePageId);
  await publishTheme(config.root, config.publicDir, config.theme);
  const stylesheet = themeStylesheetHref(index.baseUrl, config.theme);

  for (const page of index.pages) {
    const input = join(config.root, page.file);
    const output = pageOutputPath(config.root, config.publicDir, index.routing, page.id);
    await mkdir(dirname(output), { recursive: true });
    const result = await run(config.typstBin, ['compile', '--features', 'html', '--root', config.root, input, output]);
    if (result.exitCode !== 0) {
      throw new TypwikiError([{ file: page.file, message: result.stderr.trim() || 'Typst HTML compilation failed.' }]);
    }
    const html = await readFile(output, 'utf8');
    await writeFile(output, wrapTypstHtml(html, { index, page, stylesheet }), 'utf8');
  }

  const home = join(config.root, config.publicDir, 'index.html');
  await mkdir(dirname(home), { recursive: true });
  if (homePage) {
    const pageHtml = await readFile(pageOutputPath(config.root, config.publicDir, index.routing, homePage.id), 'utf8');
    await writeFile(home, injectPageBase(pageHtml, pageHref(index.baseUrl, index.routing, homePage.id)), 'utf8');
  } else {
    await writeFile(home, renderHomePage(index, stylesheet), 'utf8');
  }
}

export function resolveHomePage(index: SiteIndex, pageId: string): SitePage {
  const page = index.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    throw new TypwikiError([{ message: `Configured homepage page ID does not exist: ${pageId}` }]);
  }
  return page;
}

/**
 * Extracts the canonical `<title>`, the inner `<head>`, and the inner `<body>`
 * from a Typst-produced HTML document.
 *
 * The returned `head` keeps generated styles, math support, and bibliography
 * markup but drops the original `<title>` (the shell supplies its own canonical
 * title) and any `<meta charset>`/viewport declarations (the shell emits those
 * itself). Malformed documents without a `<head>`/`<body>` or with more than
 * one `</body>` are rejected so wrapping never produces nested shells.
 *
 * @param html The full Typst-rendered HTML document.
 * @returns The canonical title, the inner head content, and the inner body content.
 * @throws {TypwikiError} When `<head>`/`<body>` is missing or `</body>` repeats.
 *
 * @example
 * const doc = extractTypstDocument(
 *   '<!DOCTYPE html><html><head><title>Intro</title><style>math{font:serif}</style></head><body><h1>Intro</h1></body></html>',
 * );
 * doc.title; // "Intro"
 * doc.head;  // "<style>math{font:serif}</style>"
 * doc.body;  // "<h1>Intro</h1>"
 */
export function extractTypstDocument(html: string): { title: string; head: string; body: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const bodyClosers = html.match(/<\/body>/gi) ?? [];

  if (headMatch === null || bodyMatch === null) {
    throw new TypwikiError([{ message: 'Typst HTML is missing <head> or <body>.' }]);
  }
  if (bodyClosers.length > 1) {
    throw new TypwikiError([{ message: 'Typst HTML contains multiple </body> tags.' }]);
  }

  const head = headMatch[1]
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+charset[^>]*>/gi, '')
    .replace(/<meta\s+name=["']viewport["'][^>]*>/gi, '');
  return { title: titleMatch?.[1] ?? '', head, body: bodyMatch[1] };
}

/**
 * Wraps a Typst-rendered HTML document in the deterministic site shell.
 *
 * The canonical document title comes from page metadata (not the Typst
 * `<title>`), article headings are extracted and anchored for the table of
 * contents (the first heading is the page title heading emitted by the shared
 * `page.with` template, so it is excluded and the TOC starts at the first real
 * section), and the body is placed in an
 * `<article class="typwiki-article" data-page-id="...">` surrounded by
 * navigation and relations regions.
 *
 * @param html The full Typst-rendered HTML document.
 * @param options Index, page metadata, and the theme stylesheet href.
 * @returns A complete shell document as described by the stable shell contract.
 *
 * @example
 * wrapTypstHtml(
 *   '<!DOCTYPE html><html><head><title>Note</title><style>.m{}</style></head><body><h1>Note</h1><h2>Details</h2><p>Body</p></body></html>',
 *   { index, page, stylesheet: "/assets/themes/academic-paper/theme.css" },
 * );
 * // '<!doctype html>...<article class="typwiki-article" data-page-id="note">...'
 */
export function wrapTypstHtml(html: string, options: { index: SiteIndex; page: SitePage; stylesheet: string }): string {
  const { index, page, stylesheet } = options;
  const document = extractTypstDocument(html);
  const extracted = extractHeadings(document.body);
  const headings = extracted.headings.slice(1);
  return renderDocumentShell({
    index,
    title: page.title,
    content: extracted.body,
    stylesheet,
    currentPageId: page.id,
    head: document.head,
    headings,
  });
}

/**
 * Builds the `<link rel="stylesheet">` element for a theme stylesheet href.
 *
 * @param stylesheet The theme stylesheet href.
 * @returns The HTML link element.
 *
 * @example
 * themeLink("/assets/themes/academic-paper/theme.css");
 * // '<link rel="stylesheet" href="/assets/themes/academic-paper/theme.css">'
 */
export function themeLink(stylesheet: string): string {
  return `<link rel="stylesheet" href="${escapeHtml(stylesheet)}">`;
}

function injectPageBase(html: string, href: string): string {
  if (html.includes('<base ')) return html;
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) throw new TypwikiError([{ message: 'Typst HTML is missing </head>; cannot set homepage asset base.' }]);
  return `${html.slice(0, headEnd)}<base href="${escapeHtml(href)}">${html.slice(headEnd)}`;
}

export function renderHomePage(
  index: Pick<SiteIndex, 'baseUrl' | 'routing' | 'pages'>,
  stylesheet = themeStylesheetHref(index.baseUrl, 'academic-paper'),
): string {
  const items = index.pages
    .map(
      (page) =>
        `<li><a href="${pageHref(index.baseUrl, index.routing, page.id)}">${escapeHtml(page.title)}</a> <code>${escapeHtml(page.id)}</code></li>`,
    )
    .join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${themeLink(stylesheet)}<title>Typwiki</title></head><body><h1>Typwiki</h1><ul>${items}</ul></body></html>`;
}

function run(command: string, args: string[]): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? 1, stderr }));
  });
}
