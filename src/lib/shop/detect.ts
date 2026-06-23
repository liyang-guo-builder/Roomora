/* Roomora — locate shoppable items in a design with Florence-2 (open-vocabulary
   detection on fal). This replaces asking a general LLM to "spot" items, which
   it does unreliably. Florence returns a box per furniture phrase; we map each
   to our category vocabulary and tag it hero/minor. Server-only (uses FAL_KEY). */

import "server-only";
import { asShopCategory, type ShopCategory } from "./categories";

export interface ItemBox { x: number; y: number; w: number; h: number }

export interface DetectedItem {
  category: ShopCategory;
  /** "hero" = defining furniture (shown by default); "minor" = small decor. */
  tier: "hero" | "minor";
  /** Human label from the detector, e.g. "coffee table". */
  label: string;
  /** Pixel bounding box in the design image's own coordinate space. */
  box: ItemBox;
}

/** Furniture phrases we ask Florence to find (covers our categories). */
const VOCAB =
  "sofa. armchair. coffee table. side table. rug. floor lamp. table lamp. " +
  "shelving. bookshelf. sideboard. dresser. plant. wall art. mirror. " +
  "chandelier. pendant light. cushion.";

/** Map a detector label to our category vocabulary. */
function labelToCategory(label: string): ShopCategory {
  const l = label.toLowerCase();
  if (l.includes("sofa") || l.includes("couch") || l.includes("sectional")) return "sofa";
  if (l.includes("armchair") || l.includes("accent chair") || l === "chair") return "armchair";
  if (l.includes("coffee table")) return "coffee_table";
  if (l.includes("side table") || l.includes("end table") || l.includes("nightstand")) return "side_table";
  if (l.includes("rug") || l.includes("carpet")) return "rug";
  if (l.includes("floor lamp")) return "floor_lamp";
  if (l.includes("table lamp") || l.includes("lamp")) return "table_lamp";
  if (l.includes("shelv") || l.includes("bookshelf") || l.includes("sideboard") || l.includes("dresser") || l.includes("cabinet")) return "shelving";
  if (l.includes("plant")) return "plant";
  if (l.includes("wall art") || l.includes("painting") || l.includes("picture") || l.includes("frame") || l.includes("mirror")) return "wall_art";
  if (l.includes("cushion") || l.includes("pillow")) return "cushion";
  return asShopCategory(l);
}

const HERO: ReadonlySet<ShopCategory> = new Set<ShopCategory>([
  "sofa", "armchair", "coffee_table", "side_table", "rug", "floor_lamp", "shelving",
]);

/**
 * Detect shoppable items in the design at `imageUrl` (a public URL fal can fetch).
 * Returns up to 8 items, hero pieces first. Throws on transport/API failure.
 */
export async function detectItems(
  imageUrl: string,
  falKey: string,
): Promise<DetectedItem[]> {
  const res = await fetch(
    "https://fal.run/fal-ai/florence-2-large/caption-to-phrase-grounding",
    {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, text_input: VOCAB }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`florence_error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    results?: { bboxes?: { x: number; y: number; w: number; h: number; label?: string }[] };
  };
  const raw = json.results?.bboxes ?? [];

  const items: DetectedItem[] = [];
  for (const b of raw) {
    if (![b.x, b.y, b.w, b.h].every((v) => typeof v === "number" && isFinite(v))) continue;
    if (b.w < 24 || b.h < 24) continue; // ignore slivers
    const label = (b.label ?? "").trim();
    const category = labelToCategory(label);
    items.push({
      category,
      tier: HERO.has(category) ? "hero" : "minor",
      label: label ? label.charAt(0).toUpperCase() + label.slice(1) : category,
      box: { x: b.x, y: b.y, w: b.w, h: b.h },
    });
  }
  // Dedupe by category, keeping the largest (most prominent) box — so two
  // detected armchairs collapse into one "Armchair" row.
  const byCat = new Map<ShopCategory, DetectedItem>();
  for (const it of items) {
    const prev = byCat.get(it.category);
    if (!prev || it.box.w * it.box.h > prev.box.w * prev.box.h) {
      byCat.set(it.category, it);
    }
  }
  // Hero pieces first, then biggest first — so the most prominent items lead the
  // list (the UI shows the top few and tucks the rest behind "show more").
  const deduped = [...byCat.values()].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === "hero" ? -1 : 1;
    return b.box.w * b.box.h - a.box.w * a.box.h;
  });
  return deduped.slice(0, 8);
}
