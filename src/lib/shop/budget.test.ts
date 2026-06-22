import { describe, it, expect } from "vitest";
import { bandToTotal, itemCap, CATEGORY_WEIGHTS } from "./budget";

describe("bandToTotal", () => {
  it("maps bands to euro totals and skip/null to no cap", () => {
    expect(bandToTotal("low")).toBe(800);
    expect(bandToTotal("mid")).toBe(2000);
    expect(bandToTotal("high")).toBe(4000);
    expect(bandToTotal("skip")).toBeNull();
    expect(bandToTotal(null)).toBeNull();
  });
});

describe("itemCap", () => {
  it("gives the sofa the biggest slice", () => {
    expect(itemCap(2000, "sofa")).toBeGreaterThan(itemCap(2000, "coffee_table")!);
    expect(itemCap(2000, "sofa")).toBe(800);
    expect(itemCap(2000, "coffee_table")).toBe(200);
  });

  it("returns null (no cap) when there is no total", () => {
    expect(itemCap(null, "sofa")).toBeNull();
  });

  it("falls back to the 'other' weight for an unknown category", () => {
    // @ts-expect-error testing the runtime fallback for an out-of-vocab category
    expect(itemCap(1000, "spaceship")).toBe(Math.round(1000 * CATEGORY_WEIGHTS.other));
  });
});
