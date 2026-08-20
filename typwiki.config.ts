import { resolve } from "node:path";

export const config = {
  root: resolve(import.meta.dirname),
  pagesDir: "pages",
  libDir: "lib",
  generatedDir: ".typwiki/generated",
  publicDir: "public",
  routing: {
    pagePrefix: "/p",
    reservedPaths: ["/assets"],
  },
  typstBin: process.env.TYPST_BIN ?? "typst",
  port: Number(process.env.PORT ?? 4173),
};

export type TypwikiConfig = typeof config;
