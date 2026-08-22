import { resolve } from 'node:path';
import type { NavigationEntry } from './src/model.js';

export interface TypwikiConfig {
  root: string;
  pagesDir: string;
  libDir: string;
  generatedDir: string;
  publicDir: string;
  baseUrl: string;
  homePageId?: string;
  theme: string;
  routing: {
    pagePrefix: string;
    reservedPaths: string[];
  };
  /** Optional header navigation. Omit to render every page automatically. */
  navigation?: NavigationEntry[];
  typstBin: string;
  port: number;
}

/**
 * For users:
 * 
 * You can modify this configuration file to customize the behavior of Typwiki. 
 * The configuration options include paths for pages, libraries, generated files, 
 * and public assets, as well as settings for routing, navigation, and the Typst binary. 
 * Adjust these settings according to your project's needs.
 */

export const config: TypwikiConfig = {
  root: resolve(import.meta.dirname),
  pagesDir: 'pages',
  libDir: 'lib',
  generatedDir: '.typwiki/generated',
  publicDir: 'public',
  baseUrl: process.env.TYPWIKI_BASE_URL ?? '',
  homePageId: 'home',
  theme: 'academic-paper',
  routing: {
    pagePrefix: '/p',
    reservedPaths: ['/assets'],
  },
  typstBin: process.env.TYPST_BIN ?? 'typst',
  port: Number(process.env.PORT ?? 4173),

  // Header navigation cofiguration
  // Use `id` to link to a page in wiki, `href` to link to an external URL.
  navigation: [
    { id: 'home', label: 'Home' },
    { id: 'typwiki-intro', label: 'Introduction' },
    { href: 'https://github.com/xiong-zh-zq/typwiki', label: 'GitHub' },
  ],
};
