// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
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
  it('renders the three choices with system active initially', () => {
    render(<ThemeToggle />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.textContent)).toEqual(['Light', 'Dark', 'System']);
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('applies the stored theme on mount', () => {
    window.localStorage.setItem('typwiki-theme', 'dark');
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByText('Dark').getAttribute('aria-pressed')).toBe('true');
  });

  it('persists and applies a clicked choice', () => {
    render(<ThemeToggle />);
    act(() => {
      screen.getByText('Dark').click();
    });
    expect(window.localStorage.getItem('typwiki-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByText('Dark').getAttribute('aria-pressed')).toBe('true');
  });

  it('switching to system removes the stored pin but keeps a data-theme attribute', () => {
    render(<ThemeToggle />);
    act(() => {
      screen.getByText('Light').click();
    });
    act(() => {
      screen.getByText('System').click();
    });
    expect(window.localStorage.getItem('typwiki-theme')).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('system');
    expect(screen.getByText('System').getAttribute('aria-pressed')).toBe('true');
  });
});
