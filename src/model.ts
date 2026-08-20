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
 */
export interface ParsedPage {
  file: string;
  id: string;
  title: string;
  tagTable: boolean;
  linkTable: boolean;
  outgoing: string[];
  tags: string[];
}

export interface SitePage extends ParsedPage {
  backlinks: string[];
}

/**
 * SiteIndex represents the index of a site, including its version, pages, and tags.
 * 
 * The `pages` field is an array of SitePage objects, each representing a page in the site.
 * The `tags` field is a record where keys are tag names and values are arrays of page IDs that have that tag.
 */
export interface SiteIndex {
  version: 2;
  routing: RoutingConfig;
  pages: SitePage[];
  tags: Record<string, string[]>;
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
