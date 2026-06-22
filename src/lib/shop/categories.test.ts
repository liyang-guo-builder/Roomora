import { describe, it, expect } from "vitest";
import { asShopCategory, SHOP_CATEGORIES } from "./categories";

describe("asShopCategory", () => {
  it("passes through every known category unchanged", () => {
    for (const c of SHOP_CATEGORIES) {
      expect(asShopCategory(c)).toBe(c);
    }
  });

  it("coerces unknown / non-string values to 'other'", () => {
    expect(asShopCategory("banana")).toBe("other");
    expect(asShopCategory("")).toBe("other");
    expect(asShopCategory(null)).toBe("other");
    expect(asShopCategory(undefined)).toBe("other");
    expect(asShopCategory(42)).toBe("other");
  });
});
