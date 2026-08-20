// tags.test.ts
// Simple test for flattenTags
import { describe, expect, it } from "vitest";
import { flattenTags } from "../src/tags.js";


describe("flattenTags", () => {
  it("flattens nested dictionaries and lists deterministically", () => {
    expect(
      flattenTags({
        topic: ["typst", "wiki"],
        maintenance: { 
          status: "active", 
          release: { 
            year: 2026 
          },
          github: true, 
        },
      })
    ).toEqual([
      "maintenance/github",
      "maintenance/release/year=2026",
      "maintenance/status/active",
      "topic/typst",
      "topic/wiki",
    ]);
  });
});
