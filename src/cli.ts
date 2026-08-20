// cli.ts
// basic cli support for Typwiki

import { config } from "../typwiki.config.js";
import { formatDiagnostic, TypwikiError } from "./model.js";
import { buildSite, checkSite } from "./pipeline.js";
import { startServer } from "./server.js";

const command = process.argv[2] ?? "help";

/** 
 * Main entry point for Typwiki CLI;
 * 
 * Available commands:
 * 
 * - `npm run check`
 * - `npm run build`
 * - `npm run serve`
 */
try {
  if (command === "check") {
    const result = await checkSite(config);
    for (const diagnostic of result.diagnostics) console.warn(formatDiagnostic(diagnostic));
    console.log(`Examine: ${result.index.pages.length} pages, ${Object.keys(result.index.tags).length} tags.`);
  } else if (command === "build") {
    const result = await buildSite(config);
    for (const diagnostic of result.diagnostics) console.warn(formatDiagnostic(diagnostic));
    console.log(`Build complete: ${result.index.pages.length} pages output to ${config.publicDir}/.`);
  } else if (command === "serve") {
    await startServer(config);
  } else {
    console.error("Usage: typwiki <check|build|serve>");
    process.exitCode = 1;
  }
} catch (error: unknown) {
  if (error instanceof TypwikiError) {
    for (const diagnostic of error.diagnostics) console.error(formatDiagnostic(diagnostic));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
