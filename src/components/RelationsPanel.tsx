// RelationsPanel.tsx
// Renders the relations region as four stable columns — Properties (Page ID),
// Tags, Backlinks, and Outlinks — each with its title on top and content
// below. It is controlled by the authored page flags (`tagTable` /
// `linkTable`); a column whose data is empty keeps its title and shows a
// "None" placeholder so the four-column layout stays stable.

import { pageHref } from '../build/links.js';
import type { SiteIndex, SitePage } from '../model.js';

export interface RelationsPanelProps {
  index: SiteIndex;
  pageId: string;
  /** Whether the authored page opted into the tag column. */
  showTags?: boolean;
  /** Whether the authored page opted into the link columns. */
  showLinks?: boolean;
}

export function RelationsPanel({ index, pageId, showTags = true, showLinks = true }: RelationsPanelProps) {
  const page = index.pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) return null;

  return (
    <>
      <RelationsColumn title="Properties">
        <Properties page={page} />
      </RelationsColumn>
      {showTags ? (
        <RelationsColumn title="Tags">
          <PageTags page={page} />
        </RelationsColumn>
      ) : null}
      {showLinks ? (
        <RelationsColumn title="Backlinks">
          <PageLinkList ids={page.backlinks} index={index} />
        </RelationsColumn>
      ) : null}
      {showLinks ? (
        <RelationsColumn title="Outlinks">
          <PageLinkList ids={page.outgoing} index={index} />
        </RelationsColumn>
      ) : null}
    </>
  );
}

/** Wraps a relations column so the title and content share one grid cell. */
function RelationsColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="typwiki-relations-column">
      <h3 className="typwiki-link-list-title">{title}</h3>
      {children}
    </section>
  );
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

/** Renders a page's tags as a chip list, or a "None" placeholder. */
export function PageTags({ page }: { page: SitePage }) {
  if (page.tags.length === 0) return <NonePlaceholder />;
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
 * Renders a list of page links. Known targets link to their pages; unknown
 * targets degrade to a muted span instead of a broken link. An empty list
 * renders a "None" placeholder so the parent column stays stable.
 */
export function PageLinkList({ ids, index }: { ids: string[]; index: SiteIndex }) {
  if (ids.length === 0) return <NonePlaceholder />;
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  return (
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
  );
}

/** Muted "None" placeholder for an empty relations column. */
function NonePlaceholder() {
  return <p className="typwiki-relations-none">None</p>;
}
