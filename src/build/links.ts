// links.ts
// Pure URL computation helpers shared between the build pipeline (Node) and the
// React shell (both server-rendered output and the hydrated client).
//
// This module must stay free of Node-only imports (`node:path`, `node:fs`, …)
// so the React components can import it in the browser. It depends only on the
// plain data types from `model.ts` and mirrors the URL half of `routing.ts`.
//
// `routing.ts` re-exports these so existing Node-side callers keep working.

import type { RoutingConfig } from '../model.js';
import { TypwikiError } from '../model.js';

/** The site root href for a normalized base URL (always ends with `/`). */
export function siteHref(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/`;
}

/** Normalizes a deployment base URL: `""`/`"/"` map to `""`, others get a leading slash and no trailing slash. */
export function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl === '' || baseUrl === '/') return '';
  return normalizePath(baseUrl, 'Base URL');
}

/** The URL path for a page id under a routing config, e.g. `/p/math/linear-algebra/`. */
export function pageUrlPath(routing: RoutingConfig, id: string): string {
  return `${routing.pagePrefix}/${id}/`;
}

/** The absolute href for a page id, including the deployment base URL. */
export function pageHref(baseUrl: string, routing: RoutingConfig, id: string): string {
  return `${normalizeBaseUrl(baseUrl)}${pageUrlPath(routing, id)}`;
}

function normalizePath(value: string, label: string): string {
  if (!value.startsWith('/')) throw new TypwikiError([{ message: `${label} must start with /.` }]);
  if (value.includes('?') || value.includes('#'))
    throw new TypwikiError([{ message: `${label} cannot contain query parameters or fragments.` }]);

  if (value === '/') return '/';
  const segments = value.split('/').slice(1).filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new TypwikiError([{ message: `${label} cannot contain . or ..` }]);
  }

  return `/${segments.join('/')}`;
}
