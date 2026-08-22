// vite.ts
// Programmatic Vite build for the client-side assets. The main site pages are
// server-rendered by `render-site.tsx` (tsx + React), so Vite only produces the
// hydration bundle and the Tailwind stylesheet that the generated HTML links to.
//
// It is invoked at the start of every `buildSite` run and re-run on each dev
// server rebuild so component/style changes are picked up.

import { join } from 'node:path';
import { build } from 'vite';

/**
 * Builds the client assets (hydration bundle + Tailwind stylesheet) into the
 * site's `public/assets` directory using the project's `vite.config.ts`.
 *
 * The build is silent and shares the configured output filenames so the HTML
 * produced by the pipeline always references the right files.
 *
 * @param root The project root containing `vite.config.ts`.
 */
export async function buildClientAssets(root: string): Promise<void> {
  await build({ configFile: join(root, 'vite.config.ts'), logLevel: 'silent' });
}
