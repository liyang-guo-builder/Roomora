/* Roomora — vision "match judge" for "Shop this look".
   Scores how closely each candidate product looks like the TARGET item, where
   the target is a CLEAN CROP of that one item (from Florence-2 + sharp), not the
   whole room. Judging a focused crop is both reliable and precise. The model is
   forced to reply with JSON only (it lapses into prose otherwise). Server-only. */

import "server-only";
import sharp from "sharp";
import { parseJudgeScores } from "./parseItems";
import type { RawProduct } from "./search";

/** Fetch a thumbnail and inline it as a small base64 data URI (MiniMax rejects
 *  remote URLs). */
async function thumbToDataUri(url: string, w = 160): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image_fetch_failed ${res.status}`);
  const small = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(w, w, { fit: "inside" })
    .jpeg({ quality: 72 })
    .toBuffer();
  return `data:image/jpeg;base64,${small.toString("base64")}`;
}

/**
 * Score each candidate 0-100 for how closely it matches the target crop.
 * `targetDataUri` is a base64 data URI of the cropped item. Returns an array
 * aligned to `candidates` (0 for any candidate that couldn't be fetched/scored).
 * Throws only on a hard MiniMax transport/auth failure after a retry.
 */
export async function judgeMatches(
  targetDataUri: string,
  targetDesc: string,
  candidates: RawProduct[],
  apiKey: string,
): Promise<number[]> {
  const scores = new Array(candidates.length).fill(0) as number[];
  if (candidates.length === 0) return scores;

  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") || "https://api.minimaxi.com";

  const fetched: { origIdx: number; uri: string; title: string }[] = [];
  await Promise.all(
    candidates.map(async (c, idx) => {
      try {
        const uri = await thumbToDataUri(c.thumbnail);
        fetched.push({ origIdx: idx, uri, title: c.title });
      } catch {
        /* leave at 0 */
      }
    }),
  );
  if (fetched.length === 0) return scores;
  fetched.sort((a, b) => a.origIdx - b.origIdx);

  const n = fetched.length;
  const prompt =
    `You are a furniture match scorer. Image 1 is the TARGET item` +
    `${targetDesc ? ` (${targetDesc})` : ""}. ` +
    `Images 2 to ${n + 1} are CANDIDATE products, numbered 1 to ${n}. ` +
    `For EACH candidate give a 0-100 score for how visually similar it is to the ` +
    `TARGET on shape, colour, material and size. A clearly different shape ` +
    `(for example round when the target is rectangular, or a 3-seater when the ` +
    `target is a 2-seater) or material must score below 40. ` +
    `Your ENTIRE reply must be ONLY a JSON array, starting with [ and ending ` +
    `with ], with no words or explanation before or after: ` +
    `[${Array.from({ length: n }, (_, k) => `{"i":${k + 1},"score":0}`).join(",")}]`;

  const content: unknown[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: targetDataUri } },
  ];
  fetched.forEach((f, k) => {
    content.push({ type: "text", text: `Candidate ${k + 1}: ${f.title}` });
    content.push({ type: "image_url", image_url: { url: f.uri } });
  });

  async function callOnce(): Promise<{ i: number; score: number }[]> {
    const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [{ role: "user", content }],
        temperature: 0.1,
        max_tokens: 800,
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
    return parseJudgeScores(json.choices?.[0]?.message?.content ?? "");
  }

  let parsed: { i: number; score: number }[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      parsed = await callOnce();
      if (parsed.length > 0) break;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }

  for (const p of parsed) {
    const slot = fetched[p.i - 1];
    if (slot) scores[slot.origIdx] = Math.max(0, Math.min(100, p.score));
  }
  return scores;
}
