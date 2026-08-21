import { describe, expect, it } from "vitest";
import { buildSiteIndex } from "../src/graph.js";
import { TypwikiError, type ParsedPage } from "../src/model.js";

const routing = { pagePrefix: "/p", reservedPaths: [] };

const page = (partial: Partial<ParsedPage>): ParsedPage => ({
  file: `${partial.id ?? "page"}.typ`,
  id: partial.id ?? "page",
  title: partial.title ?? partial.id ?? "Page",
  tagTable: false,
  linkTable: false,
  outgoing: [],
  tags: [],
  ...partial,
});

describe("buildSiteIndex", () => {
  it("computes backlinks and tag index", () => {
    const result = buildSiteIndex([
      page({ file: "drafts/first.typ", id: "a", outgoing: ["b"], tags: ["topic/typst"] }),
      page({ file: "archive/second.typ", id: "b", tags: ["topic/typst", "status=active"] }),
    ], routing, "/typwiki");

    expect(result.diagnostics).toEqual([]);
    expect(result.index).toMatchObject({ version: 3, baseUrl: "/typwiki" });
    expect(result.index.pages.find((item) => item.id === "b")?.backlinks).toEqual(["a"]);
    expect(result.index.tags["topic/typst"]).toEqual(["a", "b"]);
    expect(result.index.pages.find((item) => item.id === "a")).toMatchObject({ tagTable: false, linkTable: false });
  });

  it("reports missing link targets without blocking the index", () => {
    const result = buildSiteIndex([
      page({ id: "a", outgoing: ["b", "missing"] }),
      page({ id: "b" }),
    ], routing, "/typwiki");

    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: "warning", file: "a.typ", message: "Connection target does not exist: missing" }),
    ]);
    expect(result.index.pages.find((item) => item.id === "b")?.backlinks).toEqual(["a"]);
    expect(result.index.pages.find((item) => item.id === "a")?.backlinks).toEqual([]);
  });

  it("rejects duplicate page IDs from different files", () => {
    expect(() => buildSiteIndex([
      page({ file: "drafts/first.typ", id: "stable-id" }),
      page({ file: "archive/second.typ", id: "stable-id" }),
    ], routing, "/typwiki")).toThrow(TypwikiError);
  });

  it("carries the configured navigation into the index", () => {
    const result = buildSiteIndex([page({ id: "home" })], routing, "/typwiki", [{ id: "home", label: "Start" }]);
    expect(result.index.navigation).toEqual([{ id: "home", label: "Start" }]);
  });

  it("warns for navigation targets that do not exist", () => {
    const result = buildSiteIndex([page({ id: "home" })], routing, "/typwiki", [{ id: "ghost" }]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: "warning", message: "Navigation target does not exist: ghost" }),
    ]);
  });

  it("rejects navigation entries that set both id and href", () => {
    expect(() => buildSiteIndex([page({ id: "home" })], routing, "/typwiki", [{ id: "home", href: "/x", label: "X" }]))
      .toThrow(/cannot set both id and href/);
  });

  it("rejects navigation entries that set neither id nor href", () => {
    expect(() => buildSiteIndex([page({ id: "home" })], routing, "/typwiki", [{ label: "X" }]))
      .toThrow(/must set id or href/);
  });
});
