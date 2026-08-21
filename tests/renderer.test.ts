import { describe, expect, it } from "vitest";
import { TypwikiError, type SiteIndex } from "../src/model.js";
import { extractTypstDocument, resolveHomePage, wrapTypstHtml } from "../src/renderer.js";

const index = (baseUrl: string): SiteIndex => ({
  version: 3,
  baseUrl,
  routing: { pagePrefix: "/p", reservedPaths: ["/", "/__typwiki"] },
  pages: [{
    file: "pages/note.typ",
    id: "note",
    title: "A <note>",
    tagTable: false,
    linkTable: false,
    outgoing: [],
    tags: [],
    backlinks: [],
  }],
  tags: {},
});

const stylesheet = "/assets/themes/academic-paper/theme.css";

describe("extractTypstDocument", () => {
  it("extracts head and body while dropping the original title", () => {
    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Intro</title><style>math{font:serif}</style></head><body><h1>Intro</h1></body></html>';
    const document = extractTypstDocument(html);

    expect(document.title).toBe("Intro");
    expect(document.head).toContain("<style>math{font:serif}</style>");
    expect(document.head).not.toContain("<title>");
    expect(document.body).toBe("<h1>Intro</h1>");
  });

  it("rejects documents without a body or head", () => {
    expect(() => extractTypstDocument("<html><head></head></html>")).toThrow(TypwikiError);
    expect(() => extractTypstDocument("<html><body></body></html>")).toThrow(TypwikiError);
  });

  it("rejects documents with multiple body closing tags", () => {
    expect(() => extractTypstDocument("<html><head></head><body>one</body>two</body></html>")).toThrow(TypwikiError);
  });

  it("drops duplicated charset and viewport metas from the head", () => {
    const document = extractTypstDocument(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>.m{}</style></head><body>x</body></html>',
    );

    expect(document.head).not.toContain("charset");
    expect(document.head).not.toContain("viewport");
    expect(document.head).toContain("<style>.m{}</style>");
  });
});

describe("wrapTypstHtml", () => {
  it("wraps the Typst body in the site shell and preserves head styles", () => {
    const html = '<!DOCTYPE html><html><head><title>A &lt;note&gt;</title><style>.m{}</style></head><body><p>Body</p></body></html>';
    const wrapped = wrapTypstHtml(html, { index: index(""), page: index("").pages[0], stylesheet });

    expect(wrapped).toContain('<article class="typwiki-article" data-page-id="note"><p>Body</p></article>');
    expect(wrapped).toContain("<style>.m{}</style>");
    expect(wrapped).toContain(stylesheet);
    expect(wrapped).toContain('data-typwiki-region="navigation"');
    expect(wrapped).toContain('data-typwiki-region="relations"');
  });

  it("anchors headings and excludes the page title heading from the TOC", () => {
    const html =
      '<!DOCTYPE html><html><head><title>Note</title></head><body><h2>Note</h2><h3>Details</h3><p>Body</p></body></html>';
    const wrapped = wrapTypstHtml(html, { index: index(""), page: index("").pages[0], stylesheet });

    expect(wrapped).toContain('<h2 id="note">Note</h2>');
    expect(wrapped).toContain('<h3 id="details">Details</h3>');
    expect(wrapped).toContain('<a href="#details">Details</a>');
    expect(wrapped).not.toContain('<a href="#note">');
  });
});

describe("resolveHomePage", () => {
  it("returns the configured page by stable ID", () => {
    const page = resolveHomePage(index(""), "note");
    expect(page).toMatchObject({ id: "note", title: "A <note>" });
  });

  it("rejects a configured page ID that does not exist", () => {
    expect(() => resolveHomePage(index(""), "missing")).toThrow(TypwikiError);
  });
});
