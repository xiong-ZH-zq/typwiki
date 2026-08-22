// cli.ts
// Command-line entry point for Typwiki.
//
// Available commands:
//
// - `npm run check`  — inspect the site graph without writing output
// - `npm run build`  — compile pages and write `public/`
// - `npm run serve`  — run the live development server
// - `npm run help`   — print this usage
//
// Each command reports its wall-clock time so slow builds are easy to spot.

import { performance } from 'node:perf_hooks';
import { config } from '../typwiki.config.js';
import { formatDiagnostic, TypwikiError } from './model.js';
import { buildSite, checkSite } from './pipeline.js';
import { startServer } from './server.js';

const command = process.argv[2] ?? 'help';

try {
  if (command === 'check') {
    const result = await timed(`check`, () => checkSite(config));
    for (const diagnostic of result.diagnostics) console.warn(formatDiagnostic(diagnostic));
    console.log(`Examine: ${result.index.pages.length} pages, ${Object.keys(result.index.tags).length} tags.`);
  } else if (command === 'build') {
    const result = await timed(`build`, () => buildSite(config));
    for (const diagnostic of result.diagnostics) console.warn(formatDiagnostic(diagnostic));
    console.log(`Build complete: ${result.index.pages.length} pages output to ${config.publicDir}/.`);
  } else if (command === 'serve') {
    await startServer(config);
  } else {
    console.error('Usage: typwiki <check|build|serve>');
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

/** Runs a command and logs its wall-clock time. */
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  const result = await fn();
  const elapsed = (performance.now() - startedAt).toFixed(0);
  console.log(`[${label}] finished in ${elapsed}ms`);
  return result;
}
