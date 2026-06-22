import { describe, it, expect } from "vitest";
import {
  buildRestylePrompt,
  buildRefinePrompt,
  userOverride,
  STYLE_PROMPTS,
  FURNISH,
  ARCHITECTURE_LOCK,
  REFINE_LOCK,
} from "./prompts";
import type { StyleId } from "./types";

describe("buildRestylePrompt", () => {
  it("orders parts: FURNISH first, style recipe, lock, then the user note LAST", () => {
    const note = "keep the existing desk";
    const p = buildRestylePrompt({ style: "scandi", budget: "mid", note });
    expect(p.startsWith(FURNISH)).toBe(true);
    expect(p).toContain(STYLE_PROMPTS.scandi);
    // The user override must come AFTER the architecture lock (recency wins).
    expect(p.indexOf(ARCHITECTURE_LOCK)).toBeGreaterThan(-1);
    expect(p.indexOf(userOverride(note))).toBeGreaterThan(p.indexOf(ARCHITECTURE_LOCK));
    expect(p.trim().endsWith(userOverride(note))).toBe(true);
  });

  it("omits the user-override clause when no note is given", () => {
    const p = buildRestylePrompt({ style: "japandi", budget: null, note: "" });
    expect(p).not.toContain("MOST IMPORTANT");
    expect(p).toContain(ARCHITECTURE_LOCK);
  });

  it("falls back to the scandi recipe for an unknown style", () => {
    const bad = "not-a-style" as StyleId;
    const p = buildRestylePrompt({ style: bad, budget: null, note: "" });
    expect(p).toContain(STYLE_PROMPTS.scandi);
  });
});

describe("buildRefinePrompt", () => {
  it("is the instruction followed by the change-only lock", () => {
    const p = buildRefinePrompt("add a TV on the left wall");
    expect(p).toBe(`add a TV on the left wall. ${REFINE_LOCK}`);
    expect(p).toContain(REFINE_LOCK);
  });
});

describe("userOverride", () => {
  it("embeds the note and frames it as an overriding instruction", () => {
    const o = userOverride("make the sofa green");
    expect(o).toContain("make the sofa green");
    expect(o.toLowerCase()).toContain("overrides");
  });
});

describe("STYLE_PROMPTS", () => {
  it("includes every picker style, including the newly added ones", () => {
    for (const id of ["french", "quietluxury", "americanvintage"] as StyleId[]) {
      expect(STYLE_PROMPTS[id]).toBeTruthy();
      expect(STYLE_PROMPTS[id].length).toBeGreaterThan(40);
    }
  });
});
