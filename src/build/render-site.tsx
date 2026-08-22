// render-site.tsx
// Server-side rendering entry point. This module composes a full HTML document
// around the React shell: it extracts the Typst `<head>`/`<body>`, injects
// unique heading anchors, renders the body shell with React, and embeds the
// page data (`#typwiki-data`) so the hydrated client can re-render the same
// tree.
//
// The `<head>` and the `<!doctype html>` wrapper are assembled here as strings;
// the React component (`Shell` / `HomePage`) renders only the `<body>` inner
// content inside `#typwiki-root`, which doubles as the hydration target.

import { renderToString } from 'react-dom/server';
import { HomePage } from '../components/HomePage.js';
import { Shell } from '../components/Shell.js';
import type { SiteIndex, SitePage } from '../model.js';
import { TypwikiError } from '../model.js';
import { extractHeadings } from './article.js';
import { escapeHtml } from './html.js';

/** The site-wide asset hrefs and script references used by generated pages. */
export interface SiteAssets {
  /** The base stylesheet (Tailwind + tokens), e.g. `/assets/styles.css`. */
  styles: string;
  /** The selected theme override layer, e.g. `/assets/themes/academic-paper/theme.css`. */
  theme: string;
  /** The hydration bundle href, e.g. `/assets/client.js`; omitted until the client build exists. */
  clientScript?: string;
}

/** The page data embedded as JSON for the hydrated client. */
export interface PageData {
  index: SiteIndex;
  pageId?: string;
  title: string;
  content: string;
  headings: { level: number; id: string; title: string }[];
  tagTable?: boolean;
  linkTable?: boolean;
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
 * Renders an authored article page as a complete HTML document.
 *
 * The canonical document title comes from page metadata (not the Typst
 * `<title>`); headings are extracted and anchored for the table of contents
 * (the first heading is the page title heading emitted by the shared `page.with`
 * template, so it is excluded and the TOC starts at the first real section);
 * and the body is wrapped in the React shell.
 *
 * @param html The full Typst-rendered HTML document for the article.
 * @param options Index, page metadata, theme stylesheet, and hydration bundle href.
 * @returns A complete HTML document following the stable shell contract.
 */
export function renderArticlePage(html: string, options: { index: SiteIndex; page: SitePage; assets: SiteAssets }): string {
  const { index, page, assets } = options;
  const document = extractTypstDocument(html);
  const extracted = extractHeadings(document.body);
  const headings = extracted.headings.slice(1);
  const data: PageData = {
    index,
    pageId: page.id,
    title: page.title,
    content: extracted.body,
    headings,
    tagTable: page.tagTable,
    linkTable: page.linkTable,
  };
  const shellHtml = renderToString(
    <Shell
      index={index}
      content={extracted.body}
      currentPageId={page.id}
      headings={headings}
      tagTable={page.tagTable}
      linkTable={page.linkTable}
    />,
  );
  return assembleDocument({
    title: page.title,
    head: document.head,
    assets,
    bodyHtml: shellHtml,
    data,
  });
}

/**
 * Renders the generated site homepage (a page directory), or an authored page
 * chosen as the root homepage.
 *
 * @param options The site index subset, theme stylesheet, and hydration bundle href.
 * @returns A complete HTML document for the root homepage.
 */
export function renderHomePage(options: { index: Pick<SiteIndex, 'baseUrl' | 'routing' | 'pages'>; assets: SiteAssets }): string {
  const { index, assets } = options;
  const bodyHtml = renderToString(<HomePage index={index} />);
  return assembleDocument({
    title: 'Typwiki',
    head: '',
    assets,
    bodyHtml,
    data: undefined,
  });
}

interface AssembleOptions {
  title: string;
  head: string;
  assets: SiteAssets;
  bodyHtml: string;
  /** Page data embedded for hydration; omitted on non-page documents. */
  data?: PageData;
}

/** Wraps the rendered body shell in a standalone, deterministic HTML document. */
function assembleDocument(options: AssembleOptions): string {
  const { title, head, assets, bodyHtml, data } = options;
  const { styles, theme, clientScript } = assets;
  const dataScript = data === undefined ? '' : `\n<script type="application/json" id="typwiki-data">${escapeJson(data)}</script>`;
  const scriptTag = clientScript === undefined ? '' : `\n<script type="module" src="${escapeHtml(clientScript)}"></script>`;
  const styleLinks = `<link rel="stylesheet" href="${escapeHtml(styles)}"><link rel="stylesheet" href="${escapeHtml(theme)}">`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Typwiki</title>
${head}${styleLinks}
${dataScript}
</head>
<body>
<div id="typwiki-root">
${bodyHtml}
</div>
${scriptTag}
</body>
</html>`;
}

/** Serializes page data as safe JSON for embedding in a `<script>` tag. */
export function escapeJson(value: PageData): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
