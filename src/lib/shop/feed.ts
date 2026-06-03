/* Roomora — Awin feed parsing + normalization (server-side).
   Mirrors scripts/ingest-awin.mjs so the nightly cron route and the CLI script
   share the same column mapping and category normalization. */

import "server-only";
import { asShopCategory, type ShopCategory } from "./categories";

export interface ProductUpsert {
  advertiser: string;
  external_id: string;
  title: string;
  description: string;
  category: ShopCategory;
  price: number | null;
  currency: string;
  image_url: string | null;
  deeplink: string | null;
  brand: string | null;
  in_stock: boolean;
  updated_at: string;
}

/** Map a raw merchant category string → a normalized ShopCategory. */
export function normalizeCategory(raw: string): ShopCategory {
  const s = (raw || "").toLowerCase();
  if (/\bsofa|couch|settee\b/.test(s)) return "sofa";
  if (/armchair|accent chair|lounge chair|\bchairs?\b/.test(s)) return "armchair";
  if (/coffee table/.test(s)) return "coffee_table";
  if (/side|end table|bedside|nightstand/.test(s)) return "side_table";
  if (/rug|carpet|tapis/.test(s)) return "rug";
  if (/floor lamp|standing lamp/.test(s)) return "floor_lamp";
  if (/table lamp|desk lamp/.test(s)) return "table_lamp";
  if (/shelv|bookcase|bookshelf|storage|cabinet/.test(s)) return "shelving";
  if (/plant|greenery|fig|tree|botanical pot/.test(s)) return "plant";
  if (/wall art|print|poster|painting|framed/.test(s)) return "wall_art";
  if (/cushion|pillow|throw/.test(s)) return "cushion";
  if (/lighting|lamp/.test(s)) return "table_lamp";
  return "other";
}

/** Refine ambiguous lighting / "other" using the product name as a tiebreaker. */
export function refineCategory(category: ShopCategory, name: string): ShopCategory {
  const n = (name || "").toLowerCase();
  if (category === "table_lamp" && /floor lamp|arc lamp|tripod/.test(n)) return "floor_lamp";
  if (category === "other") {
    if (/floor lamp/.test(n)) return "floor_lamp";
    if (/table lamp|mushroom lamp/.test(n)) return "table_lamp";
  }
  return asShopCategory(category);
}

/** Minimal CSV parser handling quoted fields and embedded commas/newlines. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else if (c === "\r") {
      /* skip */
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Parse an Awin-shaped CSV feed into product upsert rows. */
export function parseAwinFeed(csv: string): ProductUpsert[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const col = {
    id: idx("aw_product_id"),
    name: idx("product_name"),
    desc: idx("description"),
    cat: idx("merchant_category"),
    price: idx("search_price"),
    currency: idx("currency"),
    image: idx("aw_image_url"),
    deeplink: idx("aw_deep_link"),
    brand: idx("brand_name"),
    advertiser: idx("advertiser"),
  };
  const now = new Date().toISOString();
  const out: ProductUpsert[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const externalId = row[col.id]?.trim();
    if (!externalId) continue;
    const name = row[col.name]?.trim() ?? "";
    const category = refineCategory(
      normalizeCategory(row[col.cat]?.trim() ?? ""),
      name,
    );
    const price = parseFloat(row[col.price]);
    out.push({
      advertiser: row[col.advertiser]?.trim() || "unknown",
      external_id: externalId,
      title: name,
      description: row[col.desc]?.trim() ?? "",
      category,
      price: Number.isFinite(price) ? price : null,
      currency: row[col.currency]?.trim() || "EUR",
      image_url: row[col.image]?.trim() || null,
      deeplink: row[col.deeplink]?.trim() || null,
      brand: row[col.brand]?.trim() || null,
      in_stock: true,
      updated_at: now,
    });
  }
  return out;
}
