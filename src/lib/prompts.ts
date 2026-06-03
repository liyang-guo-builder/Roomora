/* Roomora — Qwen-Image-Edit prompt construction (server-side).
   The founding promise: only FURNISH the user's exact room — never rebuild its
   walls, windows, doors or shape. Style descriptors therefore describe
   FURNITURE & DECOR only (never wall materials like brick/concrete/plaster),
   and every restyle ends with a strict architecture-lock clause. Validated
   across all 10 styles on a real room (see spike/fidelity). */

import type { StyleId, BudgetId } from "./types";

/** Per-style descriptor — FURNITURE & DECOR only, never walls/architecture. */
export const STYLE_PROMPTS: Record<StyleId, string> = {
  scandi:
    "Scandinavian style: a light beige or grey fabric sofa, pale oak furniture, cozy wool throws and cushions, simple ceramics, a few green plants, soft minimalist styling.",
  japandi:
    "Japandi style: low natural-wood furniture, a linen sofa in muted earthy tones, handmade ceramics, a paper-shade lamp, a few plants, serene minimal styling.",
  cream:
    "Cream (奶油风) style: a soft rounded plush sofa in creamy off-white, beige and milky tones, curved furniture, warm cozy lighting, textured cushions and throws.",
  midcentury:
    "Mid-Century Modern style: a walnut or teak sofa and chairs with tapered legs, retro 1960s silhouettes, mustard and olive cushions, a statement arc lamp, organic-shaped decor.",
  wabisabi:
    "Wabi-Sabi (侘寂) style: low natural-wood and aged furniture, handcrafted ceramics, linen and raw-cotton textiles in muted earthy neutrals, dried branches, understated decor.",
  wood:
    "Natural Wood (原木风) style: warm light-wood furniture, a linen sofa, woven baskets, soft natural textiles, plenty of plants, an organic minimalist warm feel.",
  modern:
    "Modern minimalist style: a sleek low-profile neutral sofa, clean-lined furniture, a simple coffee table, subtle textured cushions, refined contemporary accents.",
  newchinese:
    "New Chinese (新中式) style: refined dark-wood furniture with clean modern lines, a structured sofa, ink-wash style framed art, jade-green and neutral accents, elegant balanced styling.",
  boho:
    "Bohemian style: a relaxed sofa layered with patterned textiles, a rattan chair, a patterned rug, macrame and woven decor, abundant plants, terracotta and earthy jewel-tone accents.",
  industrial:
    "Industrial style: an aged brown leather sofa, black metal-framed furniture, a reclaimed-wood coffee table, Edison-bulb lamps, leather and metal accents, moody warm styling.",
};

const BUDGET_PROMPTS: Record<BudgetId, string> = {
  low: "Use modest, affordable, budget-friendly furniture and decor.",
  mid: "Use mid-range, good-quality furniture and decor.",
  high: "Use high-end, premium, designer furniture and decor.",
  skip: "",
};

/** Lead-in: furnish the room into a complete, styled, magazine-quality space. */
export const FURNISH =
  "Furnish and restyle this exact room into a complete, well-styled, photorealistic interior-magazine living room.";

/** The non-negotiable spatial-fidelity clause — furnish, never rebuild. */
export const ARCHITECTURE_LOCK =
  "IMPORTANT: This is a real photo of an existing room. Keep the room's architecture and surfaces 100% identical to the original: the exact same walls and wall color/finish, the same windows and the same view outside them, the same doors, the same floor, the same ceiling, the same built-in shelves, and the same camera viewpoint and proportions. Do NOT add brick, concrete, wood paneling, wallpaper, or any new wall texture; do NOT move, add, remove, or resize any window or door; do NOT change the room's shape. Apply the style ONLY by placing free-standing furniture, rugs, lighting, textiles, plants and wall art into the existing room. You are furnishing and styling this exact room, not rebuilding it.";

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
