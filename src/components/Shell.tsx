// Shell.tsx
// The deterministic body shell for an article page. It consumes prepared data
// only (never reads files, never runs Typst, never mutates the graph) and
// renders stable semantic landmarks: a skip link, a header, breadcrumbs, a main
// region (TOC + article + footnotes), the relations section, and a footer.
//
// The `<head>` and the `<!doctype html>` wrapper are assembled by the build
// pipeline (`render-site.tsx`); this component renders only the `<body>` inner
// content inside `#typwiki-root`, which is also the client hydration target.

import type { Heading } from '../build/article.js';
import type { SiteIndex } from '../model.js';
import { Breadcrumbs } from './Breadcrumbs.js';
import { Footer } from './Footer.js';
import { Header } from './Header.js';
import { RelationsPanel } from './RelationsPanel.js';
import { TableOfContents } from './TableOfContents.js';

export interface ShellProps {
  /** The site index used to render navigation, breadcrumbs, and relations. */
  index: SiteIndex;
  /** The article inner HTML placed inside `<article class="typwiki-article">`. */
  content: string;
  /** When set, the page is treated as a site page and gains navigation,
   * breadcrumbs, and relations regions. */
  currentPageId?: string;
  /** Article headings used to populate the table of contents region. */
  headings?: Heading[];
  /** Whether the authored page opted into the relations sections. */
  tagTable?: boolean;
  linkTable?: boolean;
}

export function Shell({ index, content, currentPageId, headings, tagTable, linkTable }: ShellProps) {
  const isPage = currentPageId !== undefined;
  const breadcrumbs = isPage ? <Breadcrumbs index={index} pageId={currentPageId} /> : null;
  const relations = isPage ? <RelationsPanel index={index} pageId={currentPageId} showTags={tagTable} showLinks={linkTable} /> : null;
  const toc = headings === undefined || headings.length === 0 ? null : <TableOfContents headings={headings} />;
  const articleId = isPage ? currentPageId : undefined;

  return (
    <div id="typwiki-root">
      <a className="typwiki-skip-link" href="#typwiki-main">
        Skip to content
      </a>
      <header data-typwiki-region="header">
        <Header index={index} currentPageId={currentPageId} />
      </header>
      {isPage ? (
        <nav className="typwiki-breadcrumbs" aria-label="Breadcrumbs">
          {breadcrumbs}
        </nav>
      ) : null}
      <main id="typwiki-main" data-typwiki-region="main">
        <aside data-typwiki-region="toc">{toc}</aside>
        <article
          className="typwiki-article"
          data-page-id={articleId}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: the article body is Typst-rendered and injected verbatim by design.
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <aside data-typwiki-region="footnotes" />
      </main>
      <section data-typwiki-region="relations">{relations}</section>
      <footer data-typwiki-region="footer">
        <Footer index={index} />
      </footer>
    </div>
  );
}
