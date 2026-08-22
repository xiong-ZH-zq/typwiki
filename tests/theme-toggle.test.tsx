// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, readStoredTheme, ThemeToggle } from '../src/components/ThemeToggle.js';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
});

describe('applyTheme', () => {
  it('sets the data-theme attribute on <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('readStoredTheme', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it('returns the stored choice', () => {
    window.localStorage.setItem('typwiki-theme', 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('falls back to system for invalid stored values', () => {
    window.localStorage.setItem('typwiki-theme', 'neon');
    expect(readStoredTheme()).toBe('system');
  });
});

describe('ThemeToggle', () => {
  it('renders a select with the three choices and system selected initially', () => {
    render(<ThemeToggle />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('system');
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Light', 'Dark', 'System']);
  });

  it('applies the stored theme on mount', () => {
    window.localStorage.setItem('typwiki-theme', 'dark');
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('dark');
  });

  it('persists and applies a selected choice', () => {
    render(<ThemeToggle />);
    act(() => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dark' } });
    });
    expect(window.localStorage.getItem('typwiki-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('dark');
  });

  it('switching to system stores the choice and keeps a data-theme attribute', () => {
    render(<ThemeToggle />);
    act(() => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'light' } });
    });
    act(() => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'system' } });
    });
    expect(window.localStorage.getItem('typwiki-theme')).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('system');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('system');
  });
});
