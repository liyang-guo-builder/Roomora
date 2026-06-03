// Ingest an Awin product feed into public.products.
//
// Source: process.env.AWIN_FEED_URL (downloaded CSV) if set, else the local
// scripts/sample-awin-feed.csv fixture. Idempotent — upserts on
// (advertiser, external_id) via the Supabase admin (service-role) client.
//
// Usage: node scripts/ingest-awin.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const out = {};
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[t.slice(0, i).trim()] = v;
    }
  } catch {
    /* fall back to process.env */
  }
  return out;
}

const env = { ...loadEnv(resolve(process.cwd(), ".env.local")), ...process.env };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── Normalized category vocabulary (kept in sync with src/lib/shop/categories.ts). ──
const CATEGORIES = [
  "sofa", "armchair", "coffee_table", "side_table", "rug", "floor_lamp",
  "table_lamp", "shelving", "plant", "wall_art", "cushion", "other",
];

// Map a raw merchant category string → one of the normalized categories.
function normalizeCategory(raw) {
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
  // Generic lighting → split by name heuristics handled at row level; default lamp.
  if (/lighting|lamp/.test(s)) return "table_lamp";
  return "other";
}

// Refine "other"/ambiguous lighting using the product name as a tiebreaker.
function refineCategory(category, name) {
  const n = (name || "").toLowerCase();
  if (category === "table_lamp" && /floor lamp|arc lamp|tripod/.test(n)) return "floor_lamp";
  if (category === "other") {
    if (/floor lamp/.test(n)) return "floor_lamp";
    if (/table lamp|mushroom lamp/.test(n)) return "table_lamp";
  }
  return CATEGORIES.includes(category) ? category : "other";
}

// ── Minimal CSV parser that handles quoted fields and embedded commas. ──
function parseCSV(text) {
  const rows = [];
  let row = [];
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

async function loadFeed() {
  const url = env.AWIN_FEED_URL;
  if (url) {
    console.log(`Downloading feed from AWIN_FEED_URL: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`feed download failed: ${res.status}`);
    return res.text();
  }
  const local = resolve(process.cwd(), "scripts/sample-awin-feed.csv");
  console.log(`AWIN_FEED_URL not set — using local sample: ${local}`);
  return readFileSync(local, "utf8");
}

const csv = await loadFeed();
const rows = parseCSV(csv);
if (rows.length < 2) {
  console.error("Feed has no data rows.");
  process.exit(1);
}
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
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

const products = [];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const externalId = row[col.id]?.trim();
  if (!externalId) continue;
  const name = row[col.name]?.trim() ?? "";
  const rawCat = row[col.cat]?.trim() ?? "";
  const category = refineCategory(normalizeCategory(rawCat), name);
  const price = parseFloat(row[col.price]);
  products.push({
    advertiser: row[col.advertiser]?.trim() || "unknown",
    external_id: externalId,
    title: name,
    description: row[col.desc]?.trim() ?? "",
    category,
    price: Number.isFinite(price) ? price : null,
    currency: row[col.currency]?.trim() || "EUR",
    image_url: row[col.image]?.trim() ?? null,
    deeplink: row[col.deeplink]?.trim() ?? null,
    brand: row[col.brand]?.trim() ?? null,
    in_stock: true,
    updated_at: new Date().toISOString(),
  });
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Upsert in one shot (small feed). For large feeds, batch in chunks of ~500.
const { error } = await admin
  .from("products")
  .upsert(products, { onConflict: "advertiser,external_id" });
if (error) {
  console.error("Ingest FAILED:", error.message);
  process.exit(1);
}

const counts = products.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {});
console.log(`Ingested ${products.length} products.`);
console.log("By category:", JSON.stringify(counts));
