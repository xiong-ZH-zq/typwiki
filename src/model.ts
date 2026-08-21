// model.ts


/**
 * Regex pattern for validating page IDs. A valid page ID consists of 
 * lowercase letters, numbers, and hyphens, and can include slashes to represent nested pages.
 * 
 * Example of valid page IDs:
 * 
 * `"home"`, `"about-us"`, `"products/item-1"`, `"blog/2023/06/15/my-post"`
 */
export const PAGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/**
 * TagValue can be string, number, boolean, null, an array of TagValues, 
 * or an object with string keys and TagValue values.
 */
export type TagValue = string | number | boolean | null | TagValue[] | { [key: string]: TagValue };

export interface RoutingConfig {
  pagePrefix: string;
  reservedPaths: string[];
}

/**
 * A single entry in the user-configured header navigation. Entries either
 * reference a stable page id (optionally overriding its label) or point at a
 * custom/external href with an explicit label. Exactly one of `id` or `href`
 * must be set.
 *
 * @example
 * // Link to an existing page, using its title as the label.
 * { id: "articles/typwiki-intro" }
 * // Link to a page under a custom label.
 * { id: "articles/typwiki-intro", label: "Guide" }
 * // Link to an external site.
 * { href: "https://github.com/xzqbear/typwiki", label: "GitHub" }
 */
export interface NavigationEntry {
  /** A stable page id from the site index; the label defaults to the page title. */
  id?: string;
  /** The link label; required for `href` entries and optional overrides for `id` entries. */
  label?: string;
  /** A custom href for external or non-page links; mutually exclusive with `id`. */
  href?: string;
}

/** 
 * PageMetadata represents the metadata of a page.
 * 
 * Including its kind, ID, title, and whether it displays tag and link tables.
 */
export interface PageMetadata {
  kind: "page";
  id: string;
  title: string;
  tagTable: boolean;
  linkTable: boolean;
}

/**
 * LinkMetadata represents the metadata of a link. See PageMetadata for more details.
 */
export interface LinkMetadata {
  kind: "link";
  target: string;
}

/**
 * TagsMetadata represents the metadata of tags. See PageMetadata for more details.
 */
export interface TagsMetadata {
  kind: "tags";
  value: Record<string, TagValue>;
}

/**
 * ParsedPage represents a fully parsed page, including its file path, ID, title,
 * whether it displays tag and link tables, its outgoing links, and its tags.
 *
 * The `outgoing` field is an array of page IDs that this page links to.
 * The `tags` field is an array of tag names associated with this page.
 * The `modifiedAt` field is the source file modification time in epoch
 * milliseconds; it is optional so callers that build pages synthetically do
 * not need to provide it.
 *
 * @example
 * const page: ParsedPage = {
 *   file: "pages/math/linear-algebra.typ",
 *   id: "math/linear-algebra",
 *   title: "Linear Algebra",
 *   tagTable: false,
 *   linkTable: false,
 *   outgoing: ["math/matrices"],
 *   tags: ["topic/mathematics"],
 *   modifiedAt: 1756000000000,
 * };
 */
export interface ParsedPage {
  file: string;
  id: string;
  title: string;
  tagTable: boolean;
  linkTable: boolean;
  outgoing: string[];
  tags: string[];
  modifiedAt?: number;
}

export interface SitePage extends ParsedPage {
  backlinks: string[];
}

/**
 * SiteIndex represents the index of a site, including its version, pages, and tags.
 *
 * The `pages` field is an array of SitePage objects, each representing a page in the site.
 * The `tags` field is a record where keys are tag names and values are arrays of page IDs that have that tag.
 * The optional `navigation` field carries the user-configured header navigation;
 * when absent the shell falls back to rendering every page as a navigation tree.
 */
export interface SiteIndex {
  version: 3;
  baseUrl: string;
  routing: RoutingConfig;
  pages: SitePage[];
  tags: Record<string, string[]>;
  navigation?: NavigationEntry[];
}

export interface SiteCheckResult {
  index: SiteIndex;
  diagnostics: Diagnostic[];
}

/**
 * Diagnostic represents an error or warning message related to a specific file.
 * 
 * The `file` field is optional and can be omitted 
 * if the diagnostic is not related to a specific file.
 */
export interface Diagnostic {
  severity?: "warning" | "error";
  file?: string;
  message: string;
}


/**
 * TypwikiError is a custom error class that represents errors related to Typwiki.
 * 
 * It contains an array of Diagnostic objects that provide detailed information about the errors.
 * The error message is constructed by formatting each diagnostic and joining them with newlines.
 */
export class TypwikiError extends Error {
  constructor(public readonly diagnostics: Diagnostic[]) {
    super(diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n"));
  }
}

/**
 * Formats a Diagnostic object into a string representation.
 */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const prefix = (diagnostic.severity ?? "error").toUpperCase();
  return diagnostic.file ? `${prefix} ${diagnostic.file}: ${diagnostic.message}` : `${prefix} ${diagnostic.message}`;
}
