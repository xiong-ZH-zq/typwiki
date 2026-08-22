// search-index.ts
// Builds the compact static search index for the client-side search box.
// It is a pure-data module: it consumes the prepared SiteIndex and the rendered
// article text and produces a small JSON-serializable structure that the client
// script can fetch and filter without a server.

import type { SiteIndex } from '../model.js';
import { pageHref } from './links.js';

/** A single page's entry in the static search index. */
export interface SearchIndexPage {
  /** The stable page id. */
  id: string;
  /** The page title shown in search results. */
  title: string;
  /** The resolved page href for result links. */
  href: string;
  /** The page's tag names. */
  tags: string[];
  /** Lowercased plain text of the article body, for substring matching. */
  text: string;
}

/** The compact static search index written during the build. */
export interface SearchIndex {
  version: 1;
  /** The deployment base URL, so the client can resolve page hrefs. */
  baseUrl: string;
  pages: SearchIndexPage[];
}

/**
 * Strips HTML tags, decodes common entities, and collapses whitespace so an
 * article body becomes searchable plain text.
 *
 * @param html The rendered article body HTML.
 * @returns The plain-text content, whitespace-normalized.
 *
 * @example
 * extractText('<p>Hello <em>world</em> &amp; friends</p>');
 * // 'Hello world & friends'
 */
export function extractText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Builds the static search index from the site index and per-page plain text.
 * Pages are included in the site's existing (id-sorted) order and carry their
 * resolved hrefs so the client needs no routing logic.
 *
 * @param index The prepared site index.
 * @param texts A map of page id to plain article text; pages without text are
 *   still indexed (title and tags remain searchable).
 * @returns A compact search index ready for JSON serialization.
 *
 * @example
 * buildSearchIndex(index([page({ id: 'home', title: 'Home' })]), { home: 'welcome' });
 * // { version: 1, baseUrl: '', pages: [{ id: 'home', title: 'Home', href: '/p/home/', tags: [], text: 'welcome' }] }
 */
export function buildSearchIndex(index: SiteIndex, texts: Record<string, string>): SearchIndex {
  return {
    version: 1,
    baseUrl: index.baseUrl,
    pages: index.pages.map((page) => ({
      id: page.id,
      title: page.title,
      href: pageHref(index.baseUrl, index.routing, page.id),
      tags: page.tags,
      text: texts[page.id] ?? '',
    })),
  };
}
