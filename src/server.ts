// server.ts
// This module provides a development server for Typwiki. 
// It uses Fastify to serve the generated site and provides live reloading capabilities. 
// The server watches for changes in the source files and rebuilds the site automatically, 
// notifying connected clients to reload the page when changes occur.

import { readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import chokidar from "chokidar";
import type { TypwikiConfig } from "../typwiki.config.js";
import type { Diagnostic, SiteIndex } from "./model.js";
import { formatDiagnostic, TypwikiError } from "./model.js";
import { buildSite } from "./pipeline.js";
import { renderHomePage } from "./renderer.js";
import { themeStylesheetHref } from "./assets.js";
import { normalizeRouting, pageOutputRoot } from "./routing.js";

const reloadScript = `<script>
const source = new EventSource('/__typwiki/events');
const showDiagnostics = async () => {
  const { error, diagnostics } = await fetch('/__typwiki/diagnostics').then((response) => response.json());
  const messages = error ? [error] : diagnostics.map((diagnostic) =>
    diagnostic.file ? diagnostic.file + ': ' + diagnostic.message : diagnostic.message);
  const notice = document.getElementById('__typwiki-diagnostics');
  if (!messages.length) {
    notice?.remove();
    return;
  }
  const element = notice || document.createElement('pre');
  element.id = '__typwiki-diagnostics';
  element.style.cssText = 'position:fixed;inset:auto 1rem 1rem;max-width:calc(100% - 2rem);margin:0;padding:1rem;white-space:pre-wrap;z-index:9999';
  element.style.background = error ? '#fff0f0' : '#fff8db';
  element.style.border = error ? '1px solid #b42318' : '1px solid #b98900';
  element.style.color = error ? '#5c1111' : '#5b4300';
  element.textContent = messages.join('\\n');
  if (!notice) document.body.append(element);
};
source.addEventListener('reload', () => location.reload());
source.addEventListener('build-error', showDiagnostics);
showDiagnostics();
</script>`;

export async function startServer(config: TypwikiConfig): Promise<void> {
  let lastError: string | null = null;
  let lastDiagnostics: Diagnostic[] = [];
  const clients = new Set<import("node:http").ServerResponse>();
  const app = Fastify({ logger: false });
  await app.register(fastifyStatic, {
    root: resolve(config.root, config.publicDir, "assets"),
    prefix: "/assets/",
    decorateReply: false,
  });

  try {
    const result = await buildSite(config);
    lastDiagnostics = result.diagnostics;
    for (const diagnostic of lastDiagnostics) console.warn(formatDiagnostic(diagnostic));
  } catch (error: unknown) {
    lastError = messageFor(error);
    console.error(lastError);
  }

  app.get("/", async (_request, reply) => {
    const index = await readIndex(config);
    const html = renderHomePage(index, themeStylesheetHref(index.baseUrl, config.theme));
    return reply.type("text/html").send(`${html.replace("</body>", `${lastError ? `<pre>${escapeHtml(lastError)}</pre>` : ""}${reloadScript}</body>`)}`);
  });

  const routing = normalizeRouting(config.routing);
  app.get(`${routing.pagePrefix}/*`, async (request, reply) => {
    const routePath = request.params as { "*": string };
    const requested = routePath["*"] === "" ? "index.html" : routePath["*"];
    const outputRoot = pageOutputRoot(config.root, config.publicDir, routing);
    const candidate = resolve(outputRoot, requested.endsWith("/") ? `${requested}index.html` : requested);
    const safeRelative = relative(outputRoot, candidate);
    if (safeRelative.startsWith(`..${sep}`) || safeRelative === "..") return reply.code(404).send();

    try {
      const html = await readFile(candidate, "utf8");
      return reply.type("text/html; charset=utf-8").send(injectReloadScript(html));
    } catch {
      return reply.code(404).type("text/plain; charset=utf-8").send("页面不存在。");
    }
  });

  app.get("/__typwiki/diagnostics", async () => ({ error: lastError, diagnostics: lastDiagnostics }));
  app.get("/__typwiki/events", async (_request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    reply.raw.write("retry: 1000\n\n");
    clients.add(reply.raw);
    reply.raw.on("close", () => clients.delete(reply.raw));
  });

  let timer: NodeJS.Timeout | undefined;
  const watcher = chokidar.watch([join(config.root, config.pagesDir), join(config.root, config.libDir), join(config.root, "assets"), join(config.root, "typwiki.config.ts")], { ignoreInitial: true });
  watcher.on("all", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const result = await buildSite(config);
        lastError = null;
        lastDiagnostics = result.diagnostics;
        for (const diagnostic of lastDiagnostics) console.warn(formatDiagnostic(diagnostic));
        broadcast(clients, "reload");
      } catch (error: unknown) {
        lastError = messageFor(error);
        lastDiagnostics = [];
        console.error(lastError);
        broadcast(clients, "build-error");
      }
    }, 150);
  });

  await app.listen({ host: "127.0.0.1", port: config.port });
  console.log(`Server started at: http://127.0.0.1:${config.port}`);
}

async function readIndex(config: TypwikiConfig): Promise<Pick<SiteIndex, "baseUrl" | "pages" | "routing">> {
  const path = join(config.root, config.generatedDir, "site-index.json");
  try {
    return JSON.parse(await readFile(path, "utf8")) as Pick<SiteIndex, "baseUrl" | "pages" | "routing">;
  } catch {
    return { baseUrl: config.baseUrl, pages: [], routing: normalizeRouting(config.routing) };
  }
}

function broadcast(clients: Set<import("node:http").ServerResponse>, event: "reload" | "build-error"): void {
  for (const client of clients) client.write(`event: ${event}\ndata: changed\n\n`);
}

function injectReloadScript(html: string): string {
  return html.includes("</body>") ? html.replace("</body>", `${reloadScript}</body>`) : `${html}${reloadScript}`;
}

function messageFor(error: unknown): string {
  return error instanceof TypwikiError ? error.message : String(error);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}
