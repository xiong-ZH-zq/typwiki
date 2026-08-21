import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { themeStylesheetHref, validateThemeId } from "../src/assets.js";

describe("theme assets", () => {
  it("builds a deployment-aware stylesheet URL", () => {
    expect(themeStylesheetHref("", "academic-paper")).toBe("/assets/themes/academic-paper/theme.css");
    expect(themeStylesheetHref("/typwiki", "academic-paper")).toBe("/typwiki/assets/themes/academic-paper/theme.css");
  });

  it("accepts safe theme IDs and rejects traversal", () => {
    expect(() => validateThemeId("academic-paper")).not.toThrow();
    expect(() => validateThemeId("../outside")).toThrow();
    expect(() => validateThemeId("Paper Theme")).toThrow();
  });
});
