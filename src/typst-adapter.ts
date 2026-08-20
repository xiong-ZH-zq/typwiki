// typst-adpters.ts

// spawn is responsible for spawning typst processes and querying metadata from typst files. It provides a TypstAdapter class that can parse pages and extract metadata, links, and tags from typst files. The adapter uses the Typst binary to run queries and returns structured data for further processing in the Typwiki project.
import { spawn } from "node:child_process";

import { relative } from "node:path";

// metadata json schema validation
import { z } from "zod";
import { PAGE_ID_PATTERN, type LinkMetadata, type PageMetadata, type ParsedPage, type TagValue, type TagsMetadata, TypwikiError } from "./model.js";
import { flattenTags } from "./tags.js";


const metadataEnvelopeSchema = z.object({
  func: z.literal("metadata"),
  value: z.unknown(),
  label: z.string(),
});

/**
 * Schema for validating page metadata.
 */
const pageSchema = z.object({
  kind: z.literal("page"),
  id: z.string(),
  title: z.string(),
  tagTable: z.boolean().default(false),
  linkTable: z.boolean().default(false),
});

const linkSchema = z.object({
  kind: z.literal("link"),
  target: z.string(),
});

const tagsSchema = z.object({
  kind: z.literal("tags"),
  value: z.record(z.string(), z.unknown()),
});

export interface TypstAdapterOptions {
  root: string;
  typstBin: string;
}




/**
 * TypstAdapter is a class that provides methods to parse Typst files and extract metadata, links, and tags. 
 * It uses the Typst binary to run queries and returns structured data for further processing in the Typwiki project.
 */
export class TypstAdapter {
  constructor(private readonly options: TypstAdapterOptions) {}

  /**
   * Parses a Typst file and extracts page metadata, links, and tags.
   * 
   * Turn Typst metadata (which is created by the Typst CLI query) into a ParsedPage object.
   * 
   * @param file typst file path
   * @returns 
   */
  async parsePage(file: string): Promise<ParsedPage> {
    const [pageValues, linkValues, tagValues] = await Promise.all([
      this.query(file, "<typwiki-page>"),
      this.query(file, "<typwiki-link>"),
      this.query(file, "<typwiki-tags>"),
    ]);

    const relativeFile = relative(this.options.root, file);
    if (pageValues.length !== 1) {
      throw new TypwikiError([{ file: relativeFile, message: "Pages should have exactly one #show: page.with(...) declaration." }]);
    }
    if (tagValues.length > 1) {
      throw new TypwikiError([{ file: relativeFile, message: "Pages should have at most one #tags(...) declaration." }]);
    }

    const page = parsePageMetadata(pageValues[0], relativeFile);
    if (!PAGE_ID_PATTERN.test(page.id)) {
      throw new TypwikiError([{ file: relativeFile, message: `Invalid page ID: ${page.id}` }]);
    }

    const links = linkValues.map((value) => parseLinkMetadata(value, relativeFile));
    const tagValue = tagValues.length === 0 ? {} : parseTagsMetadata(tagValues[0], relativeFile).value;

    // JSON-like promise data structure.
    return {
      file: relativeFile,
      id: page.id,
      title: page.title,
      tagTable: page.tagTable,
      linkTable: page.linkTable,
      outgoing: [...new Set(links.map((link) => link.target))].sort(),
      tags: flattenTags(tagValue),
    };
  }

  private async query(file: string, selector: string): Promise<unknown[]> {
    const expression = `query(${selector}).map(item => item.value)`;
    const args = [
      "eval",
      "--format",
      "json",
      "--target",
      "html",
      "--features",
      "html",
      "--root",
      this.options.root,
      "--in",
      file,
      expression,
    ];
    const result = await run(this.options.typstBin, args);
    if (result.exitCode !== 0) {
      throw new TypwikiError([{ file: relative(this.options.root, file), message: result.stderr.trim() || "Typst metadata query failed." }]);
    }

    try {
      return z.array(z.unknown()).parse(JSON.parse(result.stdout));
    } catch {
      throw new TypwikiError([{ file: relative(this.options.root, file), message: "Typst did not return valid metadata JSON." }]);
    }
  }
}


// Helper function to parse typst page metadata.
function parsePageMetadata(value: unknown, file: string): PageMetadata {
  const parsed = pageSchema.safeParse(value);
  if (!parsed.success) throw new TypwikiError([{ file, message: "#show: page.with(...) parameters are invalid." }]);
  return parsed.data;
}

function parseLinkMetadata(value: unknown, file: string): LinkMetadata {
  const parsed = linkSchema.safeParse(value);
  if (!parsed.success || !PAGE_ID_PATTERN.test(parsed.data.target)) {
    throw new TypwikiError([{ file, message: "#wiki(...) target must be a valid page ID." }]);
  }
  return parsed.data;
}

function parseTagsMetadata(value: unknown, file: string): TagsMetadata {
  const parsed = tagsSchema.safeParse(value);
  if (!parsed.success || !isTagValue(parsed.data.value)) {
    throw new TypwikiError([{ file, message: "#tags(...) must receive a dictionary of serializable values." }]);
  }
  return { kind: "tags", value: parsed.data.value as Record<string, TagValue> };
}

function isTagValue(value: unknown): value is TagValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isTagValue);
  return typeof value === "object" && value !== null && Object.values(value).every(isTagValue);
}

function run(command: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode: exitCode ?? 1, stdout, stderr }));
  });
}
