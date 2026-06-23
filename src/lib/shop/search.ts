/* Roomora — live product search via SearchApi (Google Shopping, France).
   Server-only (uses SEARCHAPI_KEY). Returns French-market listings with euro
   prices and buy links — the breadth + purchasability layer. Precision is added
   on top by the vision judge (./judge). */

import "server-only";

export interface RawProduct {
  title: string;
  /** Numeric euro price when SearchApi extracted one, else null. */
  price: number | null;
  /** Human price label, e.g. "179,99 €". */
  priceLabel: string;
  /** Retailer / seller name. */
  seller: string;
  /** Product page URL (the buy link). */
  link: string;
  /** Product thumbnail URL. */
  thumbnail: string;
}

export interface SearchLocale {
  gl: string;
  hl: string;
  location: string;
}

/**
 * Search Google Shopping in the given market (e.g. France, Spain) for one query.
 * Returns up to `limit` listings that have a thumbnail. Throws on transport /
 * API failure so the caller can surface an error.
 */
export async function searchProducts(
  query: string,
  apiKey: string,
  locale: SearchLocale,
  limit = 8,
): Promise<RawProduct[]> {
  const url =
    `https://www.searchapi.io/api/v1/search?engine=google_shopping` +
    `&q=${encodeURIComponent(query)}` +
    `&gl=${encodeURIComponent(locale.gl)}&hl=${encodeURIComponent(locale.hl)}` +
    `&location=${encodeURIComponent(locale.location)}` +
    `&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`searchapi_error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    shopping_results?: {
      title?: string;
      price?: string;
      extracted_price?: number;
      seller?: string;
      source?: string;
      product_link?: string;
      link?: string;
      thumbnail?: string;
    }[];
  };
  const results = json.shopping_results ?? [];
  const out: RawProduct[] = [];
  for (const r of results) {
    if (!r.thumbnail) continue;
    out.push({
      title: r.title ?? "",
      price: typeof r.extracted_price === "number" ? r.extracted_price : null,
      priceLabel: r.price ?? (r.extracted_price != null ? `${r.extracted_price} €` : ""),
      seller: r.seller ?? r.source ?? "",
      link: r.product_link ?? r.link ?? "",
      thumbnail: r.thumbnail,
    });
    if (out.length >= limit) break;
  }
  return out;
}
