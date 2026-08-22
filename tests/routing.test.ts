import { describe, expect, it } from 'vitest';
import { type ParsedPage, TypwikiError } from '../src/model.js';
import { normalizeBaseUrl, normalizeRouting, pageHref, pageOutputPath, pageUrlPath, validatePageRoutes } from '../src/routing.js';

const page = (partial: Partial<ParsedPage>): ParsedPage => ({
  file: 'pages/note.typ',
  id: 'note',
  title: 'Note',
  tagTable: false,
  linkTable: false,
  outgoing: [],
  tags: [],
  ...partial,
});

describe('routing', () => {
  it('normalizes page prefixes and adds system reserved paths', () => {
    expect(normalizeRouting({ pagePrefix: '/wiki/', reservedPaths: ['/assets/'] })).toEqual({
      pagePrefix: '/wiki',
      reservedPaths: ['/', '/__typwiki', '/assets'],
    });
  });

  it('separates deployment URLs from output paths', () => {
    const routing = normalizeRouting({ pagePrefix: '/p', reservedPaths: [] });
    expect(normalizeBaseUrl('/')).toBe('');
    expect(normalizeBaseUrl('/typwiki/')).toBe('/typwiki');
    expect(pageUrlPath(routing, 'math/linear-algebra')).toBe('/p/math/linear-algebra/');
    expect(pageHref('/typwiki', routing, 'math/linear-algebra')).toBe('/typwiki/p/math/linear-algebra/');
    expect(pageOutputPath('/project', 'public', routing, 'math/linear-algebra')).toBe('/project/public/p/math/linear-algebra/index.html');
  });

  it('rejects invalid and reserved route configurations', () => {
    expect(() => normalizeRouting({ pagePrefix: 'wiki', reservedPaths: [] })).toThrow(TypwikiError);
    expect(() => normalizeBaseUrl('typwiki')).toThrow(TypwikiError);
    expect(() => normalizeBaseUrl('/typwiki?draft')).toThrow(TypwikiError);
    expect(() => normalizeRouting({ pagePrefix: '/__typwiki', reservedPaths: [] })).toThrow(TypwikiError);
    expect(() => normalizeRouting({ pagePrefix: '/wiki', reservedPaths: ['/wiki'] })).toThrow(TypwikiError);
  });

  it('rejects pages below a reserved path', () => {
    const routing = normalizeRouting({ pagePrefix: '/wiki', reservedPaths: ['/wiki/private'] });
    expect(validatePageRoutes([page({ id: 'private/notes' })], routing)).toEqual([
      expect.objectContaining({ message: expect.stringContaining('/wiki/private') }),
    ]);
  });
});
