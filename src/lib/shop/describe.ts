/* Roomora — describe a single cropped item for shopping. Because the input is a
   clean crop of ONE item (from Florence-2 + sharp), the model can't bleed the
   room's palette onto it, so the description and search query stay accurate.
   Server-only (uses MINIMAX_API_KEY). */

import "server-only";

export interface CropDescription {
  /** Localized shopping search phrase, e.g. "table basse rectangulaire en marbre". */
  query: string;
  /** Short visual description for the match judge. */
  target: string;
}

/** Pull the first JSON object out of a model reply (tolerates fences/prose). */
function firstJsonObject(raw: string): Record<string, unknown> | null {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Describe a cropped item. `cropDataUri` is a base64 data URI of the crop.
 * `categoryLabel` is the item's category (e.g. "coffee table") for context;
 * `lang` is the language to write the query in (e.g. "French", "Spanish").
 * Returns a localized query + a visual target. Throws on hard API failure.
 */
export async function describeCrop(
  cropDataUri: string,
  categoryLabel: string,
  lang: string,
  apiKey: string,
): Promise<CropDescription> {
  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") || "https://api.minimaxi.com";
  const prompt =
    `This image is a single ${categoryLabel} cropped from a room photo. ` +
    `Describe ONLY what is visibly true of THIS item (shape, colour, material, ` +
    `size). Do not guess attributes that are not visible. ` +
    `Return ONLY a JSON object, no other words: ` +
    `{"query":"<a precise ${lang} online shopping search phrase including shape and material>",` +
    `"target":"<a short English visual description for matching>"}`;
  const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: cropDataUri } },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`minimax_error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    base_resp?: { status_code?: number; status_msg?: string };
  };
  if (json.base_resp && json.base_resp.status_code !== 0) {
    throw new Error(`minimax_status ${json.base_resp.status_code}`);
  }
  const content = json.choices?.[0]?.message?.content ?? "";
  const obj = firstJsonObject(content);
  const query = typeof obj?.query === "string" ? obj.query.trim() : "";
  const target = typeof obj?.target === "string" ? obj.target.trim() : "";
  // Guard against the model echoing the placeholder or returning nothing usable.
  if (!query || /<.*>/.test(query)) {
    throw new Error("describe_no_query");
  }
  return { query, target };
}
