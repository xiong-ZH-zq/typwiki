// Breadcrumbs.tsx
// Renders a breadcrumb trail for a page id. Existing ancestor pages are linked;
// intermediate segments that have no page become plain text.

import { pageHref, siteHref } from '../build/links.js';
import type { SiteIndex } from '../model.js';

export interface BreadcrumbsProps {
  index: SiteIndex;
  pageId: string;
}

export function Breadcrumbs({ index, pageId }: BreadcrumbsProps) {
  const segments = pageId.split('/');
  const byId = new Map(index.pages.map((page) => [page.id, page]));
  const items: React.ReactNode[] = [
    <li key="home">
      <a href={siteHref(index.baseUrl)}>Home</a>
    </li>,
  ];
  const accumulated: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    accumulated.push(segments[i]);
    const path = accumulated.join('/');
    const page = byId.get(path);
    if (i === segments.length - 1) {
      items.push(
        <li key={path} aria-current="page">
          {page?.title ?? segments[i]}
        </li>,
      );
    } else if (page !== undefined) {
      items.push(
        <li key={path}>
          <a href={pageHref(index.baseUrl, index.routing, page.id)}>{page.title}</a>
        </li>,
      );
    } else {
      items.push(<li key={path}>{segments[i]}</li>);
    }
  }
  return <ol className="typwiki-breadcrumbs">{items}</ol>;
}
