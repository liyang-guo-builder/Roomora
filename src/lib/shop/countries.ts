/* Roomora — "Shop this look" supported markets. The user picks where they are;
   it drives the Google Shopping locale AND the language we write the search
   query in. Adding a market is a one-line entry here. All current markets use
   EUR, so the euro budget bands apply as-is (revisit if we add GBP/CHF). */

export interface ShopCountry {
  /** Stable code used in the UI + cache key. */
  code: string;
  /** Google country / language / location for SearchApi. */
  gl: string;
  hl: string;
  location: string;
  /** Language name for the describe prompt, e.g. "French". */
  lang: string;
  /** ISO currency the market prices in. */
  currency: string;
  /** [en, zh] display label. */
  label: [string, string];
}

export const SHOP_COUNTRIES: ShopCountry[] = [
  { code: "FR", gl: "fr", hl: "fr", location: "France", lang: "French", currency: "EUR", label: ["France", "法国"] },
  { code: "ES", gl: "es", hl: "es", location: "Spain", lang: "Spanish", currency: "EUR", label: ["Spain", "西班牙"] },
  { code: "DE", gl: "de", hl: "de", location: "Germany", lang: "German", currency: "EUR", label: ["Germany", "德国"] },
  { code: "IT", gl: "it", hl: "it", location: "Italy", lang: "Italian", currency: "EUR", label: ["Italy", "意大利"] },
  { code: "BE", gl: "be", hl: "fr", location: "Belgium", lang: "French", currency: "EUR", label: ["Belgium", "比利时"] },
];

export const DEFAULT_COUNTRY = "FR";

/** Resolve a country code to its config, falling back to the default. */
export function getCountry(code: string | null | undefined): ShopCountry {
  return (
    SHOP_COUNTRIES.find((c) => c.code === code) ??
    SHOP_COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)!
  );
}
