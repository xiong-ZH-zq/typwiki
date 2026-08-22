// TableOfContents.tsx
// Renders the article table of contents as nested `<ol>` lists. Deeper headings
// become nested lists under their nearest shallower heading.

import type { Heading } from '../build/article.js';

export interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) return null;
  return <TocList headings={headings} />;
}

function TocList({ headings }: { headings: Heading[] }) {
  const items: React.ReactNode[] = [];
  let i = 0;
  while (i < headings.length) {
    const heading = headings[i];
    let k = i + 1;
    const deeper: Heading[] = [];
    while (k < headings.length && headings[k].level > heading.level) {
      deeper.push(headings[k]);
      k += 1;
    }
    items.push(
      <li key={heading.id}>
        <a href={`#${heading.id}`}>{heading.title}</a>
        {deeper.length > 0 ? <TocList headings={deeper} /> : null}
      </li>,
    );
    i = k;
  }
  return <ol>{items}</ol>;
}
