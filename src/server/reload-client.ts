// reload-client.ts
// The client-side script injected into served pages during development. It
// subscribes to the server's SSE endpoint and reloads the page (or shows build
// diagnostics) when the site is rebuilt. Kept in its own module so the server
// file stays focused on routing.

import { escapeHtml } from '../build/html.js';

/** The inline script served with every page in development. */
export const reloadScript = `<script>
const source = new EventSource('/__typwiki/events');
const showDiagnostics = async () => {
  const { error, diagnostics } = await fetch('/__typwiki/diagnostics').then((response) => response.json());
  const messages = error ? [error] : diagnostics.map((diagnostic) =>
    diagnostic.file ? diagnostic.file + ': ' + diagnostic.message : diagnostic.message);
  const notice = document.getElementById('__typwiki-diagnostics');
  if (!messages.length) {
    notice?.remove();
    return;
  }
  const element = notice || document.createElement('pre');
  element.id = '__typwiki-diagnostics';
  element.style.cssText = 'position:fixed;inset:auto 1rem 1rem;max-width:calc(100% - 2rem);margin:0;padding:1rem;white-space:pre-wrap;z-index:9999';
  element.style.background = error ? '#fff0f0' : '#fff8db';
  element.style.border = error ? '1px solid #b42318' : '1px solid #b98900';
  element.style.color = error ? '#5c1111' : '#5b4300';
  element.textContent = messages.join('\\n');
  if (!notice) document.body.append(element);
};
source.addEventListener('reload', () => location.reload());
source.addEventListener('build-error', showDiagnostics);
showDiagnostics();
</script>`;

/**
 * Injects the reload script (and any extra content) before `</body>`.
 *
 * @param html The page HTML to augment.
 * @param content Extra HTML inserted before the reload script (e.g. error output).
 * @returns The page with the script injected.
 */
export function injectReloadScript(html: string, content = ''): string {
  return html.includes('</body>') ? html.replace('</body>', `${content}${reloadScript}</body>`) : `${html}${content}${reloadScript}`;
}

/** Escapes text so it can be embedded in the injected error diagnostic HTML. */
export function escapeDiagnostic(value: string): string {
  return escapeHtml(value);
}
