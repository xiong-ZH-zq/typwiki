// entry.tsx
// Client-side hydration entry. Reads the page data embedded by the build
// pipeline (`#typwiki-data`), then hydrates the same React shell that was
// server-rendered into `#typwiki-root`. Interactive regions (search, theme
// toggle) mount on top of this in later milestones.

import { hydrateRoot } from 'react-dom/client';
import type { PageData } from '../build/render-site.js';
import { HomePage } from '../components/HomePage.js';
import { Shell } from '../components/Shell.js';

function readPageData(): PageData | undefined {
  const element = document.getElementById('typwiki-data');
  if (element === null) return undefined;
  try {
    return JSON.parse(element.textContent ?? '') as PageData;
  } catch {
    return undefined;
  }
}

function hydrate(): void {
  const container = document.getElementById('typwiki-root');
  if (container === null) return;
  const data = readPageData();
  if (data === undefined) return;
  if (data.pageId === undefined) {
    hydrateRoot(container, <HomePage index={data.index} />);
  } else {
    hydrateRoot(
      container,
      <Shell
        index={data.index}
        content={data.content}
        currentPageId={data.pageId}
        headings={data.headings}
        tagTable={data.tagTable}
        linkTable={data.linkTable}
      />,
    );
  }
}

hydrate();
