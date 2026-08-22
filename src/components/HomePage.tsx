// HomePage.tsx
// Renders the generated site homepage: a directory listing of every page. Used
// only when no authored page is configured as the root homepage.

import { pageHref } from '../build/links.js';
import type { SiteIndex } from '../model.js';

export interface HomePageProps {
  index: Pick<SiteIndex, 'baseUrl' | 'routing' | 'pages'>;
}

export function HomePage({ index }: HomePageProps) {
  return (
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
  );
}
