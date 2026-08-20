// graph.ts
// This module provides the core graph-building functionality for Typwiki.
// It includes a function to build the site index from parsed pages, validating page IDs, connections, and tags.

import { PAGE_ID_PATTERN, type Diagnostic, type ParsedPage, type RoutingConfig, type SiteCheckResult, TypwikiError } from "./model.js";
import { validatePageRoutes } from "./routing.js";

export function buildSiteIndex(pages: ParsedPage[], routing: RoutingConfig): SiteCheckResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const byId = new Map<string, ParsedPage>();

  for (const page of pages) {
    if (!PAGE_ID_PATTERN.test(page.id)) errors.push({ severity: "error", file: page.file, message: `Invalid page ID: ${page.id}` });
    if (byId.has(page.id)) errors.push({ severity: "error", file: page.file, message: `Duplicate page ID: ${page.id}` });
    byId.set(page.id, page);
  }

  for (const page of pages) {
    for (const target of page.outgoing) {
      if (!byId.has(target)) warnings.push({ severity: "warning", file: page.file, message: `Connection target does not exist: ${target}` });
    }
  }
  errors.push(...validatePageRoutes(pages, routing).map((diagnostic) => ({ ...diagnostic, severity: "error" as const })));

  if (errors.length > 0) throw new TypwikiError(errors);

  const backlinks = new Map<string, Set<string>>();
  const tags = new Map<string, Set<string>>();
  for (const page of pages) {
    backlinks.set(page.id, new Set());
    for (const tag of page.tags) {
      const taggedPages = tags.get(tag) ?? new Set<string>();
      taggedPages.add(page.id);
      tags.set(tag, taggedPages);
    }
  }
  for (const page of pages) {
    for (const target of page.outgoing) backlinks.get(target)?.add(page.id);
  }

  return {
    diagnostics: warnings,
    index: {
      version: 2,
      routing,
      pages: [...pages]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((page) => ({ ...page, backlinks: [...(backlinks.get(page.id) ?? [])].sort() })),
      tags: Object.fromEntries([...tags.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([tag, ids]) => [tag, [...ids].sort()])),
    },
  };
}
