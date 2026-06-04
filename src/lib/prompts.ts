/* Roomora — Qwen-Image-Edit prompt construction (server-side).
   The founding promise: only FURNISH the user's exact room — never rebuild its
   walls, windows, doors or shape. Style descriptors therefore describe
   FURNITURE & DECOR only (never wall materials like brick/concrete/plaster),
   and every restyle ends with a strict architecture-lock clause. Validated
   across all 10 styles on a real room (see spike/fidelity). */

import type { StyleId, BudgetId } from "./types";

/** Per-style descriptor — FURNITURE, DECOR, PALETTE, LIGHTING & MOOD only,
 *  never walls/architecture. Written as designer-grade recipes (signature
 *  pieces + specific palette + materials + a clear focal point + mood) to push
 *  the engine away from the generic, flat, over-staged "AI render" look. */
export const STYLE_PROMPTS: Record<StyleId, string> = {
  scandi:
    "Scandinavian: a low natural-linen sectional in warm oat and dusty grey, pale oak and birch furniture with tapered legs, a woven rattan or rope lounge chair (Wishbone style), a round oak coffee table, an open shelf styled with art and matte ceramics, a Nelson-style globe pendant or slim arc floor lamp, a woven wool rug and a few sculptural plants. Palette of warm oat-linen, dusty grey, honey oak and off-white. Soft warm incandescent fill, never harsh. Cosy, intellectual, quietly lived-in.",
  japandi:
    "Japandi: an ultra-low teak sideboard, a futon-style low-back sofa in muted clay, a rattan or bamboo side stool, low rounded wooden coffee tables, plush textured boucle seating, a rice-paper pendant (Noguchi Akari style), a single sculptural branch in a black ceramic vase, a sisal or tatami-weave rug and undyed linen textiles with rust and charcoal accents. Palette of warm parchment, ash taupe, light oak and deep charcoal. Soft diffused light, warm amber lamp fill at night. Meditative, healing, unhurried.",
  cream:
    "Cream (奶油风): a rounded boucle or teddy-fabric sofa with a low back and no hard lines, an oval or kidney-shaped marble-top coffee table, a globe or mushroom pendant, a thin-framed oval mirror, an organic knot sculpture, pale-oak styling, soft-silhouette ceramic vases and linen curtains pooling gently. Palette of milk white, warm ecru, soft sand and caramel oak. Bright high-key light with little shadow for an airy feel. Pillowy, optimistic, softly aspirational.",
  midcentury:
    "Mid-Century Modern: a brown or olive leather or velvet vintage sofa with tapered legs, low organic-shaped lounge chairs, a Danish 1960s teak dresser, an amber globe pendant and a brass arc floor lamp, a geometric Berber or Bauhaus rug, stacked design books and vintage records or speakers. Palette of terracotta, mustard amber, chocolate, white plaster and an ink-blue or forest-green accent. Warm incandescent, amber-golden evening light. Vivid, spirited, knowledgeable.",
  wabisabi:
    "Wabi-Sabi (侘寂): an armless arc-form boucle sofa with no visible frame, an irregular-grain solid-wood coffee table, sculptural dried branches and hanging plants, a woven rattan lamp, unglazed stoneware ceramics and candles, a jute or woven-grass rug and visible-weave natural linen. Palette of warm clay, bone white, deep walnut and a single charcoal accent. Moody directional light from a single warm lamp casting soft shadows. Contemplative, imperfect, deeply quiet.",
  wood:
    "Natural Wood (原木风): warm pale-oak and birch furniture, a natural-linen sofa, a floating low wood console, a rattan butterfly or lounge chair, jute baskets, brass pendant lights, abundant tropical plants and sheer white curtains. Palette of pale birch, warm cream, teak amber and forest green. Soft filtered daylight, the warm wood itself reading as the light source. Grounding, forest-fresh, gently healing.",
  modern:
    "Modern minimalist: an oversized sculptural cloud or bubble sofa in sage green or dove grey, a brushed-brass or matte-black arc floor lamp, a minimal low TV console, one large monochrome art print and only one or two statement objects, micro-plush or boucle upholstery and matte metal fittings. Palette of dove grey, cool white, sage and charcoal with a natural-oak floor. Daylight as the main element, gallery-like restraint. Self-assured, clean and urban.",
  newchinese:
    "New Chinese (新中式): a low straight-lined sofa in cream linen, a long dark-walnut coffee table, a bonsai or sculptural dried branch in a black ceramic vessel, honed-stone accents, a calligraphy scroll and a ceramic table lamp. Palette of warm walnut, rice-paper white, ink black and moss green, with the contrast of heavy dark wood against pale soft fabric. Warm ambient glow in the evening. Serene, dignified, transcendent.",
  boho:
    "Bohemian: a multi-colour kilim or Moroccan rug as the anchor, a relaxed linen sofa layered with patterned and tasselled textiles, a rattan basket-weave pendant, an arched Moroccan mirror, a macrame wall hanging, a low wood coffee table with a candle tray, woven baskets, pampas grass and abundant trailing plants. Palette of terracotta, saffron, earth brown, warm cream and a deep indigo or forest-green accent. Dappled light softened by sheer curtains, many small warm candle and string-light sources at night. Free-spirited, layered, collected.",
  industrial:
    "Industrial: a dark stitched-leather modular sofa, black steel-frame shelving, a reclaimed-wood and steel coffee table, Edison filament pendants, solid oak or walnut accents and one large-leaf tropical plant for softness. Palette of concrete grey, matte black, warm oak and off-white with a rust or olive accent. Dramatic contrast lighting, bright daylight against the grey, Edison amber warmth at night. Uncompromising, loft-like, quietly rebellious.",
};

const BUDGET_PROMPTS: Record<BudgetId, string> = {
  low: "Use modest, affordable, budget-friendly furniture and decor.",
  mid: "Use mid-range, good-quality furniture and decor.",
  high: "Use high-end, premium, designer furniture and decor.",
  skip: "",
};

/** Lead-in: furnish the room into a complete, styled, magazine-quality space.
 *  Adds editorial-photography + composition cues that counter the flat, evenly
 *  lit, over-staged "AI" look (lighting, texture, focal point, restrained palette). */
export const FURNISH =
  "Furnish and restyle this exact room into a complete, beautifully styled, photorealistic living room worthy of an interior-design magazine: natural directional window light with soft shadows, layered textures, a clear focal point and a restrained, harmonious color palette, shot like editorial interior photography with gentle depth of field and true-to-life materials.";

/** The non-negotiable spatial-fidelity clause — furnish, never rebuild. */
export const ARCHITECTURE_LOCK =
  "IMPORTANT: This is a real photo of an existing room and you must NOT alter its architecture in any way. Keep the windows EXACTLY as in the original: the same number of window panels in the same positions, the same size and proportions, the same recessed window bay or wall reveal, and any rod or rail mounted above them. Keep all walls and their exact color and finish, the same doors, the same ceiling line, the same skirting boards, the same floor, the same built-in shelving, alcoves and wall columns, the same view outside the windows, and the same camera viewpoint and proportions. Do NOT flatten, square off, re-frame, merge, widen, heighten, move, add or remove any window or door; do NOT change the room's shape; do NOT add brick, concrete, wood paneling, wallpaper or any new wall texture. Apply the style ONLY by placing free-standing furniture, rugs, lighting, textiles, plants and wall art into the existing room. You are furnishing and styling this exact room, not rebuilding it.";

/** Build the full restyle prompt for Qwen. */
export function buildRestylePrompt(args: {
  style: StyleId;
  budget: BudgetId | null;
  note: string;
}): string {
  const parts: string[] = [FURNISH, STYLE_PROMPTS[args.style] ?? STYLE_PROMPTS.scandi];
  if (args.budget && BUDGET_PROMPTS[args.budget]) {
    parts.push(BUDGET_PROMPTS[args.budget]);
  }
  const note = args.note?.trim();
  if (note) parts.push(`Also: ${note}.`);
  parts.push(ARCHITECTURE_LOCK);
  return parts.join(" ");
}

/** Build a "match a photo" prompt for Qwen.
   Same shape as buildRestylePrompt, but the per-style descriptor is replaced by
   the MiniMax style-only caption of the user's inspiration image. The inspiration
   itself never reaches Qwen — only its decor description does. */
export function buildMatchPrompt(
  caption: string,
  budget: BudgetId | null,
  note: string,
): string {
  const parts: string[] = [FURNISH, `Match this decor style: ${caption.trim()}.`];
  if (budget && BUDGET_PROMPTS[budget]) {
    parts.push(BUDGET_PROMPTS[budget]);
  }
  const trimmedNote = note?.trim();
  if (trimmedNote) parts.push(`Also: ${trimmedNote}.`);
  parts.push(ARCHITECTURE_LOCK);
  return parts.join(" ");
}

/** Build a refine prompt — the user's instruction verbatim, change-only clause. */
export function buildRefinePrompt(instruction: string): string {
  const note = instruction.trim();
  return `${note}. Change only what is described; keep everything else in the room exactly the same, including the walls, windows, doors, floor and layout.`;
}
