// Navigation.tsx
// Renders the header navigation: either the user-configured `navigation` list
// (ordered, flat) or an automatic slash-separated tree of every page. The
// current page's link is marked with `aria-current="page"` and `is-active`.

import { pageHref } from '../build/links.js';
import type { NavigationEntry, SiteIndex, SitePage } from '../model.js';

/** A node in the slash-separated navigation tree. */
export interface NavNode {
  /** The page that terminates at this node, if any (intermediate segments have none). */
  page?: SitePage;
  /** Child nodes keyed by the next path segment. */
  children: Map<string, NavNode>;
}

/**
 * Groups pages into a navigation tree by slash-separated ID segments.
 *
 * @param pages The site's pages, each with a slash-separated id.
 * @returns A tree root whose `children` map walks each segment; the deepest node
 *   for a page carries that page in its `page` field.
 */
export function buildNavigationTree(pages: SitePage[]): NavNode {
  const root: NavNode = { children: new Map() };
  for (const page of pages) {
    let node = root;
    for (const segment of page.id.split('/')) {
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

export interface NavigationProps {
  index: SiteIndex;
  currentPageId: string;
}

/**
 * Renders the header navigation. When the index carries a user-configured
 * `navigation` list, that list is rendered verbatim (ordered, flat); otherwise
 * every page is rendered as a slash-separated tree.
 */
export function Navigation({ index, currentPageId }: NavigationProps) {
  if (index.navigation !== undefined) {
    return <ConfiguredNavigation entries={index.navigation} index={index} currentPageId={currentPageId} />;
  }
  return <TreeNavigation node={buildNavigationTree(index.pages)} index={index} currentPageId={currentPageId} />;
}

function TreeNavigation({ node, index, currentPageId }: { node: NavNode; index: SiteIndex; currentPageId: string }) {
  const items = [...node.children.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([segment, child]) => {
      if (child.page === undefined) {
        return (
          <li key={segment}>
            <span className="typwiki-nav-group">{segment}</span>
            <ul>
              <TreeNavigation node={child} index={index} currentPageId={currentPageId} />
            </ul>
          </li>
        );
      }
      const active = child.page.id === currentPageId;
      return (
        <li key={segment}>
          <a
            href={pageHref(index.baseUrl, index.routing, child.page.id)}
            className={active ? 'typwiki-nav-link is-active' : 'typwiki-nav-link'}
            aria-current={active ? 'page' : undefined}
          >
            {child.page.title}
          </a>
        </li>
      );
    });
  return <ul>{items}</ul>;
}

function ConfiguredNavigation({ entries, index, currentPageId }: { entries: NavigationEntry[]; index: SiteIndex; currentPageId: string }) {
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  const items = entries.map((entry, position) => {
    // The navigation list is static and rendered once per build, so the entry
    // index is a stable, unique key within this list.
    const key = `${entry.id ?? entry.href ?? 'entry'}-${position}`;
    if (entry.id !== undefined) {
      const page = byId.get(entry.id);
      const active = entry.id === currentPageId;
      const label = entry.label ?? page?.title ?? entry.id;
      const href = page === undefined ? '#' : pageHref(index.baseUrl, index.routing, entry.id);
      const missing = page === undefined ? ' typwiki-missing-link' : '';
      return (
        <li key={key}>
          <a href={href} className={`typwiki-nav-link${active ? ' is-active' : ''}${missing}`} aria-current={active ? 'page' : undefined}>
            {label}
          </a>
        </li>
      );
    }
    const label = entry.label ?? entry.href ?? '';
    const external = /^https?:\/\//i.test(entry.href ?? '');
    return (
      <li key={key}>
        <a
          href={entry.href ?? '#'}
          className="typwiki-nav-link"
          rel={external ? 'noopener noreferrer' : undefined}
          target={external ? '_blank' : undefined}
        >
          {label}
        </a>
      </li>
    );
  });
  return <ul>{items}</ul>;
}
