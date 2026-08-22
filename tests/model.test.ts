import { describe, expect, it } from 'vitest';
import { formatDiagnostic, PAGE_ID_PATTERN, TypwikiError } from '../src/model.js';

describe('model', () => {
  it('validates hierarchical page IDs', () => {
    expect(PAGE_ID_PATTERN.test('guide/install')).toBe(true);
    expect(PAGE_ID_PATTERN.test('api/v2/reference')).toBe(true);
    expect(PAGE_ID_PATTERN.test('Guide/install')).toBe(false);
    expect(PAGE_ID_PATTERN.test('guide//install')).toBe(false);
  });

  it('formats diagnostics and preserves them in TypwikiError', () => {
    const diagnostics = [{ file: 'pages/a.typ', message: '错误 A' }, { message: '错误 B' }];

    expect(formatDiagnostic(diagnostics[0])).toBe('ERROR pages/a.typ: 错误 A');
    expect(formatDiagnostic(diagnostics[1])).toBe('ERROR 错误 B');
    expect(formatDiagnostic({ severity: 'warning', message: '警告' })).toBe('WARNING 警告');

    const error = new TypwikiError(diagnostics);
    expect(error.diagnostics).toEqual(diagnostics);
    expect(error.message).toBe('ERROR pages/a.typ: 错误 A\nERROR 错误 B');
  });
});
