// RelationsPanel.tsx
// Renders the relations region: page properties, tags, outgoing links,
// backlinks, and related pages. It is controlled by the authored page flags
// (`tagTable` / `linkTable`), so a section is omitted when its data is empty.

import { pageHref } from '../build/links.js';
import type { SiteIndex, SitePage } from '../model.js';

export interface RelationsPanelProps {
  index: SiteIndex;
  pageId: string;
  /** Whether the authored page opted into the tag section. */
  showTags?: boolean;
  /** Whether the authored page opted into the link sections. */
  showLinks?: boolean;
}

export function RelationsPanel({ index, pageId, showTags = true, showLinks = true }: RelationsPanelProps) {
  const page = index.pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) return null;

  const parts: React.ReactNode[] = [];
  parts.push(<Properties key="properties" page={page} />);
  if (showTags) parts.push(<PageTags key="tags" page={page} />);
  if (showLinks) {
    parts.push(<PageLinkList key="outgoing" title="Outgoing links" ids={page.outgoing} index={index} />);
    parts.push(<PageLinkList key="backlinks" title="Backlinks" ids={page.backlinks} index={index} />);
  }
  const related = findRelatedPages(index, pageId);
  if (related.length > 0)
    parts.push(<PageLinkList key="related" title="Related pages" ids={related.map((item) => item.id)} index={index} />);

  return <>{parts}</>;
}

/** Renders a page's id and modification date as property rows. */
export function Properties({ page }: { page: SitePage }) {
  const date = formatModifiedDate(page);
  const dateRow =
    date === null ? null : (
      <li>
        <span>Modified</span>
        <time dateTime={date}>{date}</time>
      </li>
    );
  return (
    <ul className="typwiki-properties">
      <li>
        <span>Page ID</span>
        <code>{page.id}</code>
      </li>
      {dateRow}
    </ul>
  );
}

/**
 * Formats a page's modification timestamp as an ISO calendar date.
 * @returns A `YYYY-MM-DD` string, or `null` when the page has no timestamp.
 */
export function formatModifiedDate(page: SitePage): string | null {
  if (page.modifiedAt === undefined) return null;
  return new Date(page.modifiedAt).toISOString().slice(0, 10);
}

/** Renders a page's tags as a chip list. */
export function PageTags({ page }: { page: SitePage }) {
  if (page.tags.length === 0) return null;
  return (
    <ul className="typwiki-page-tags">
      {page.tags.map((tag) => (
        <li key={tag}>
          <span className="typwiki-tag">{tag}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders a titled list of page links. Known targets link to their pages;
 * unknown targets degrade to a muted span instead of a broken link.
 */
export function PageLinkList({ title, ids, index }: { title: string; ids: string[]; index: SiteIndex }) {
  if (ids.length === 0) return null;
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  return (
    <>
      <h3 className="typwiki-link-list-title">{title}</h3>
      <ul className="typwiki-link-list">
        {ids.map((id) => {
          const page = byId.get(id);
          if (page === undefined) {
            return (
              <li key={id}>
                <span className="typwiki-missing-link">{id}</span>
              </li>
            );
          }
          return (
            <li key={id}>
              <a href={pageHref(index.baseUrl, index.routing, page.id)}>{page.title}</a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Finds pages related to a page by counting shared tags, most related first.
 * @returns Pages sharing at least one tag, ordered by shared tag count descending
 *   then page id; `[]` for unknown or untagged pages.
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
