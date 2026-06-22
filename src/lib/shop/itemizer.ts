/* Roomora — server-side design itemizer.
   Mirrors captionInspiration() in api/generate but instead of a prose caption it
   asks MiniMax vision to return a JSON array of the buyable furniture/decor items
   visible in a generated room design. Server-only (uses MINIMAX_API_KEY). */

import "server-only";
import { asShopCategory, SHOP_CATEGORIES, type ShopCategory } from "./categories";
import { extractJsonArray } from "./parseItems";

/** MiniMax vision rejects remote image URLs (notably Supabase public URLs:
 *  status 2013 "disallowed url"). Fetch the image and inline it as a base64
 *  data URI, which it accepts. A value already a data URI passes through. */
async function toDataUri(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`image_fetch_failed ${res.status}`);
  const contentType = res.headers.get("content-type") || "image/png";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${contentType};base64,${b64}`;
}

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

/**
 * Itemize a generated design image into 5-8 shoppable items.
 * `imageUrl` may be a public URL or a data URI; it is always inlined as base64
 * before sending (MiniMax rejects remote URLs). Throws on transport/API failure
 * so callers can surface an error.
 */
export async function itemizeDesign(
  imageUrl: string,
  apiKey: string,
): Promise<DesignItem[]> {
  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") ||
    "https://api.minimaxi.com";
  const dataUri = await toDataUri(imageUrl);
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
            { type: "image_url", image_url: { url: dataUri } },
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
