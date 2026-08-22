import { describe, expect, it } from 'vitest';
import { buildSearchIndex, extractText, type SearchIndex, type SearchIndexPage } from '../src/build/search-index.js';
import { filterSearch } from '../src/components/Search.js';
import type { SiteIndex } from '../src/model.js';

const page = (partial: Partial<SearchIndexPage>): SearchIndexPage => ({
  id: 'page',
  title: 'Page',
  href: '/p/page/',
  tags: [],
  text: '',
  ...partial,
});

const index = (pages: SearchIndexPage[] = []): SearchIndex => ({ version: 1, baseUrl: '', pages });

describe('extractText', () => {
  it('strips HTML, decodes entities, and collapses whitespace', () => {
    expect(extractText('<p>Hello <em>world</em> &amp; friends</p>')).toBe('hello world & friends');
  });

  it('lowercases the result', () => {
    expect(extractText('Typst is <b>Great</b>')).toBe('typst is great');
  });
});

describe('buildSearchIndex', () => {
  it('maps site pages to search entries with resolved hrefs', () => {
    const site: SiteIndex = {
      version: 3,
      baseUrl: '/typwiki',
      routing: { pagePrefix: '/p', reservedPaths: [] },
      pages: [
        {
          file: 'pages/home.typ',
          id: 'home',
          title: 'Home',
          tagTable: false,
          linkTable: false,
          outgoing: [],
          tags: ['topic/x'],
          backlinks: [],
        },
      ],
      tags: {},
    };
    expect(buildSearchIndex(site, { home: 'welcome text' })).toEqual({
      version: 1,
      baseUrl: '/typwiki',
      pages: [{ id: 'home', title: 'Home', href: '/typwiki/p/home/', tags: ['topic/x'], text: 'welcome text' }],
    });
  });
});

describe('filterSearch', () => {
  it('returns nothing for an empty query or null index', () => {
    expect(filterSearch(null, 'x')).toEqual([]);
    expect(filterSearch(index(), '')).toEqual([]);
    expect(filterSearch(index(), '   ')).toEqual([]);
  });

  it('matches by title, tags, and body text', () => {
    const site = index([
      page({ id: 'a', title: 'Linear Algebra', text: 'vectors and matrices' }),
      page({ id: 'b', title: 'Calculus', tags: ['topic/math'], text: 'derivatives' }),
      page({ id: 'c', title: 'History', text: 'the fall of rome' }),
    ]);
    expect(filterSearch(site, 'algebra').map((p) => p.id)).toEqual(['a']);
    expect(filterSearch(site, 'topic/math').map((p) => p.id)).toEqual(['b']);
    expect(filterSearch(site, 'derivatives').map((p) => p.id)).toEqual(['b']);
  });

  it('ranks title matches before tag matches before body matches', () => {
    const site = index([
      page({ id: 'body', title: 'Notes', text: 'contains typst here' }),
      page({ id: 'tag', title: 'Misc', tags: ['typst'], text: '' }),
      page({ id: 'title', title: 'Typst Guide', text: '' }),
    ]);
    expect(filterSearch(site, 'typst').map((p) => p.id)).toEqual(['title', 'tag', 'body']);
  });

  it('caps results at MAX_RESULTS', () => {
    const pages = Array.from({ length: 12 }, (_, n) => page({ id: `p${n}`, title: `Common ${n}`, text: 'shared' }));
    expect(filterSearch(index(pages), 'common')).toHaveLength(8);
  });
});
