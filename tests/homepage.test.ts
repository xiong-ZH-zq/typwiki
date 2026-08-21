import { afterEach, describe, expect, it } from "vitest";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TypwikiConfig } from "../typwiki.config.js";
import { TypwikiError, type SiteIndex } from "../src/model.js";
import { checkSite } from "../src/pipeline.js";
import { renderSite, resolveHomePage } from "../src/renderer.js";

const roots: string[] = [];

const index: SiteIndex = {
  version: 3,
  baseUrl: "/typwiki",
  routing: { pagePrefix: "/p", reservedPaths: ["/", "/__typwiki"] },
  pages: [
    {
      file: "pages/home.typ",
      id: "home",
      title: "Home",
      tagTable: false,
      linkTable: false,
      outgoing: [],
      tags: [],
      backlinks: [],
    },
    {
      file: "pages/guide/welcome.typ",
      id: "guide/welcome",
      title: "Welcome",
      tagTable: false,
      linkTable: false,
      outgoing: [],
      tags: [],
      backlinks: [],
    },
  ],
  tags: {},
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("resolveHomePage", () => {
  it("resolves a configured stable page ID", () => {
    expect(resolveHomePage(index, "guide/welcome")).toMatchObject({ id: "guide/welcome", title: "Welcome" });
  });

  it("rejects an unknown configured page ID", () => {
    expect(() => resolveHomePage(index, "missing")).toThrow(TypwikiError);
  });
});

describe("checkSite homepage", () => {
  it("rejects an unknown homepage ID before rendering", async () => {
    const root = await createProjectRoot();
    await expect(checkSite(createConfig(root, "missing"))).rejects.toThrow("Configured homepage page ID does not exist: missing");
  });
});

describe("renderSite homepage", () => {
  it("copies the configured page output to the root index.html", async () => {
    const root = await createProjectRoot();
    const config = createConfig(root, "guide/welcome");

    await renderSite(config, index);

    const page = await readFile(join(root, "public", "p", "guide", "welcome", "index.html"), "utf8");
    const home = await readFile(join(root, "public", "index.html"), "utf8");
    expect(home).not.toBe(page);
    expect(home).toContain('data-source="welcome.typ"');
    expect(home).toContain('<base href="/typwiki/p/guide/welcome/">');
    expect(home).toContain('src="assets/cover.svg"');
    expect(page).not.toContain("<base ");
    expect(home).toContain('/typwiki/assets/themes/test-theme/theme.css');
  });

  it("keeps the generated page directory when no homepage is configured", async () => {
    const root = await createProjectRoot();

    await renderSite(createConfig(root), index);

    const home = await readFile(join(root, "public", "index.html"), "utf8");
    expect(home).toContain('href="/typwiki/p/home/"');
    expect(home).toContain('href="/typwiki/p/guide/welcome/"');
  });
});

async function createProjectRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "typwiki-homepage-"));
  roots.push(root);
  await mkdir(join(root, "assets", "themes", "test-theme"), { recursive: true });
  await mkdir(join(root, "pages", "guide"), { recursive: true });
  await writeFile(join(root, "assets", "themes", "test-theme", "theme.css"), "body {}", "utf8");
  await writeFile(join(root, "pages", "home.typ"), "Home", "utf8");
  await writeFile(join(root, "pages", "guide", "welcome.typ"), "Welcome", "utf8");
  await writeFile(join(root, "fake-typst.mjs"), `#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
const args = process.argv.slice(2);
if (args[0] === "eval") {
  const selector = args.at(-1);
  const input = args[args.indexOf("--in") + 1];
  const metadata = selector.includes("typwiki-page")
    ? [{ kind: "page", id: input.includes("welcome") ? "guide/welcome" : "home", title: input.includes("welcome") ? "Welcome" : "Home", tagTable: false, linkTable: false }]
    : [];
  process.stdout.write(JSON.stringify(metadata));
} else {
  const input = args.at(-2);
  const output = args.at(-1);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, \`<!doctype html><html><head><title>Fake</title></head><body><main data-source="\${basename(input)}"><img src="assets/cover.svg"></main></body></html>\`);
}
`, "utf8");
  await chmod(join(root, "fake-typst.mjs"), 0o755);
  return root;
}

function createConfig(root: string, homePageId?: string): TypwikiConfig {
  return {
    root,
    pagesDir: "pages",
    libDir: "lib",
    generatedDir: ".typwiki/generated",
    publicDir: "public",
    baseUrl: "/typwiki",
    homePageId,
    theme: "test-theme",
    routing: { pagePrefix: "/p", reservedPaths: ["/assets"] },
    typstBin: join(root, "fake-typst.mjs"),
    port: 4173,
  };
}
