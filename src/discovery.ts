import { readdir } from "node:fs/promises";
import { join } from "node:path";


/**
 * Discovers all .typ files in the specified pages directory.
 * @param root root directory of the Typwiki project
 * @param pagesDir pages directory relative to the root
 * @returns A promise resolving to an array of file paths
 * 
 * Example:
 * 
 * Returns an array like:
 * 
 * ```
 * [
 * "/home/user/typwiki/pages/index.typ",
 * "/home/user/typwiki/pages/guide/install.typ",
 * "/home/user/typwiki/pages/guide/overview.typ",
 * ]
 * ```
 */
export async function discoverPages(root: string, pagesDir: string): Promise<string[]> {
  const pagesRoot = join(root, pagesDir);
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.endsWith(".typ")) {
        files.push(path);
      }
    }
  }

  try {
    await visit(pagesRoot);
  } catch (error: unknown) {
    if (isMissingDirectory(error)) return [];
    throw error;
  }

  return files.sort();
}


/**
 * 
 * @param error unknown error
 * @returns true if the error is a NodeJS.ErrnoException with code "ENOENT", indicating a missing directory
 * 
 * The function checks if the provided error is a `NodeJS.ErrnoException` with the code `"ENOENT"`,
 */
function isMissingDirectory(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
