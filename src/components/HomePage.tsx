// HomePage.tsx
// Renders the generated site homepage: a directory listing of every page. Used
// only when no authored page is configured as the root homepage. The header
// (identity, search, theme toggle) is included so the controls work on every
// page type.

import { pageHref } from '../build/links.js';
import type { SiteIndex } from '../model.js';
import { Header } from './Header.js';

export interface HomePageProps {
  index: SiteIndex;
}

export function HomePage({ index }: HomePageProps) {
  return (
    <>
      <header data-typwiki-region="header">
        <Header index={index} />
      </header>
      <main id="typwiki-main" data-typwiki-region="main">
        <article className="typwiki-article">
          <h1>Typwiki</h1>
          <ul>
            {index.pages.map((page) => (
              <li key={page.id}>
                <a href={pageHref(index.baseUrl, index.routing, page.id)}>{page.title}</a> <code>{page.id}</code>
              </li>
            ))}
          </ul>
        </article>
      </main>
    </>
  );
}
