/* Roomora — vision "match judge" for "Shop this look".
   Given the design image and one spotted item, scores how closely each candidate
   product looks like THAT item (silhouette, colour, material, size class). This
   is the precision layer: Google Shopping gives breadth + price, the judge keeps
   only genuine look-alikes. Server-only (uses MINIMAX_API_KEY). */

import "server-only";
import sharp from "sharp";
import { parseJudgeScores } from "./parseItems";
import type { DesignItem } from "./itemizer";
import type { RawProduct } from "./search";

/** Fetch an image and inline it as a base64 data URI (MiniMax rejects remote
 *  URLs). Optionally downscale to `w` px (square-ish, inside-fit) to save tokens. */
async function toDataUri(url: string, w?: number): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image_fetch_failed ${res.status}`);
  const orig = Buffer.from(await res.arrayBuffer());
  if (w) {
    const small = await sharp(orig)
      .resize(w, w, { fit: "inside" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return `data:image/jpeg;base64,${small.toString("base64")}`;
  }
  const ct = res.headers.get("content-type") || "image/jpeg";
  return `data:${ct};base64,${orig.toString("base64")}`;
}

/**
 * Score each candidate 0-100 for how closely it matches `item` as seen in the
 * design image. Returns an array aligned to `candidates` (0 for any candidate
 * whose thumbnail could not be fetched or that the model did not score).
 * Best-effort: throws only on a hard MiniMax transport/auth failure.
 */
export async function judgeMatches(
  designUrl: string,
  item: DesignItem,
  candidates: RawProduct[],
  apiKey: string,
): Promise<number[]> {
  const scores = new Array(candidates.length).fill(0) as number[];
  if (candidates.length === 0) return scores;

  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") || "https://api.minimaxi.com";
  const designUri = await toDataUri(designUrl, 512);

  // Fetch candidate thumbnails as small data URIs; keep index mapping for ones
  // that succeed (a failed thumbnail simply stays scored 0).
  const fetched: { origIdx: number; uri: string; title: string }[] = [];
  await Promise.all(
    candidates.map(async (c, idx) => {
      try {
        const uri = await toDataUri(c.thumbnail, 200);
        fetched.push({ origIdx: idx, uri, title: c.title });
      } catch {
        /* leave at 0 */
      }
    }),
  );
  if (fetched.length === 0) return scores;
  // Stable order for numbering in the prompt.
  fetched.sort((a, b) => a.origIdx - b.origIdx);

  const n = fetched.length;
  const prompt =
    `You are a strict furniture match judge for a "shop this look" feature.\n` +
    `The FIRST image is an interior design. Focus ONLY on this item within it: ` +
    `${item.label}${item.target ? ` (${item.target})` : ""}.\n` +
    `The next ${n} images are CANDIDATE products, numbered 1 to ${n}.\n` +
    `Score how closely EACH candidate matches THAT item on silhouette/shape, ` +
    `colour, material and SIZE CLASS. A wrong size class (e.g. a 3-seater or large ` +
    `sectional when the target is a small 2-seater) or a clearly different form ` +
    `must score low.\n` +
    `You MUST return a score for EVERY candidate from 1 to ${n} — exactly ${n} ` +
    `objects, even poor matches (give them low scores). Return ONLY a JSON array ` +
    `in order, nothing else: [${Array.from({ length: n }, (_, k) => `{"i":${k + 1},"score":<0-100>}`).join(",")}]. ` +
    `85+ means a genuine look-alike a customer would accept.`;

  const content: unknown[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: designUri } },
  ];
  fetched.forEach((f, n) => {
    content.push({ type: "text", text: `Candidate ${n + 1}: ${f.title}` });
    content.push({ type: "image_url", image_url: { url: f.uri } });
  });

  const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "MiniMax-Text-01",
      messages: [{ role: "user", content }],
      temperature: 0.2,
      max_tokens: 1024,
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
    throw new Error(
      `minimax_status ${json.base_resp.status_code}: ${json.base_resp.status_msg ?? ""}`,
    );
  }
  const raw = json.choices?.[0]?.message?.content ?? "";
  for (const p of parseJudgeScores(raw)) {
    const slot = fetched[p.i - 1]; // prompt numbering is 1-based
    if (slot) scores[slot.origIdx] = Math.max(0, Math.min(100, p.score));
  }
  return scores;
}
