/* Roomora — Qwen-Image-Edit prompt construction (server-side).
   The architecture-lock clause is the core promise: never hallucinate or move
   windows/doors. Every restyle prompt must end with it. */

import type { StyleId, BudgetId } from "./types";

/** Per-style descriptor injected into the restyle prompt. */
export const STYLE_PROMPTS: Record<StyleId, string> = {
  scandi:
    "Restyle this room in a Scandinavian interior style: light oak and pale wood, white and soft grey walls, clean simple lines, cozy textiles, minimal clutter, plenty of natural light, a few green plants.",
  japandi:
    "Restyle this room in a Japandi interior style: a blend of Japanese minimalism and Scandinavian warmth, low natural-wood furniture, muted earthy tones, handmade ceramics, paper-lantern lighting, uncluttered serene space.",
  cream:
    "Restyle this room in a Cream (奶油风) interior style: soft creamy off-white and beige palette, rounded plush furniture, warm cozy lighting, gentle curves, milky neutral tones, a calm welcoming feel.",
  midcentury:
    "Restyle this room in a Mid-Century Modern interior style: warm walnut and teak wood, tapered legs, retro 1950s-60s silhouettes, mustard and olive accents, organic shapes, statement lighting.",
  wabisabi:
    "Restyle this room in a Wabi-Sabi (侘寂) interior style: imperfect natural textures, raw plaster and clay walls, aged wood, muted earthy neutrals, handcrafted objects, understated quiet beauty.",
  wood:
    "Restyle this room in a Natural Wood (原木风) interior style: abundant warm natural-wood surfaces and furniture, light log-wood tones, soft linen textiles, a warm organic minimalist feel.",
  modern:
    "Restyle this room in a Modern Minimalist interior style: clean uncluttered lines, neutral palette, sleek low-profile furniture, hidden storage, subtle texture, calm contemporary elegance.",
  newchinese:
    "Restyle this room in a New Chinese (新中式) interior style: refined dark wood furniture with clean modern lines, ink-wash and jade accents, subtle traditional Chinese motifs, balanced symmetry, elegant restraint.",
  boho:
    "Restyle this room in a Bohemian interior style: layered warm textiles, rattan and woven natural materials, abundant plants, terracotta and earthy jewel tones, eclectic relaxed mix, macramé and patterned rugs.",
  industrial:
    "Restyle this room in an Industrial interior style: exposed brick and concrete textures, black metal and aged leather, raw reclaimed wood, Edison-bulb lighting, an urban loft feel.",
};

const BUDGET_PROMPTS: Record<BudgetId, string> = {
  low: "Furnish it with modest, affordable, budget-friendly furniture and decor.",
  mid: "Furnish it with mid-range, good-quality furniture and decor.",
  high: "Furnish it with high-end, premium, designer furniture and decor.",
  skip: "",
};

/** Explicit instruction to actually FURNISH the room (otherwise Qwen plays it
    too safe under the architecture lock and barely changes anything). */
export const FURNISH =
  "Fully furnish and decorate the space into a complete, lived-in, interior-magazine-quality room: add well-chosen furniture sized to fit the room (seating such as a sofa and/or armchairs, a coffee or side table, storage as appropriate), a rug, layered lighting, wall art or mirrors, styled shelving, plants, and soft textiles. Make it look professionally staged and inviting, not empty.";

/** The non-negotiable spatial-fidelity clause appended to every restyle.
    Locks STRUCTURE but explicitly permits adding furniture/decor. */
export const ARCHITECTURE_LOCK =
  "Critically, keep the room's structure and architecture identical to the original photo — do NOT move, add, or remove any windows, doors, or walls, and keep the existing floor, ceiling height, window view, and proportions exactly. You may freely add and arrange furniture, rugs, lighting, art, and decor, but the room's bones must stay exactly as photographed.";

/** Build the full restyle prompt for Qwen. */
export function buildRestylePrompt(args: {
  style: StyleId;
  budget: BudgetId | null;
  note: string;
}): string {
  const parts: string[] = [STYLE_PROMPTS[args.style] ?? STYLE_PROMPTS.scandi, FURNISH];
  if (args.budget && BUDGET_PROMPTS[args.budget]) {
    parts.push(BUDGET_PROMPTS[args.budget]);
  }
  const note = args.note?.trim();
  if (note) parts.push(`Also: ${note}.`);
  parts.push(ARCHITECTURE_LOCK);
  return parts.join(" ");
}

/** Build a refine prompt — the user's instruction verbatim, change-only clause. */
export function buildRefinePrompt(instruction: string): string {
  const note = instruction.trim();
  return `${note}. Change only what is described; keep everything else in the room exactly the same.`;
}
