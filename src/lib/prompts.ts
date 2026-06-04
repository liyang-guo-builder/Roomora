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
    "Scandinavian: a low oatmeal or light-grey linen sofa, pale oak and birch furniture with tapered legs, a soft wool boucle armchair, a chunky knit throw and linen cushions, a jute flatweave rug, simple matte ceramics, a paper pendant or slim arc lamp, a few sculptural green plants. Palette of warm white, oatmeal, pale wood and soft sage. Airy, calm and uncluttered with one clear focal point.",
  japandi:
    "Japandi: low solid walnut and oak furniture, a muted clay-toned linen sofa, handmade wabi ceramics, a paper-shade floor lamp, a low slatted coffee table, a single ikebana branch in a stoneware vase, a flatweave wool rug. Palette of warm beige, clay, charcoal and natural wood. Serene and minimal with generous negative space.",
  cream:
    "Cream (奶油风): a plush rounded boucle sofa in creamy off-white, curved milky-toned furniture, a soft high-pile rug, a travertine or cream-stone coffee table, warm dimmable lamps, layered textured throws and rounded cushions. Palette of cream, beige, oat and soft caramel. Cozy, soft and rounded with a warm glow.",
  midcentury:
    "Mid-Century Modern: a walnut or teak sofa with tapered legs, low organic-shaped lounge chairs, a brass arc floor lamp, a tripod side table, mustard and burnt-olive cushions, a geometric rug, ceramic table lamps and abstract framed art. Palette of walnut, mustard, olive, cream and brass. Warm, retro 1960s and curated.",
  wabisabi:
    "Wabi-Sabi (侘寂): low aged-wood furniture, a slubby linen sofa in muted greige, handcrafted irregular ceramics, raw-cotton and linen textiles, dried pampas or branches in a stoneware vessel, a worn flatweave rug, soft diffused light. Palette of greige, sand, clay and ash. Imperfect, quiet, organic and understated.",
  wood:
    "Natural Wood (原木风): warm light-oak and ash furniture, a natural linen sofa, woven rattan and cane details, jute baskets, soft cotton textiles, abundant green plants and simple stoneware. Palette of honey oak, cream, sage and terracotta. Organic, warm, relaxed and sunlit.",
  modern:
    "Modern minimalist: a sleek low-profile sofa in stone grey, clean-lined furniture, a slim marble or lacquer coffee table, a single statement floor lamp, restrained sculptural decor and one large abstract artwork. Palette of greige, charcoal, white and one muted accent. Refined, intentional and uncluttered.",
  newchinese:
    "New Chinese (新中式): refined dark-walnut furniture with clean modern lines, a structured linen sofa, a low tea table, ink-wash style framed art, a ceramic table lamp, jade-green and warm-neutral accents and a single elegant orchid or bonsai. Palette of warm neutral, dark walnut, jade and ink. Balanced, serene and modern-oriental.",
  boho:
    "Bohemian: a relaxed natural-linen sofa layered with patterned and tasselled textiles, a rattan lounge chair, a vintage patterned rug, a macrame wall hanging, woven baskets, abundant trailing plants and eclectic ceramics. Palette of terracotta, ochre, cream and deep teal. Layered, warm, lived-in and collected.",
  industrial:
    "Industrial: an aged cognac leather sofa, black metal-framed furniture, a reclaimed-wood and steel coffee table, Edison-bulb and articulated metal lamps, leather and worn-wood accents, a faded vintage rug and a couple of large plants. Palette of cognac, charcoal, raw steel and warm wood. Moody, warm urban-loft.",
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
