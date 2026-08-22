// ThemeToggle.tsx
// Client-side color-scheme control. Offers `light`, `dark`, and `system`
// choices, persists the choice in `localStorage`, and applies it by setting the
// `data-theme` attribute on `<html>`. When JavaScript is unavailable, the CSS
// `prefers-color-scheme` fallback in `styles.css` still honors the OS choice.
//
// The component renders a neutral "system" state on the server and during the
// first client render; the persisted choice is applied in an effect to keep
// server markup and the first hydration identical.

import { useEffect, useState } from 'react';

/** The three supported color-scheme choices. */
export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'typwiki-theme';
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

const LABELS: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/** Applies a theme choice to `<html>` via the `data-theme` attribute. */
export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.setAttribute('data-theme', choice);
}

/** Reads the persisted theme choice, defaulting to `system`. */
export function readStoredTheme(): ThemeChoice {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>('system');

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const select = (choice: ThemeChoice) => {
    setTheme(choice);
    applyTheme(choice);
    window.localStorage.setItem(STORAGE_KEY, choice);
  };

  return (
    <fieldset className="typwiki-theme-toggle">
      <legend className="typwiki-theme-toggle-legend">Color scheme</legend>
      {CHOICES.map((choice) => (
        <button
          key={choice}
          type="button"
          className={`typwiki-theme-toggle-button${theme === choice ? ' is-active' : ''}`}
          aria-pressed={theme === choice}
          onClick={() => select(choice)}
        >
          {LABELS[choice]}
        </button>
      ))}
    </fieldset>
  );
}
