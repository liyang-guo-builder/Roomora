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
