// Search.tsx
// Client-side page search. It fetches the static search index built during the
// build (`assets/search-index.json`) and filters pages by title, tags, and
// article text. Results are plain links, so this works on any static host.

import { useEffect, useMemo, useState } from 'react';
import type { SearchIndex, SearchIndexPage } from '../build/search-index.js';

export interface SearchProps {
  /** The deployment base URL used to locate `assets/search-index.json`. */
  baseUrl: string;
}

const MAX_RESULTS = 8;

/**
 * Filters the search index for a query across title, tags, and body text.
 * Order: title matches first, then tag matches, then body text matches.
 */
export function filterSearch(index: SearchIndex | null, query: string): SearchIndexPage[] {
  const needle = query.trim().toLowerCase();
  if (index === null || needle === '') return [];
  const pages = index.pages.filter(
    (page) => page.title.toLowerCase().includes(needle) || page.tags.join(' ').toLowerCase().includes(needle) || page.text.includes(needle),
  );
  pages.sort((left, right) => {
    const leftTitle = left.title.toLowerCase().includes(needle);
    const rightTitle = right.title.toLowerCase().includes(needle);
    if (leftTitle !== rightTitle) return leftTitle ? -1 : 1;
    const leftTag = left.tags.join(' ').toLowerCase().includes(needle);
    const rightTag = right.tags.join(' ').toLowerCase().includes(needle);
    if (leftTag !== rightTag) return leftTag ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
  return pages.slice(0, MAX_RESULTS);
}

export function Search({ baseUrl }: SearchProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${baseUrl}/assets/search-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`search index request failed: ${response.status}`);
        return response.json();
      })
      .then((data: SearchIndex) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        // Keep the widget inert if the index is missing (e.g. a partial build).
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const results = useMemo(() => filterSearch(index, query), [index, query]);

  return (
    <search className="typwiki-search">
      <label className="typwiki-search-label" htmlFor="typwiki-search-input">
        Search
      </label>
      <input
        id="typwiki-search-input"
        className="typwiki-search-input"
        type="search"
        placeholder="Search pages…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-controls="typwiki-search-results"
        autoComplete="off"
      />
      {results.length > 0 ? (
        <ul className="typwiki-search-results" id="typwiki-search-results">
          {results.map((result) => (
            <li key={result.id}>
              <a href={result.href} className="typwiki-search-result">
                <span className="typwiki-search-result-title">{result.title}</span>
                {result.tags.length > 0 ? <span className="typwiki-search-result-tags">{result.tags.join(', ')}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </search>
  );
}
