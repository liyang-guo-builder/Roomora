/* Roomora — pure JSON-array extraction for LLM responses (no server-only deps,
   so it is unit-testable in isolation). Used by the design itemizer. */

/** Strip code fences and pull the first JSON array out of an LLM response.
 *  Returns [] when nothing parseable is found. */
export function extractJsonArray(raw: string): unknown[] {
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

/** Parse a vision judge's per-candidate scores. The model is asked for
 *  [{i,score}] but frequently returns an object keyed by candidate number
 *  ({"1":{"score":85},...}) or ({"1":85,...}). Accept all three shapes and
 *  return a normalised [{i,score}] list (i is 1-based). */
export function parseJudgeScores(raw: string): { i: number; score: number }[] {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const out: { i: number; score: number }[] = [];
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a !== -1 && b > a) {
    try {
      const arr = JSON.parse(s.slice(a, b + 1));
      if (Array.isArray(arr)) {
        for (const x of arr) {
          const i = Number(x?.i), score = Number(x?.score);
          if (Number.isFinite(i) && Number.isFinite(score)) out.push({ i, score });
        }
        if (out.length) return out;
      }
    } catch {
      /* fall through to object form */
    }
  }
  const o = s.indexOf("{"), c = s.lastIndexOf("}");
  if (o !== -1 && c > o) {
    try {
      const obj = JSON.parse(s.slice(o, c + 1)) as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === "object") {
          const rec = v as Record<string, unknown>;
          const i = Number(rec.i ?? k), score = Number(rec.score);
          if (Number.isFinite(i) && Number.isFinite(score)) out.push({ i, score });
        } else if (typeof v === "number") {
          const i = Number(k);
          if (Number.isFinite(i)) out.push({ i, score: v });
        }
      }
    } catch {
      /* give up — caller defaults to 0 */
    }
  }
  return out;
}
