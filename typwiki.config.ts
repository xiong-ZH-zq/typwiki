import { resolve } from "node:path";
import type { NavigationEntry } from "./src/model.js";

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

export const config: TypwikiConfig = {
  root: resolve(import.meta.dirname),
  pagesDir: "pages",
  libDir: "lib",
  generatedDir: ".typwiki/generated",
  publicDir: "public",
  baseUrl: process.env.TYPWIKI_BASE_URL ?? "",
  homePageId: "home",
  theme: "academic-paper",
  routing: {
    pagePrefix: "/p",
    reservedPaths: ["/assets"],
  },
  typstBin: process.env.TYPST_BIN ?? "typst",
  port: Number(process.env.PORT ?? 4173),
  navigation: [
    { id: "home", label: "Home" },
    { id: "typwiki-intro", label: "Introduction" },
    { href: "https://github.com/xzqbear/typwiki", label: "GitHub" },
  ],
};
