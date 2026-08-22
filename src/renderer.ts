// renderer.ts
// This module provides the rendering functionality for Typwiki.
// It compiles Typst files into HTML using the Typst compiler, then wraps the
// output in the React site shell via `render-site.tsx`, and finally assembles
// the static search index from the rendered article text.

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TypwikiConfig } from '../typwiki.config.js';
import { publishTheme, themeStylesheetHref } from './assets.js';
import { renderArticlePageResult, renderHomePage, type SiteAssets } from './build/render-site.js';
import { buildSearchIndex } from './build/search-index.js';
import type { SiteIndex, SitePage } from './model.js';
import { TypwikiError } from './model.js';
import { pageOutputPath } from './routing.js';
import { typstInputArgs } from './typst-adapter.js';

export async function renderSite(config: TypwikiConfig, index: SiteIndex): Promise<void> {
  const homePage = config.homePageId === undefined ? undefined : resolveHomePage(index, config.homePageId);
  await publishTheme(config.root, config.publicDir, config.theme);
  const assets: SiteAssets = {
    styles: `${index.baseUrl}/assets/styles.css`,
    theme: themeStylesheetHref(index.baseUrl, config.theme),
    clientScript: `${index.baseUrl}/assets/client.js`,
  };

  const knownIds = index.pages.map((page) => page.id);
  const inputs = typstInputArgs({ baseUrl: index.baseUrl, pagePrefix: index.routing.pagePrefix, known: knownIds });

  const texts: Record<string, string> = {};
  for (const page of index.pages) {
    const input = join(config.root, page.file);
    const output = pageOutputPath(config.root, config.publicDir, index.routing, page.id);
    await mkdir(dirname(output), { recursive: true });
    const result = await run(config.typstBin, ['compile', '--features', 'html', '--root', config.root, ...inputs, input, output]);
    if (result.exitCode !== 0) {
      throw new TypwikiError([{ file: page.file, message: result.stderr.trim() || 'Typst HTML compilation failed.' }]);
    }
    const html = await readFile(output, 'utf8');
    const rendered = renderArticlePageResult(html, { index, page, assets });
    await writeFile(output, rendered.html, 'utf8');
    texts[page.id] = rendered.text;
  }

  const searchIndex = buildSearchIndex(index, texts);
  const searchOutput = join(config.root, config.publicDir, 'assets', 'search-index.json');
  await mkdir(dirname(searchOutput), { recursive: true });
  await writeFile(searchOutput, `${JSON.stringify(searchIndex)}\n`, 'utf8');

  const home = join(config.root, config.publicDir, 'index.html');
  await mkdir(dirname(home), { recursive: true });
  if (homePage) {
    const pageHtml = await readFile(pageOutputPath(config.root, config.publicDir, index.routing, homePage.id), 'utf8');
    await writeFile(home, injectPageBase(pageHtml, `${index.baseUrl}${index.routing.pagePrefix}/${homePage.id}/`), 'utf8');
  } else {
    await writeFile(home, renderHomePage({ index, assets }), 'utf8');
  }
}

export function resolveHomePage(index: SiteIndex, pageId: string): SitePage {
  const page = index.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    throw new TypwikiError([{ message: `Configured homepage page ID does not exist: ${pageId}` }]);
  }
  return page;
}

function injectPageBase(html: string, href: string): string {
  if (html.includes('<base ')) return html;
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) throw new TypwikiError([{ message: 'Typst HTML is missing </head>; cannot set homepage asset base.' }]);
  return `${html.slice(0, headEnd)}<base href="${href}">${html.slice(headEnd)}`;
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
