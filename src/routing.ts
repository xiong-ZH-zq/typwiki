// routing.ts
// This module provides routing utilities for Typwiki.
// It includes functions to normalize routing configurations, generate page URLs and output paths, and validate page routes.

import { relative, resolve, sep } from "node:path";
import type { Diagnostic, ParsedPage, RoutingConfig } from "./model.js";
import { TypwikiError } from "./model.js";

const SYSTEM_RESERVED_PATHS = ["/", "/__typwiki"];

export function normalizeRouting(routing: RoutingConfig): RoutingConfig {
  const pagePrefix = normalizePath(routing.pagePrefix, "Page prefix");
  if (pagePrefix === "/") throw new TypwikiError([{ message: "Page prefix cannot be the root path /." }]);

  const reservedPaths = [...new Set([...SYSTEM_RESERVED_PATHS, ...routing.reservedPaths.map((path) => normalizePath(path, "Reserved path"))])].sort();
  for (const reservedPath of reservedPaths) {
    if (reservedPath !== "/" && isWithin(pagePrefix, reservedPath)) {
      throw new TypwikiError([{ message: `Page prefix ${pagePrefix} conflicts with reserved path ${reservedPath}.` }]);
    }
  }

  return { pagePrefix, reservedPaths };
}

export function pageUrlPath(routing: RoutingConfig, id: string): string {
  return `${routing.pagePrefix}/${id}/`;
}

export function pageOutputPath(root: string, publicDir: string, routing: RoutingConfig, id: string): string {
  const segments = pageUrlPath(routing, id).split("/").filter(Boolean);
  const outputRoot = resolve(root, publicDir);
  const output = resolve(outputRoot, ...segments, "index.html");
  const safeRelative = relative(outputRoot, output);
  if (safeRelative === ".." || safeRelative.startsWith(`..${sep}`)) {
    throw new TypwikiError([{ message: `Page ID ${id} generated an unsafe output path.` }]);
  }
  return output;
}

export function pageOutputRoot(root: string, publicDir: string, routing: RoutingConfig): string {
  const segments = routing.pagePrefix.split("/").filter(Boolean);
  return resolve(root, publicDir, ...segments);
}

export function validatePageRoutes(pages: ParsedPage[], routing: RoutingConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byUrl = new Map<string, ParsedPage>();

  for (const page of pages) {
    const urlPath = pageUrlPath(routing, page.id);
    const normalizedUrl = urlPath.slice(0, -1);
    const conflictingPath = routing.reservedPaths.find((reservedPath) => reservedPath !== "/" && isWithin(normalizedUrl, reservedPath));
    if (conflictingPath) {
      diagnostics.push({ file: page.file, message: `Page URL ${urlPath} conflicts with reserved path ${conflictingPath}.` });
    }

    const previous = byUrl.get(normalizedUrl);
    if (previous) {
      diagnostics.push({ file: page.file, message: `Page URL duplicate: ${urlPath} (conflicts with ${previous.file}).` });
    } else {
      byUrl.set(normalizedUrl, page);
    }
  }

  return diagnostics;
}

function normalizePath(value: string, label: string): string {
  if (!value.startsWith("/")) throw new TypwikiError([{ message: `${label} must start with /.` }]);
  if (value.includes("?") || value.includes("#")) throw new TypwikiError([{ message: `${label} cannot contain query parameters or fragments.` }]);

  if (value === "/") return "/";
  const segments = value.split("/").slice(1).filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new TypwikiError([{ message: `${label} cannot contain . or ..` }]);
  }

  return `/${segments.join("/")}`;
}

function isWithin(path: string, parent: string): boolean {
  return path === parent || path.startsWith(`${parent}/`);
}
