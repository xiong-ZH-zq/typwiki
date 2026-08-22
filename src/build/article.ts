// article.ts
// Pure article-HTML helpers shared between the build pipeline and the shell:
// heading extraction and slug generation. Nothing here touches the file system
// or the network, so it is safe to import from the React components.

import { escapeHtml } from './html.js';

/** A single article heading extracted from rendered HTML, ready for the table of contents. */
export interface Heading {
  /** Heading level, 1 through 6. */
  level: number;
  /** Fragment anchor id, unique within the article. */
  id: string;
  /** Plain-text heading content with all markup and entities removed. */
  title: string;
}

/**
 * Converts arbitrary text into a URL-safe, lowercase anchor slug. Non-ASCII
 * letters and digits are preserved so CJK headings keep readable anchors.
 *
 * @param text The heading text to slugify.
 * @returns A lowercase slug with runs of separators collapsed to single `-`.
 *
 * @example
 * slugify('Linear Algebra 2.0!'); // 'linear-algebra-2-0'
 * slugify('你好，世界！');          // '你好-世界'
 * slugify('   ');                 // 'section'
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'section' : slug;
}

/**
 * Extracts headings from an article's rendered HTML body and injects unique
 * anchor ids into the heading elements so the table of contents can link to
 * them. Headings that already carry an `id` attribute keep it; duplicates get
 * a numeric suffix.
 *
 * @param body The inner HTML of the article body.
 * @returns `headings` in document order and `body` with anchor ids injected.
 *
 * @example
 * const { headings, body } = extractHeadings('<h2>Intro</h2><p>x</p><h2>Intro</h2>');
 * headings; // [{ level: 2, id: 'intro', title: 'Intro' }, { level: 2, id: 'intro-2', title: 'Intro' }]
 * body;     // '<h2 id="intro">Intro</h2><p>x</p><h2 id="intro-2">Intro</h2>'
 */
export function extractHeadings(body: string): { headings: Heading[]; body: string } {
  const headings: Heading[] = [];
  const usedIds = new Set<string>();
  const updated = body.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attrs, inner) => {
    const title = textContent(inner).trim();
    if (title === '') return full;
    const existing = findAttribute(attrs, 'id');
    if (existing !== undefined) {
      usedIds.add(existing);
      headings.push({ level: Number(level), id: existing, title });
      return full;
    }
    const id = uniqueSlug(slugify(title), usedIds);
    usedIds.add(id);
    headings.push({ level: Number(level), id, title });
    return `<h${level} id="${escapeHtml(id)}"${attrs}>${inner}</h${level}>`;
  });
  return { headings, body: updated };
}

function uniqueSlug(base: string, usedIds: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function findAttribute(attrs: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`, 'i').exec(attrs);
  return match?.[1];
}

function textContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
