// site-shell.ts
// This module composes deterministic HTML around Typst-rendered articles.
// It consumes prepared SiteIndex data only: it never reads source files,
// never runs Typst, and never mutates the graph. Every exported function is a
// pure function so each shell region can be tested and styled independently.

import type { NavigationEntry, SiteIndex, SitePage } from "./model.js";
import { normalizeBaseUrl, pageHref } from "./routing.js";

/** A node in the slash-separated navigation tree. */
export interface NavNode {
  /** The page that terminates at this node, if any (intermediate segments have none). */
  page?: SitePage;
  /** Child nodes keyed by the next path segment. */
  children: Map<string, NavNode>;
}

/**
 * A single article heading extracted from rendered HTML, ready for the table of
 * contents. `id` is the anchor the TOC link points to and is also injected into
 * the heading element itself.
 */
export interface Heading {
  /** Heading level, 1 through 6. */
  level: number;
  /** Fragment anchor id, unique within the article. */
  id: string;
  /** Plain-text heading content with all markup and entities removed. */
  title: string;
}

/**
 * Escapes text so it can be safely embedded in HTML or attribute values.
 *
 * @param value The raw text to escape.
 * @returns The input with `&`, `<`, `>`, and `"` replaced by their entities.
 *
 * @example
 * escapeHtml(`A <b> & "c"`); // "A &lt;b&gt; &amp; &quot;c&quot;"
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

/**
 * Maps a deployment base URL to the site root href (with a trailing slash).
 *
 * @param baseUrl A normalized base URL such as `""` or `"/typwiki"`.
 * @returns The site root, e.g. `"/"` or `"/typwiki/"`.
 *
 * @example
 * siteHref("");         // "/"
 * siteHref("/typwiki"); // "/typwiki/"
 */
export function siteHref(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/`;
}

/**
 * Converts arbitrary text into a URL-safe, lowercase anchor slug. Non-ASCII
 * letters and digits are preserved so CJK headings keep readable anchors.
 *
 * @param text The heading text to slugify.
 * @returns A lowercase slug with runs of separators collapsed to single `-`.
 *
 * @example
 * slugify("Linear Algebra 2.0!"); // "linear-algebra-2-0"
 * slugify("你好，世界！");          // "你好-世界"
 * slugify("   ");                 // "section"
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "section" : slug;
}

/**
 * Groups pages into a navigation tree by slash-separated ID segments.
 *
 * @param pages The site's pages, each with a slash-separated id.
 * @returns A tree root whose `children` map walks each segment; the deepest node
 *   for a page carries that page in its `page` field.
 *
 * @example
 * const tree = buildNavigationTree([
 *   page({ id: "math/matrices" }),
 *   page({ id: "math/linear-algebra" }),
 *   page({ id: "home" }),
 * ]);
 * [...tree.children.keys()].sort(); // ["home", "math"]
 */
export function buildNavigationTree(pages: SitePage[]): NavNode {
  const root: NavNode = { children: new Map() };
  for (const page of pages) {
    let node = root;
    for (const segment of page.id.split("/")) {
      let child = node.children.get(segment);
      if (child === undefined) {
        child = { children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }
    node.page = page;
  }
  return root;
}

function renderNavLevel(node: NavNode, index: SiteIndex, currentPageId: string): string {
  const items: string[] = [];
  const segments = [...node.children.entries()].sort(([left], [right]) => left.localeCompare(right));
  for (const [segment, child] of segments) {
    if (child.page === undefined) {
      items.push(
        `<li><span class="typwiki-nav-group">${escapeHtml(segment)}</span><ul>${renderNavLevel(child, index, currentPageId)}</ul></li>`,
      );
    } else {
      const active = child.page.id === currentPageId;
      const classes = active ? "typwiki-nav-link is-active" : "typwiki-nav-link";
      const ariaCurrent = active ? ' aria-current="page"' : "";
      items.push(
        `<li><a href="${escapeHtml(pageHref(index.baseUrl, index.routing, child.page.id))}" class="${classes}"${ariaCurrent}>${escapeHtml(child.page.title)}</a></li>`,
      );
    }
  }
  return `<ul>${items.join("")}</ul>`;
}

/**
 * Renders the header navigation. When the index carries a user-configured
 * `navigation` list, that list is rendered verbatim (ordered, flat); otherwise
 * every page is rendered as a slash-separated tree. The current page's link is
 * marked with `aria-current="page"` and the `is-active` class.
 *
 * @param index The site index used to resolve page hrefs and navigation entries.
 * @param currentPageId The active page id.
 * @returns An HTML navigation list, or `""` when there are no entries to show.
 *
 * @example
 * // Configured navigation
 * renderNavigation(index([page({ id: "home", title: "Home" })], {}, [
 *   { id: "home", label: "Start" },
 *   { href: "https://github.com/xzqbear/typwiki", label: "GitHub" },
 * ]), "home");
 * // '<ul><li><a href="/p/home/" class="typwiki-nav-link is-active" aria-current="page">Start</a></li><li><a href="https://github.com/xzqbear/typwiki" class="typwiki-nav-link" rel="noopener noreferrer" target="_blank">GitHub</a></li></ul>'
 *
 * @example
 * // Automatic tree navigation when `index.navigation` is undefined
 * renderNavigation(index([page({ id: "home", title: "Home" })]), "home");
 * // '<ul><li><a href="/p/home/" class="typwiki-nav-link is-active" aria-current="page">Home</a></li></ul>'
 */
export function renderNavigation(index: SiteIndex, currentPageId: string): string {
  if (index.navigation !== undefined) {
    return renderConfiguredNavigation(index.navigation, index, currentPageId);
  }
  return renderNavLevel(buildNavigationTree(index.pages), index, currentPageId);
}

function renderConfiguredNavigation(entries: NavigationEntry[], index: SiteIndex, currentPageId: string): string {
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  const items = entries.map((entry) => {
    if (entry.id !== undefined) {
      const page = byId.get(entry.id);
      const active = entry.id === currentPageId;
      const classes = active ? "typwiki-nav-link is-active" : "typwiki-nav-link";
      const ariaCurrent = active ? ' aria-current="page"' : "";
      const label = entry.label ?? page?.title ?? entry.id;
      const href = page === undefined ? "#" : pageHref(index.baseUrl, index.routing, entry.id);
      const missing = page === undefined ? ' class="typwiki-missing-link"' : "";
      return `<li><a href="${escapeHtml(href)}" class="${classes}"${ariaCurrent}${missing}>${escapeHtml(label)}</a></li>`;
    }
    const label = entry.label ?? entry.href ?? "";
    const external = /^https?:\/\//i.test(entry.href ?? "");
    const rel = external ? ' rel="noopener noreferrer" target="_blank"' : "";
    return `<li><a href="${escapeHtml(entry.href ?? "#")}" class="typwiki-nav-link"${rel}>${escapeHtml(label)}</a></li>`;
  });
  return `<ul>${items.join("")}</ul>`;
}

/**
 * Renders a site-wide tag cloud with per-tag page counts.
 *
 * @param index The site index whose `tags` record maps tag names to page ids.
 * @returns A sorted `<ul>` of tags, or `""` when the site has no tags.
 *
 * @example
 * renderTagCloud(index([], { "topic/math": ["a", "b"], "status/active": ["a"] }));
 * // '<ul class="typwiki-tag-cloud"><li><span class="typwiki-tag">status/active</span> <span class="typwiki-count">1</span></li>...</ul>'
 */
export function renderTagCloud(index: SiteIndex): string {
  const tags = Object.keys(index.tags).sort();
  if (tags.length === 0) return "";
  const items = tags.map(
    (tag) => `<li><span class="typwiki-tag">${escapeHtml(tag)}</span> <span class="typwiki-count">${index.tags[tag].length}</span></li>`,
  );
  return `<ul class="typwiki-tag-cloud">${items.join("")}</ul>`;
}

/**
 * Renders the most recently modified pages, newest first.
 *
 * @param index The site index to draw pages from.
 * @param limit How many pages to list (default `5`).
 * @returns A `<ul>` of dated pages ordered by `modifiedAt` descending, or `""`
 *   when no page carries a modification timestamp.
 *
 * @example
 * renderRecentPages(index([
 *   page({ id: "new", title: "New", modifiedAt: 2000 }),
 *   page({ id: "old", title: "Old", modifiedAt: 1000 }),
 * ]), 2); // '<ul class="typwiki-recent-pages"><li><a href="/p/new/">New</a></li>...'
 */
export function renderRecentPages(index: SiteIndex, limit = 5): string {
  const timed = index.pages
    .filter((page) => page.modifiedAt !== undefined)
    .sort((left, right) => (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0));
  if (timed.length === 0) return "";
  const items = timed.slice(0, limit).map(
    (page) => `<li><a href="${escapeHtml(pageHref(index.baseUrl, index.routing, page.id))}">${escapeHtml(page.title)}</a></li>`,
  );
  return `<ul class="typwiki-recent-pages">${items.join("")}</ul>`;
}

/**
 * Renders a breadcrumb trail for a page id. Existing ancestor pages are linked;
 * intermediate segments that have no page become plain text.
 *
 * @param index The site index used to resolve ancestor pages.
 * @param pageId The current page id.
 * @returns An `<ol>` breadcrumb trail ending with the current page.
 *
 * @example
 * renderBreadcrumbs(index([page({ id: "math", title: "Mathematics" })]), "math/linear-algebra");
 * // '<ol class="typwiki-breadcrumbs"><li><a href="/">Home</a></li><li><a href="/p/math/">Mathematics</a></li><li>linear-algebra</li></ol>'
 */
export function renderBreadcrumbs(index: SiteIndex, pageId: string): string {
  const segments = pageId.split("/");
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  const items: string[] = [`<li><a href="${escapeHtml(siteHref(index.baseUrl))}">Home</a></li>`];
  const accumulated: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    accumulated.push(segments[i]);
    const path = accumulated.join("/");
    const page = byId.get(path);
    if (i === segments.length - 1) {
      items.push(`<li aria-current="page">${escapeHtml(page?.title ?? segments[i])}</li>`);
    } else if (page !== undefined) {
      items.push(`<li><a href="${escapeHtml(pageHref(index.baseUrl, index.routing, page.id))}">${escapeHtml(page.title)}</a></li>`);
    } else {
      items.push(`<li>${escapeHtml(segments[i])}</li>`);
    }
  }
  return `<ol class="typwiki-breadcrumbs">${items.join("")}</ol>`;
}

/**
 * Formats a page's modification timestamp as an ISO calendar date.
 *
 * @param page The page to read `modifiedAt` from.
 * @returns A `YYYY-MM-DD` string, or `null` when the page has no timestamp.
 *
 * @example
 * formatModifiedDate(page({ modifiedAt: Date.UTC(2026, 7, 20) })); // "2026-08-20"
 * formatModifiedDate(page({}));                                    // null
 */
export function formatModifiedDate(page: SitePage): string | null {
  if (page.modifiedAt === undefined) return null;
  return new Date(page.modifiedAt).toISOString().slice(0, 10);
}

/**
 * Renders a page's metadata properties (its id and modification date).
 *
 * @param page The page whose properties are rendered.
 * @returns A `<ul>` of property rows.
 *
 * @example
 * renderProperties(page({ id: "note", modifiedAt: Date.UTC(2026, 7, 20) }));
 * // '<ul class="typwiki-properties"><li><span>Page ID</span><code>note</code></li><li><span>Modified</span><time datetime="2026-08-20">2026-08-20</time></li></ul>'
 */
export function renderProperties(page: SitePage): string {
  const date = formatModifiedDate(page);
  const dateHtml = date === null ? "" : `<li><span>Modified</span><time datetime="${date}">${date}</time></li>`;
  return `<ul class="typwiki-properties"><li><span>Page ID</span><code>${escapeHtml(page.id)}</code></li>${dateHtml}</ul>`;
}

/**
 * Renders a page's tags as a chip list.
 *
 * @param page The page whose tags are rendered.
 * @returns A `<ul>` of tag chips, or `""` when the page has no tags.
 *
 * @example
 * renderPageTags(page({ tags: ["topic/math"] }));
 * // '<ul class="typwiki-page-tags"><li><span class="typwiki-tag">topic/math</span></li></ul>'
 * renderPageTags(page({ tags: [] })); // ""
 */
export function renderPageTags(page: SitePage): string {
  if (page.tags.length === 0) return "";
  const items = page.tags.map((tag) => `<li><span class="typwiki-tag">${escapeHtml(tag)}</span></li>`);
  return `<ul class="typwiki-page-tags">${items.join("")}</ul>`;
}

/**
 * Renders a titled list of page links (backlinks, outgoing links, related
 * pages). Known targets link to their pages; unknown targets degrade to a
 * muted span instead of a broken link.
 *
 * @param title The section heading text.
 * @param ids The page ids to list.
 * @param index The site index used to resolve targets.
 * @returns A heading plus a `<ul>` of links, or `""` when `ids` is empty.
 *
 * @example
 * renderPageLinkList("Backlinks", ["known", "missing"], index([page({ id: "known", title: "Known" })]));
 * // '<h3 class="typwiki-link-list-title">Backlinks</h3><ul class="typwiki-link-list"><li><a href="/p/known/">Known</a></li><li><span class="typwiki-missing-link">missing</span></li></ul>'
 */
export function renderPageLinkList(title: string, ids: string[], index: SiteIndex): string {
  if (ids.length === 0) return "";
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  const items = ids.map((id) => {
    const page = byId.get(id);
    if (page === undefined) return `<li><span class="typwiki-missing-link">${escapeHtml(id)}</span></li>`;
    return `<li><a href="${escapeHtml(pageHref(index.baseUrl, index.routing, page.id))}">${escapeHtml(page.title)}</a></li>`;
  });
  return `<h3 class="typwiki-link-list-title">${escapeHtml(title)}</h3><ul class="typwiki-link-list">${items.join("")}</ul>`;
}

/**
 * Finds pages related to a page by counting shared tags, most related first.
 *
 * @param index The site index to search.
 * @param pageId The current page id (excluded from the result).
 * @returns Pages sharing at least one tag, ordered by shared tag count
 *   descending then page id; `[]` for unknown or untagged pages.
 *
 * @example
 * findRelatedPages(
 *   index([page({ id: "a", tags: ["topic/x", "topic/y"] }), page({ id: "b", tags: ["topic/x"] })]),
 *   "a",
 * ).map((p) => p.id); // ["b"]
 */
export function findRelatedPages(index: SiteIndex, pageId: string): SitePage[] {
  const current = index.pages.find((page) => page.id === pageId);
  if (current === undefined || current.tags.length === 0) return [];
  const currentTags = new Set(current.tags);
  return index.pages
    .filter((page) => page.id !== pageId)
    .map((page) => ({ page, shared: page.tags.filter((tag) => currentTags.has(tag)).length }))
    .filter((entry) => entry.shared > 0)
    .sort((left, right) => right.shared - left.shared || left.page.id.localeCompare(right.page.id))
    .map((entry) => entry.page);
}

/**
 * Renders the full relations panel (properties, tags, outgoing links,
 * backlinks, and related pages) for a page.
 *
 * @param index The site index to draw from.
 * @param pageId The current page id.
 * @returns The concatenated region HTML, or `""` for an unknown page.
 *
 * @example
 * renderRelationsPanel(index([page({ id: "a", tags: ["topic/x"] })]), "a");
 * // '<ul class="typwiki-properties">...<ul class="typwiki-page-tags">...'
 */
export function renderRelationsPanel(index: SiteIndex, pageId: string): string {
  const page = index.pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) return "";
  const parts: string[] = [renderProperties(page), renderPageTags(page)];
  parts.push(renderPageLinkList("Outgoing links", page.outgoing, index));
  parts.push(renderPageLinkList("Backlinks", page.backlinks, index));
  const related = findRelatedPages(index, pageId);
  if (related.length > 0) parts.push(renderPageLinkList("Related pages", related.map((item) => item.id), index));
  return parts.join("");
}

/**
 * Renders the header region: the site identity and the navigation tree.
 *
 * @param index The site index used to resolve links.
 * @param currentPageId The active page id; navigation is omitted when
 *   undefined (for example on pages rendered outside the site graph).
 * @returns The header inner HTML.
 *
 * @example
 * renderHeader(index([page({ id: "home", title: "Home" })]), "home");
 * // '<p class="typwiki-site-identity"><a href="/">Typwiki</a></p><nav data-typwiki-region="navigation"><ul>...'
 */
export function renderHeader(index: SiteIndex, currentPageId?: string): string {
  const identity = `<p class="typwiki-site-identity"><a href="${escapeHtml(siteHref(index.baseUrl))}">Typwiki</a></p>`;
  const navigation =
    currentPageId === undefined ? "" : `<nav data-typwiki-region="navigation">${renderNavigation(index, currentPageId)}</nav>`;
  return `${identity}${navigation}`;
}

/**
 * Renders the navigation panel (navigation tree, tag cloud, recent pages) used
 * in sidebars.
 *
 * @param index The site index to draw from.
 * @param currentPageId The active page id.
 * @returns The concatenated region HTML.
 *
 * @example
 * renderNavigationPanel(index([page({ id: "home", title: "Home" })]), "home");
 * // '<ul><li><a href="/p/home/" ...>Home</a></li></ul>'
 */
export function renderNavigationPanel(index: SiteIndex, currentPageId: string): string {
  const parts: string[] = [renderNavigation(index, currentPageId), renderTagCloud(index), renderRecentPages(index, 5)];
  return parts.join("");
}

/**
 * Renders the footer region with site metadata. Kept minimal so themes and
 * forks can extend it; the region is always present for stable styling.
 *
 * @param _index The site index (reserved for future metadata output).
 * @returns The footer inner HTML.
 *
 * @example
 * renderFooter(index([])); // '<p>Generated by Typwiki.</p>'
 */
export function renderFooter(_index: SiteIndex): string {
  return "<p>Generated by Typwiki.</p>";
}

/**
 * Renders the article table of contents as nested `<ol>` lists. Deeper
 * headings become nested lists under their nearest shallower heading.
 *
 * @param headings The headings to render, in document order.
 * @returns A nested list whose links jump to `#<id>` anchors, or `""` when
 *   `headings` is empty.
 *
 * @example
 * renderTableOfContents([
 *   { level: 2, id: "intro", title: "Introduction" },
 *   { level: 3, id: "features", title: "Features" },
 *   { level: 2, id: "conclusion", title: "Conclusion" },
 * ]);
 * // '<ol><li><a href="#intro">Introduction</a><ol><li><a href="#features">Features</a></li></ol></li><li><a href="#conclusion">Conclusion</a></li></ol>'
 */
export function renderTableOfContents(headings: Heading[]): string {
  if (headings.length === 0) return "";
  return buildTocList(headings);
}

function buildTocList(headings: Heading[]): string {
  let html = "";
  let i = 0;
  while (i < headings.length) {
    const heading = headings[i];
    html += `<li><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.title)}</a>`;
    let k = i + 1;
    const deeper: Heading[] = [];
    while (k < headings.length && headings[k].level > heading.level) {
      deeper.push(headings[k]);
      k += 1;
    }
    if (deeper.length > 0) html += buildTocList(deeper);
    html += "</li>";
    i = k;
  }
  return `<ol>${html}</ol>`;
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
 * const { headings, body } = extractHeadings("<h2>Intro</h2><p>x</p><h2>Intro</h2>");
 * headings; // [{ level: 2, id: "intro", title: "Intro" }, { level: 2, id: "intro-2", title: "Intro" }]
 * body;     // '<h2 id="intro">Intro</h2><p>x</p><h2 id="intro-2">Intro</h2>'
 */
export function extractHeadings(body: string): { headings: Heading[]; body: string } {
  const headings: Heading[] = [];
  const usedIds = new Set<string>();
  const updated = body.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attrs, inner) => {
    const title = textContent(inner).trim();
    if (title === "") return full;
    const existing = findAttribute(attrs, "id");
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
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(attrs);
  return match?.[1];
}

function textContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export interface DocumentShellOptions {
  /** The site index used to render navigation, breadcrumbs, and relations. */
  index: SiteIndex;
  /** The canonical document title, shown in `<title>` and the header. */
  title: string;
  /** The article inner HTML placed inside `<article class="typwiki-article">`. */
  content: string;
  /** The theme stylesheet href mounted in `<head>`. */
  stylesheet: string;
  /** When set, the page is treated as a site page and gains navigation,
   * breadcrumbs, and relations regions. */
  currentPageId?: string;
  /** Extra `<head>` content (e.g. Typst-generated styles) appended verbatim. */
  head?: string;
  /** Article headings used to populate the table of contents region. */
  headings?: Heading[];
}

/**
 * Wraps page content in a standalone, deterministic HTML document following the
 * stable shell contract: semantic landmarks, stable `data-typwiki-region`
 * hooks, a skip link, and `id="typwiki-main"` for keyboard navigation.
 *
 * @param options The shell inputs described by {@link DocumentShellOptions}.
 * @returns A complete `<!doctype html>` document.
 *
 * @example
 * renderDocumentShell({
 *   index: index([]),
 *   title: "Test Page",
 *   content: "<p>Hello</p>",
 *   stylesheet: "/assets/themes/academic-paper/theme.css",
 * });
 * // '<!doctype html>...<title>Test Page · Typwiki</title>...'
 */
export function renderDocumentShell(options: DocumentShellOptions): string {
  const { index, title, content, stylesheet, currentPageId, head, headings } = options;
  const isPage = currentPageId !== undefined;
  const breadcrumbs = isPage ? renderBreadcrumbs(index, currentPageId!) : "";
  const relations = isPage ? renderRelationsPanel(index, currentPageId!) : "";
  const toc = headings === undefined || headings.length === 0 ? "" : renderTableOfContents(headings);
  const articleId = isPage ? ` data-page-id="${escapeHtml(currentPageId!)}"` : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Typwiki</title>
${head ?? ""}<link rel="stylesheet" href="${escapeHtml(stylesheet)}">
</head>
<body>
<a class="typwiki-skip-link" href="#typwiki-main">Skip to content</a>
<header data-typwiki-region="header">${renderHeader(index, currentPageId)}</header>
${breadcrumbs === "" ? "" : `<nav class="typwiki-breadcrumbs" aria-label="Breadcrumbs">${breadcrumbs}</nav>`}
<main id="typwiki-main" data-typwiki-region="main">
<aside data-typwiki-region="toc">${toc}</aside>
<article class="typwiki-article"${articleId}>${content}</article>
<aside data-typwiki-region="footnotes"></aside>
</main>
<section data-typwiki-region="relations">${relations}</section>
<footer data-typwiki-region="footer">${renderFooter(index)}</footer>
</body>
</html>`;
}
