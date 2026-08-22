import { describe, expect, it } from 'vitest';
import type { NavigationEntry, SiteIndex, SitePage } from '../src/model.js';
import {
  buildNavigationTree,
  escapeHtml,
  extractHeadings,
  findRelatedPages,
  formatModifiedDate,
  renderBreadcrumbs,
  renderDocumentShell,
  renderFooter,
  renderHeader,
  renderNavigation,
  renderNavigationPanel,
  renderPageLinkList,
  renderPageTags,
  renderProperties,
  renderRecentPages,
  renderRelationsPanel,
  renderTableOfContents,
  renderTagCloud,
  siteHref,
  slugify,
} from '../src/site-shell.js';

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
    expect([...mathNode!.children.keys()].sort()).toEqual(['linear-algebra', 'matrices']);
    expect(mathNode!.page).toBeUndefined();
  });
});

describe('renderNavigation', () => {
  it('links pages, labels groups, and marks the current page', () => {
    const html = renderNavigation(
      index([page({ id: 'math/linear-algebra', title: 'Linear Algebra' }), page({ id: 'home', title: 'Home' })]),
      'math/linear-algebra',
    );

    expect(html).toContain('<span class="typwiki-nav-group">math</span>');
    expect(html).toContain('href="/p/math/linear-algebra/"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('class="typwiki-nav-link is-active"');
    expect(html).toContain('href="/p/home/"');
  });

  it('renders a configured navigation list verbatim in order', () => {
    const html = renderNavigation(
      index([page({ id: 'home', title: 'Home' }), page({ id: 'articles/intro', title: 'Intro' })], {}, [
        { id: 'articles/intro', label: 'Guide' },
        { id: 'home' },
        { href: 'https://github.com/xzqbear/typwiki', label: 'GitHub' },
      ]),
      'articles/intro',
    );

    expect(html).toContain('href="/p/articles/intro/"');
    expect(html).toContain('>Guide</a>');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/p/home/"');
    expect(html).toContain('>Home</a>');
    expect(html).toContain('href="https://github.com/xzqbear/typwiki"');
    expect(html).toContain('rel="noopener noreferrer" target="_blank"');
    expect(html.indexOf('Guide')).toBeLessThan(html.indexOf('Home'));
  });

  it('degrades a configured navigation id without a matching page to a missing link', () => {
    const html = renderNavigation(index([], {}, [{ id: 'ghost', label: 'Ghost' }]), 'x');
    expect(html).toContain('class="typwiki-missing-link"');
    expect(html).toContain('Ghost');
  });

  it('returns an empty list when navigation is configured empty', () => {
    expect(renderNavigation(index([page({ id: 'home', title: 'Home' })], {}, []), 'home')).toBe('<ul></ul>');
  });
});

describe('renderTagCloud', () => {
  it('lists sorted tags with page counts and hides empty sections', () => {
    expect(renderTagCloud(index([], {}))).toBe('');
    const html = renderTagCloud(index([], { 'topic/math': ['a', 'b'], 'status/active': ['a'] }));
    expect(html).toContain('topic/math');
    expect(html).toContain('<span class="typwiki-count">2</span>');
    expect(html.indexOf('status/active')).toBeLessThan(html.indexOf('topic/math'));
  });
});

describe('renderRecentPages', () => {
  it('orders pages by modification time and skips pages without timestamps', () => {
    const html = renderRecentPages(
      index([
        page({ id: 'old', title: 'Old', modifiedAt: 1000 }),
        page({ id: 'new', title: 'New', modifiedAt: 2000 }),
        page({ id: 'timeless' }),
      ]),
      2,
    );

    expect(html.indexOf('New')).toBeLessThan(html.indexOf('Old'));
    expect(html).not.toContain('timeless');
  });

  it('renders nothing when no page has a timestamp', () => {
    expect(renderRecentPages(index([page({ id: 'a' })]))).toBe('');
  });
});

describe('renderBreadcrumbs', () => {
  it('links existing ancestors and prints missing segments as text', () => {
    const html = renderBreadcrumbs(
      index([page({ id: 'math', title: 'Mathematics' }), page({ id: 'math/linear-algebra', title: 'Linear Algebra' })]),
      'math/linear-algebra',
    );

    expect(html).toContain('href="/">Home</a>');
    expect(html).toContain('href="/p/math/">Mathematics</a>');
    expect(html).toContain('<li aria-current="page">Linear Algebra</li>');
  });

  it('does not link intermediate segments that have no page', () => {
    const html = renderBreadcrumbs(index([page({ id: 'guide/tools/tsc', title: 'TSC' })]), 'guide/tools/tsc');
    expect(html).toContain('<li>guide</li>');
    expect(html).toContain('<li>tools</li>');
    expect(html).not.toContain('href="/p/guide/"');
  });
});

describe('renderProperties', () => {
  it('shows the page ID and modification date', () => {
    const html = renderProperties(page({ id: 'note', modifiedAt: Date.UTC(2026, 7, 20) }));
    expect(html).toContain('<code>note</code>');
    expect(html).toContain('2026-08-20');
  });
});

describe('renderPageTags', () => {
  it('renders page tags as chips and hides the empty section', () => {
    expect(renderPageTags(page({ tags: [] }))).toBe('');
    expect(renderPageTags(page({ tags: ['topic/math'] }))).toContain('topic/math');
  });
});

describe('renderPageLinkList', () => {
  it('links known targets and degrades unknown targets to text', () => {
    const html = renderPageLinkList('Backlinks', ['known', 'missing'], index([page({ id: 'known', title: 'Known' })]));

    expect(html).toContain('href="/p/known/">Known</a>');
    expect(html).toContain('<span class="typwiki-missing-link">missing</span>');
    expect(html).not.toContain('href="/p/missing/"');
  });

  it('renders nothing for an empty list', () => {
    expect(renderPageLinkList('Backlinks', [], index([]))).toBe('');
  });
});

describe('findRelatedPages', () => {
  it('orders pages by shared tag count and excludes the current page', () => {
    const siteIndex = index(
      [
        page({ id: 'a', tags: ['topic/x', 'topic/y'] }),
        page({ id: 'b', tags: ['topic/x', 'topic/y'] }),
        page({ id: 'c', tags: ['topic/y'] }),
        page({ id: 'd', tags: ['other'] }),
      ],
      { 'topic/x': ['a', 'b'], 'topic/y': ['a', 'b', 'c'], other: ['d'] },
    );

    expect(findRelatedPages(siteIndex, 'a').map((related) => related.id)).toEqual(['b', 'c']);
  });

  it('returns nothing for pages without tags', () => {
    expect(findRelatedPages(index([page({ id: 'a' })]), 'a')).toEqual([]);
  });
});

describe('renderRelationsPanel', () => {
  it('renders properties, tags, links, and related pages for a known page', () => {
    const siteIndex = index(
      [
        page({ id: 'a', title: 'A', tags: ['topic/x'], outgoing: ['b'], modifiedAt: 1000 }),
        page({ id: 'b', title: 'B', tags: ['topic/x'], backlinks: ['a'] }),
      ],
      { 'topic/x': ['a', 'b'] },
    );

    const html = renderRelationsPanel(siteIndex, 'a');

    expect(html).toContain('<code>a</code>');
    expect(html).toContain('topic/x');
    expect(html).toContain('href="/p/b/"');
    expect(html).toContain('>B</a>');
  });

  it('renders nothing for an unknown page', () => {
    expect(renderRelationsPanel(index([page({ id: 'a' })]), 'missing')).toBe('');
  });
});

describe('formatModifiedDate', () => {
  it('formats a timestamp as an ISO calendar date', () => {
    expect(formatModifiedDate(page({ modifiedAt: Date.UTC(2026, 7, 20) }))).toBe('2026-08-20');
    expect(formatModifiedDate(page({}))).toBeNull();
  });
});

describe('renderNavigationPanel', () => {
  it('renders navigation, tags, and recent pages for the sidebar', () => {
    const siteIndex = index([page({ id: 'home', title: 'Home', tags: ['topic/x'], modifiedAt: 1000 })], { 'topic/x': ['home'] });
    const html = renderNavigationPanel(siteIndex, 'home');

    expect(html).toContain('href="/p/home/"');
    expect(html).toContain('topic/x');
    expect(html).toContain('Home');
  });
});

describe('renderDocumentShell', () => {
  it('wraps page content in a standalone HTML document', () => {
    const html = renderDocumentShell({
      index: index([]),
      title: 'Test Page',
      content: '<p>Hello</p>',
      stylesheet: '/assets/themes/academic-paper/theme.css',
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>Test Page · Typwiki</title>');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('/assets/themes/academic-paper/theme.css');
    expect(html).toContain('data-typwiki-region="header"');
    expect(html).toContain('data-typwiki-region="footer"');
  });

  it('renders breadcrumbs and relations only for pages', () => {
    const siteIndex = index([page({ id: 'home', title: 'Home' })]);
    const pageHtml = renderDocumentShell({
      index: siteIndex,
      title: 'Home',
      content: '<p>Body</p>',
      stylesheet: '/assets/themes/academic-paper/theme.css',
      currentPageId: 'home',
    });

    expect(pageHtml).toContain('typwiki-breadcrumbs');
    expect(pageHtml).toContain('data-page-id="home"');
    expect(pageHtml).toContain('aria-current="page"');
  });

  it('fills the table of contents region when headings are provided', () => {
    const pageHtml = renderDocumentShell({
      index: index([page({ id: 'home', title: 'Home' })]),
      title: 'Home',
      content: '<p>Body</p>',
      stylesheet: '/assets/themes/academic-paper/theme.css',
      currentPageId: 'home',
      headings: [{ level: 2, id: 'intro', title: 'Intro' }],
    });

    expect(pageHtml).toContain('data-typwiki-region="toc"><ol><li><a href="#intro">Intro</a></li></ol>');
  });

  it('leaves the table of contents region empty without headings', () => {
    const pageHtml = renderDocumentShell({
      index: index([page({ id: 'home', title: 'Home' })]),
      title: 'Home',
      content: '<p>Body</p>',
      stylesheet: '/assets/themes/academic-paper/theme.css',
      currentPageId: 'home',
    });

    expect(pageHtml).toContain('data-typwiki-region="toc"></aside>');
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
    const { headings, body } = extractHeadings('<h2> </h2><h2>Real</h2>');
    expect(headings).toEqual([{ level: 2, id: 'real', title: 'Real' }]);
    expect(body).toBe('<h2> </h2><h2 id="real">Real</h2>');
  });
});

describe('renderTableOfContents', () => {
  it('renders nested lists and returns empty for no headings', () => {
    expect(renderTableOfContents([])).toBe('');

    const html = renderTableOfContents([
      { level: 2, id: 'intro', title: 'Introduction' },
      { level: 3, id: 'features', title: 'Features' },
      { level: 2, id: 'conclusion', title: 'Conclusion' },
    ]);

    expect(html).toContain('<a href="#intro">Introduction</a>');
    expect(html).toContain('<ol><li><a href="#features">Features</a></li></ol>');
    expect(html).toContain('<a href="#conclusion">Conclusion</a>');
  });
});

describe('renderHeader', () => {
  it('renders site identity and navigation for a page', () => {
    const html = renderHeader(index([page({ id: 'home', title: 'Home' })]), 'home');

    expect(html).toContain('class="typwiki-site-identity"');
    expect(html).toContain('data-typwiki-region="navigation"');
    expect(html).toContain('href="/p/home/"');
  });

  it('renders only the identity without a current page', () => {
    const html = renderHeader(index([page({ id: 'home', title: 'Home' })]));
    expect(html).toContain('class="typwiki-site-identity"');
    expect(html).not.toContain('data-typwiki-region="navigation"');
  });
});

describe('renderFooter', () => {
  it('renders a minimal site footer', () => {
    expect(renderFooter(index([]))).toContain('Typwiki');
  });
});
