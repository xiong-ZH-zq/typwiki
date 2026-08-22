// html.ts
// Shared HTML string helpers for the build pipeline and the development server.
//
// This module owns the single `escapeHtml` implementation so that no other
// module needs to duplicate the escaping logic (previously it was inlined in
// renderer.ts, server.ts, and site-shell.ts).

/**
 * Escapes a string so it can be safely embedded in HTML text or an
 * attribute value delimited by double quotes.
 *
 * @param value The raw string to escape.
 * @returns The input with `&`, `<`, `>`, and `"` replaced by their entities.
 *
 * @example
 * escapeHtml(`A <b> & "c"`); // "A &lt;b&gt; &amp; &quot;c&quot;"
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character);
}
