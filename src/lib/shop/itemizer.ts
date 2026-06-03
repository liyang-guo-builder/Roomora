/* Roomora — server-side design itemizer.
   Mirrors captionInspiration() in api/generate but instead of a prose caption it
   asks MiniMax vision to return a JSON array of the buyable furniture/decor items
   visible in a generated room design. Server-only (uses MINIMAX_API_KEY). */

import "server-only";
import { asShopCategory, SHOP_CATEGORIES, type ShopCategory } from "./categories";

export interface DesignItem {
  category: ShopCategory;
  /** Short search phrase, e.g. "round walnut coffee table". */
  query: string;
  color: string;
  material: string;
}

const ITEMIZE_PROMPT = `You are a furniture-spotting assistant for a "shop this look" feature.
Look at this interior room image and list the distinct, buyable furniture and decor items you can see.
Return ONLY a JSON array (no prose, no markdown fences). 5 to 8 items maximum, the most prominent ones.
Each element must be an object with exactly these keys:
  "category": one of ${JSON.stringify([...SHOP_CATEGORIES])}
  "query": a short shopping search phrase (2-5 words), e.g. "round walnut coffee table"
  "color": the dominant colour, e.g. "sage green" (empty string if unclear)
  "material": the main material, e.g. "oak" or "linen" (empty string if unclear)
Only include items that map to one of the listed categories. Do not include walls, floors, windows, doors or ceilings.
Example: [{"category":"sofa","query":"sage linen 3-seater sofa","color":"sage green","material":"linen"}]`;

/** Strip code fences and pull the first JSON array out of an LLM response. */
function extractJsonArray(raw: string): unknown[] {
  let s = raw.trim();
  // Remove ```json ... ``` or ``` ... ``` fences.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Tolerate prose around the array: grab from the first '[' to the last ']'.
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Itemize a generated design image into 5-8 shoppable items.
 * `imageUrl` must be a publicly reachable URL (e.g. a Supabase public URL).
 * Throws on transport/API failure so callers can surface an error.
 */
export async function itemizeDesign(
  imageUrl: string,
  apiKey: string,
): Promise<DesignItem[]> {
  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") ||
    "https://api.minimaxi.com";
  const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ITEMIZE_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`minimax_error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    base_resp?: { status_code?: number; status_msg?: string };
  };
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(
      `minimax_status ${json.base_resp.status_code}: ${json.base_resp.status_msg ?? ""}`,
    );
  }
  const content = json.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("minimax_no_content");
  }

  const arr = extractJsonArray(content);
  const items: DesignItem[] = [];
  for (const el of arr) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const query = typeof o.query === "string" ? o.query.trim() : "";
    if (!query) continue;
    items.push({
      category: asShopCategory(o.category),
      query,
      color: typeof o.color === "string" ? o.color.trim() : "",
      material: typeof o.material === "string" ? o.material.trim() : "",
    });
    if (items.length >= 8) break;
  }
  return items;
}
