import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { extractHeadings, type Heading, slugify } from '../src/build/article.js';
import { escapeHtml } from '../src/build/html.js';
import { siteHref } from '../src/build/links.js';
import { Breadcrumbs } from '../src/components/Breadcrumbs.js';
import { Footer } from '../src/components/Footer.js';
import { Header } from '../src/components/Header.js';
import { buildNavigationTree, Navigation, type NavNode } from '../src/components/Navigation.js';
import {
  findRelatedPages,
  formatModifiedDate,
  PageLinkList,
  PageTags,
  Properties,
  RelationsPanel,
} from '../src/components/RelationsPanel.js';
import { Shell } from '../src/components/Shell.js';
import { TableOfContents } from '../src/components/TableOfContents.js';
import type { NavigationEntry, SiteIndex, SitePage } from '../src/model.js';

const page = (partial: Partial<SitePage>): SitePage => ({
  file: `${partial.id ?? 'page'}.typ`,
  id: partial.id ?? 'page',
  title: partial.title ?? partial.id ?? 'Page',
  tagTable: false,
  linkTable: false,
  outgoing: [],
  tags: [],
  backlinks: [],
  ...partial,
});

const index = (pages: SitePage[], tags: Record<string, string[]> = {}, navigation?: NavigationEntry[]): SiteIndex => ({
  version: 3,
  baseUrl: '',
  routing: { pagePrefix: '/p', reservedPaths: [] },
  pages,
  tags,
  ...(navigation === undefined ? {} : { navigation }),
});

describe('escapeHtml', () => {
  it('escapes text and attribute metacharacters', () => {
    expect(escapeHtml(`A <b> & "c"`)).toBe('A &lt;b&gt; &amp; &quot;c&quot;');
  });
});

describe('siteHref', () => {
  it('maps the deployment base URL to the site root', () => {
    expect(siteHref('')).toBe('/');
    expect(siteHref('/typwiki')).toBe('/typwiki/');
  });
});

describe('buildNavigationTree', () => {
  it('groups pages by slash-separated ID segments', () => {
    const tree = buildNavigationTree([page({ id: 'math/matrices' }), page({ id: 'math/linear-algebra' }), page({ id: 'home' })]);

    expect([...tree.children.keys()].sort()).toEqual(['home', 'math']);
    const mathNode = tree.children.get('math');
    expect(mathNode).toBeDefined();
    expect([...(mathNode as NavNode).children.keys()].sort()).toEqual(['linear-algebra', 'matrices']);
    expect((mathNode as NavNode).page).toBeUndefined();
  });
});

describe('Navigation', () => {
  it('links pages, labels groups, and marks the current page', () => {
    const html = renderToStaticMarkup(
      <Navigation
        index={index([page({ id: 'math/linear-algebra', title: 'Linear Algebra' }), page({ id: 'home', title: 'Home' })])}
        currentPageId="math/linear-algebra"
      />,
    );

    expect(html).toContain('<a href="/p/home/" class="typwiki-nav-link">Home</a>');
    expect(html).toContain('<span class="typwiki-nav-group">math</span>');
    expect(html).toContain('<a href="/p/math/linear-algebra/" class="typwiki-nav-link is-active" aria-current="page">Linear Algebra</a>');
  });

  it('renders a configured navigation list verbatim in order', () => {
    const html = renderToStaticMarkup(
      <Navigation
        index={index([page({ id: 'home', title: 'Home' })], {}, [
          { id: 'home', label: 'Start' },
          { href: 'https://github.com/xzqbear/typwiki', label: 'GitHub' },
        ])}
        currentPageId="home"
      />,
    );

    expect(html).toContain('<a href="/p/home/" class="typwiki-nav-link is-active" aria-current="page">Start</a>');
    expect(html).toContain(
      '<a href="https://github.com/xzqbear/typwiki" class="typwiki-nav-link" rel="noopener noreferrer" target="_blank">GitHub</a>',
    );
  });

  it('degrades a configured navigation id without a matching page to a missing link', () => {
    const html = renderToStaticMarkup(<Navigation index={index([], {}, [{ id: 'ghost', label: 'Ghost' }])} currentPageId="home" />);
    expect(html).toContain('href="#"');
    expect(html).toContain('typwiki-missing-link');
    expect(html).toContain('Ghost');
  });

  it('returns an empty list when navigation is configured empty', () => {
    const html = renderToStaticMarkup(<Navigation index={index([page({ id: 'home', title: 'Home' })], {}, [])} currentPageId="home" />);
    expect(html).toBe('<ul></ul>');
  });
});

describe('Breadcrumbs', () => {
  it('links existing ancestors and prints missing segments as text', () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs index={index([page({ id: 'math', title: 'Mathematics' })])} pageId="math/linear-algebra" />,
    );
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/p/math/">Mathematics</a>');
    expect(html).toContain('<li aria-current="page">linear-algebra</li>');
  });

  it('does not link intermediate segments that have no page', () => {
    const html = renderToStaticMarkup(<Breadcrumbs index={index([])} pageId="a/b/c" />);
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<li>b</li>');
    expect(html).toContain('<li aria-current="page">c</li>');
  });
});

describe('Properties', () => {
  it('shows the page ID and modification date', () => {
    const html = renderToStaticMarkup(<Properties page={page({ id: 'note', modifiedAt: Date.UTC(2026, 7, 20) })} />);
    expect(html).toContain('<span>Page ID</span>');
    expect(html).toContain('<code>note</code>');
    expect(html).toContain('<span>Modified</span>');
    expect(html).toContain('<time dateTime="2026-08-20">2026-08-20</time>');
  });
});

describe('PageTags', () => {
  it('renders page tags as chips and hides the empty section', () => {
    const html = renderToStaticMarkup(<PageTags page={page({ id: 'note', tags: ['topic/math'] })} />);
    expect(html).toContain('<span class="typwiki-tag">topic/math</span>');
    expect(renderToStaticMarkup(<PageTags page={page({ id: 'note', tags: [] })} />)).toBe('');
  });
});

describe('PageLinkList', () => {
  it('links known targets and degrades unknown targets to text', () => {
    const html = renderToStaticMarkup(
      <PageLinkList title="Backlinks" ids={['known', 'missing']} index={index([page({ id: 'known', title: 'Known' })])} />,
    );
    expect(html).toContain('<h3 class="typwiki-link-list-title">Backlinks</h3>');
    expect(html).toContain('<a href="/p/known/">Known</a>');
    expect(html).toContain('<span class="typwiki-missing-link">missing</span>');
  });

  it('renders nothing for an empty list', () => {
    expect(renderToStaticMarkup(<PageLinkList title="Backlinks" ids={[]} index={index([])} />)).toBe('');
  });
});

describe('findRelatedPages', () => {
  it('orders pages by shared tag count and excludes the current page', () => {
    const site = index([
      page({ id: 'a', tags: ['topic/x', 'topic/y'] }),
      page({ id: 'b', tags: ['topic/x'] }),
      page({ id: 'c', tags: ['topic/z'] }),
    ]);
    expect(findRelatedPages(site, 'a').map((p) => p.id)).toEqual(['b']);
  });

  it('returns nothing for pages without tags', () => {
    expect(findRelatedPages(index([page({ id: 'a', tags: [] })]), 'a')).toEqual([]);
  });
});

describe('RelationsPanel', () => {
  it('renders properties, tags, links, and related pages for a known page', () => {
    const site = index([page({ id: 'a', tags: ['topic/x'], outgoing: ['b'], backlinks: ['b'] }), page({ id: 'b', tags: ['topic/x'] })]);
    const html = renderToStaticMarkup(<RelationsPanel index={site} pageId="a" />);
    expect(html).toContain('Page ID');
    expect(html).toContain('topic/x');
    expect(html).toContain('Outgoing links');
    expect(html).toContain('Backlinks');
    expect(html).toContain('Related pages');
  });

  it('renders nothing for an unknown page', () => {
    expect(renderToStaticMarkup(<RelationsPanel index={index([page({ id: 'a' })])} pageId="missing" />)).toBe('');
  });
});

describe('formatModifiedDate', () => {
  it('formats a timestamp as an ISO calendar date', () => {
    expect(formatModifiedDate(page({ id: 'x', modifiedAt: Date.UTC(2026, 7, 20) }))).toBe('2026-08-20');
    expect(formatModifiedDate(page({ id: 'x' }))).toBeNull();
  });
});

describe('Header', () => {
  it('renders site identity and navigation for a page', () => {
    const html = renderToStaticMarkup(<Header index={index([page({ id: 'home', title: 'Home' })])} currentPageId="home" />);
    expect(html).toContain('<p class="typwiki-site-identity"><a href="/">Typwiki</a></p>');
    expect(html).toContain('data-typwiki-region="navigation"');
    expect(html).toContain('Home');
  });

  it('renders only the identity without a current page', () => {
    const html = renderToStaticMarkup(<Header index={index([])} />);
    expect(html).toContain('typwiki-site-identity');
    expect(html).not.toContain('data-typwiki-region="navigation"');
  });
});

describe('Footer', () => {
  it('renders a minimal site footer', () => {
    expect(renderToStaticMarkup(<Footer index={index([])} />)).toContain('Generated by Typwiki.');
  });
});

describe('slugify', () => {
  it('lowercases text and replaces separators with hyphens', () => {
    expect(slugify('Linear Algebra 2.0!')).toBe('linear-algebra-2-0');
    expect(slugify('  Overview  ')).toBe('overview');
  });

  it("preserves CJK characters and falls back to 'section' for blank input", () => {
    expect(slugify('你好，世界！')).toBe('你好-世界');
    expect(slugify('   ')).toBe('section');
  });
});

describe('extractHeadings', () => {
  it('extracts headings, injects unique anchor ids, and strips markup', () => {
    const { headings, body } = extractHeadings('<h2>Intro</h2><p>x</p><h2><code>Intro</code></h2>');
    expect(headings).toEqual([
      { level: 2, id: 'intro', title: 'Intro' },
      { level: 2, id: 'intro-2', title: 'Intro' },
    ]);
    expect(body).toBe('<h2 id="intro">Intro</h2><p>x</p><h2 id="intro-2"><code>Intro</code></h2>');
  });

  it('keeps an existing id attribute untouched', () => {
    const { headings, body } = extractHeadings('<h3 id="keep">Title</h3>');
    expect(headings).toEqual([{ level: 3, id: 'keep', title: 'Title' }]);
    expect(body).toBe('<h3 id="keep">Title</h3>');
  });

  it('leaves empty headings untouched and out of the result', () => {
    const { headings, body } = extractHeadings('<h2> </h2><h2 id="real">Real</h2>');
    expect(headings).toEqual([{ level: 2, id: 'real', title: 'Real' }]);
    expect(body).toBe('<h2> </h2><h2 id="real">Real</h2>');
  });
});

describe('TableOfContents', () => {
  it('renders nested lists and returns empty for no headings', () => {
    const headings: Heading[] = [
      { level: 2, id: 'intro', title: 'Introduction' },
      { level: 3, id: 'features', title: 'Features' },
      { level: 2, id: 'conclusion', title: 'Conclusion' },
    ];
    const html = renderToStaticMarkup(<TableOfContents headings={headings} />);
    expect(html).toContain('<a href="#intro">Introduction</a>');
    expect(html).toContain('<a href="#features">Features</a>');
    expect(html).toContain('<a href="#conclusion">Conclusion</a>');
    expect(html).toMatch(/<ol>.*<ol>.*<\/ol>.*<\/ol>/s);
    expect(renderToStaticMarkup(<TableOfContents headings={[]} />)).toBe('');
  });
});

describe('Shell', () => {
  it('wraps page content in the body shell with stable hooks', () => {
    const html = renderToStaticMarkup(
      <Shell index={index([page({ id: 'note', title: 'Note' })])} content="<p>Body</p>" currentPageId="note" />,
    );
    expect(html).toContain('data-typwiki-region="header"');
    expect(html).toContain('data-typwiki-region="main"');
    expect(html).toContain('data-typwiki-region="relations"');
    expect(html).toContain('data-typwiki-region="footer"');
    expect(html).toContain('<article class="typwiki-article" data-page-id="note"><p>Body</p></article>');
    expect(html).toContain('id="typwiki-main"');
  });

  it('renders breadcrumbs and relations only for pages', () => {
    const html = renderToStaticMarkup(<Shell index={index([page({ id: 'note', title: 'Note' })])} content="" currentPageId="note" />);
    expect(html).toContain('typwiki-breadcrumbs');
    expect(html).toContain('typwiki-properties');
    const home = renderToStaticMarkup(<Shell index={index([])} content="" />);
    expect(home).not.toContain('typwiki-breadcrumbs');
    expect(home).not.toContain('typwiki-properties');
  });

  it('fills the table of contents region when headings are provided', () => {
    const html = renderToStaticMarkup(
      <Shell
        index={index([page({ id: 'note', title: 'Note' })])}
        content=""
        currentPageId="note"
        headings={[{ level: 2, id: 'details', title: 'Details' }]}
      />,
    );
    expect(html).toContain('<a href="#details">Details</a>');
  });

  it('leaves the table of contents region empty without headings', () => {
    const html = renderToStaticMarkup(<Shell index={index([page({ id: 'note', title: 'Note' })])} content="" currentPageId="note" />);
    expect(html).toContain('<aside data-typwiki-region="toc"></aside>');
  });
});
