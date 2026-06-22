import { describe, it, expect } from "vitest";
import { extractJsonArray } from "./parseItems";

describe("extractJsonArray", () => {
  it("parses a plain JSON array", () => {
    expect(extractJsonArray('[{"a":1},{"b":2}]')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("strips ```json code fences", () => {
    const raw = '```json\n[{"category":"sofa"}]\n```';
    expect(extractJsonArray(raw)).toEqual([{ category: "sofa" }]);
  });

  it("tolerates prose around the array", () => {
    const raw = 'Sure, here are the items: [{"q":"rug"}] — hope that helps!';
    expect(extractJsonArray(raw)).toEqual([{ q: "rug" }]);
  });

  it("returns [] for unparseable text", () => {
    expect(extractJsonArray("no json here")).toEqual([]);
  });

  it("returns [] when the payload is a JSON object, not an array", () => {
    expect(extractJsonArray('{"a":1}')).toEqual([]);
  });
});
