// Header.tsx
// Renders the header region: the site identity and the navigation tree. The
// navigation is omitted when no current page is set (for example on pages
// rendered outside the site graph).

import { siteHref } from '../build/links.js';
import type { SiteIndex } from '../model.js';
import { Navigation } from './Navigation.js';

export interface HeaderProps {
  index: SiteIndex;
  currentPageId?: string;
}

export function Header({ index, currentPageId }: HeaderProps) {
  return (
    <>
      <p className="typwiki-site-identity">
        <a href={siteHref(index.baseUrl)}>Typwiki</a>
      </p>
      {currentPageId === undefined ? null : (
        <nav data-typwiki-region="navigation">
          <Navigation index={index} currentPageId={currentPageId} />
        </nav>
      )}
    </>
  );
}
