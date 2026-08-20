// tags.ts
// This module provides utility functions for handling tags in Typwiki.
// It includes a function to flatten nested tag structures into a sorted array of strings.

import type { TagValue } from "./model.js";


/**
 * Flattens nested tag structures into a sorted array of strings.
 * 
 * Example
 * ---
 * 
 * Given the following nested tag structure:
 * 
 * ```
 * tags = {
 *  "category": {
 *    "science": true,
 *  "math": {
 *    "algebra": true,
 *    "geometry": false
 *  }
 * }
 * ```
 * 
 * The function will return:
 * `["category/science", "category/math/algebra"]`
 * 
 * @param value tags record with nested structures
 * @returns 
 */
export function flattenTags(value: Record<string, TagValue>): string[] {
  const result = new Set<string>();

  function visit(path: string[], current: TagValue): void {
    if (Array.isArray(current)) {
      for (const item of current) visit(path, item);
      return;
    }

    if (current !== null && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) visit([...path, key], child);
      return;
    }

    const prefix = path.join("/");
    if (current === true) {
      result.add(prefix);
      return;
    }
    if (current === false) {
      return;
    }
    result.add(
      typeof current === "string"
        ? `${prefix}/${current}`
        : `${prefix}=${String(current)}`,
    );
  }

  for (const [key, child] of Object.entries(value)) visit([key], child);
  return [...result].sort();
}
