// pipeline.ts
// This module provides the core pipeline for building and checking a Typwiki site.
// It includes functions to check the site for errors, build the site index, and render the site.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { TypwikiConfig } from "../typwiki.config.js";
import { discoverPages } from "./discovery.js";
import { buildSiteIndex } from "./graph.js";
import { writeSiteIndex } from "./index-writer.js";
import type { SiteCheckResult } from "./model.js";
import { normalizeBaseUrl, normalizeRouting } from "./routing.js";
import { renderSite } from "./renderer.js";
import { TypstAdapter } from "./typst-adapter.js";

export async function checkSite(config: TypwikiConfig): Promise<SiteCheckResult> {
  await ensureSeedIndex(config);
  const files = await discoverPages(config.root, config.pagesDir);
  const adapter = new TypstAdapter({ root: config.root, typstBin: config.typstBin });
  const pages = await Promise.all(files.map((file) => adapter.parsePage(file)));
  return buildSiteIndex(pages, normalizeRouting(config.routing), normalizeBaseUrl(config.baseUrl));
}

export async function buildSite(config: TypwikiConfig): Promise<SiteCheckResult> {
  const indexPath = join(config.root, config.generatedDir, "site-index.json");
  const result = await checkSite(config);
  await writeSiteIndex(indexPath, result.index);
  await renderSite(config, result.index);
  return result;
}

async function ensureSeedIndex(config: TypwikiConfig): Promise<void> {
  const indexPath = join(config.root, config.generatedDir, "site-index.json");
  await mkdir(join(config.root, config.generatedDir), { recursive: true });
  await writeSiteIndex(indexPath, { version: 3, baseUrl: normalizeBaseUrl(config.baseUrl), routing: normalizeRouting(config.routing), pages: [], tags: {} });
}
