// pipeline.ts
// This module provides the core pipeline for building and checking a Typwiki site.
// It includes functions to check the site for errors, build the site index, and render the site.

import { join } from 'node:path';
import type { TypwikiConfig } from '../typwiki.config.js';
import { buildClientAssets } from './build/vite.js';
import { discoverPages } from './discovery.js';
import { buildSiteIndex } from './graph.js';
import { writeSiteIndex } from './index-writer.js';
import type { SiteCheckResult } from './model.js';
import { renderSite, resolveHomePage } from './renderer.js';
import { normalizeBaseUrl, normalizeRouting } from './routing.js';
import { TypstAdapter } from './typst-adapter.js';

export async function checkSite(config: TypwikiConfig): Promise<SiteCheckResult> {
  const files = await discoverPages(config.root, config.pagesDir);
  const routing = normalizeRouting(config.routing);
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const adapter = new TypstAdapter({ root: config.root, typstBin: config.typstBin, baseUrl, pagePrefix: routing.pagePrefix });
  const pages = await Promise.all(files.map((file) => adapter.parsePage(file)));
  const index = buildSiteIndex(pages, routing, baseUrl, config.navigation);
  if (config.homePageId !== undefined) resolveHomePage(index.index, config.homePageId);
  return index;
}

export async function buildSite(config: TypwikiConfig): Promise<SiteCheckResult> {
  const indexPath = join(config.root, config.generatedDir, 'site-index.json');
  const result = await checkSite(config);
  await buildClientAssets(config.root);
  await writeSiteIndex(indexPath, result.index);
  await renderSite(config, result.index);
  return result;
}
