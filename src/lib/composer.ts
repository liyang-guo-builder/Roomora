/* Roomora — LLM prompt composer (server-side, optional).

   A smart step between the user and the image model. A MiniMax *vision* call
   looks at the user's actual room photo together with the chosen style, the
   budget and the user's free-text request ("anything specific"), and writes
   ONE tailored restyle instruction that:
     - keeps the room's real function (a bedroom stays a bedroom),
     - keeps large existing functional pieces (bed, wardrobe, desk) unless the
       user asks otherwise,
     - obeys the user's specific request as the top priority.

   The caller ALWAYS appends the fixed ARCHITECTURE_LOCK afterwards (the model
   can't dilute spatial fidelity), and ALWAYS falls back to the deterministic
   template on any error or timeout — so this can only help, never break a
   generation. Reuses the existing MiniMax key/integration (same model already
   used to caption inspiration photos); no new vendor. */

import type { BudgetId } from "./types";

const COMPOSER_SYSTEM = `You are an expert interior-design prompt engineer for an AI image-editing model that restyles photos of real rooms. Given the room photo plus a target decor style, a budget and an optional specific request from the user, write ONE single vivid English instruction (4 to 6 sentences) telling the image model how to restyle the room.

Follow these rules strictly:
1. Look at the photo and identify the room's real function (bedroom, living room, home office, dining room, child's room, studio). KEEP that function. A bedroom must stay a bedroom.
2. Keep the large functional furniture that defines the room (for example an existing bed, wardrobe, desk or dining table). Re-dress and restyle those pieces in the new style; do NOT delete them, unless the user explicitly asks to remove or replace them. CRITICAL: never replace a bed with a sofa or sectional, and never swap one functional piece for a different-function piece just because the style description mentions it. The style's seating, sofas and tables are ADDED around the room's existing function, never substituted for it. Restyle the existing bed by changing its bedding, headboard finish and the palette, rug, lighting and decor AROUND it.
3. Apply the target style's furniture, colour palette, materials, textiles, lighting and mood to the rest of the room, furnishing it richly and completely so it looks like a finished, magazine-quality interior.
4. If the user gives a specific request, treat it as the single highest priority and obey it exactly, even if it conflicts with the style.
5. Describe the result as photorealistic editorial interior photography: natural directional window light, soft shadows, layered textures, a clear focal point and true-to-life materials.
6. Do NOT describe or change architecture (walls, windows, doors, ceiling, floor, room shape, camera angle) and do NOT add brick, concrete, panelling or wallpaper. A separate instruction handles architecture; you focus only on furniture, decor, palette, lighting and mood.

Output ONLY the final instruction text. No preamble, no quotation marks, no bullet points, no explanation.`;

const BUDGET_LABEL: Record<BudgetId, string> = {
  low: "modest, affordable, budget-friendly furniture",
  mid: "mid-range, good-quality furniture",
  high: "high-end, premium, designer furniture",
  skip: "no specific budget",
};

const COMPOSER_TIMEOUT_MS = 12_000;

/** Compose a tailored restyle instruction from the room photo + inputs.
 *  Returns the creative instruction ONLY (no architecture lock — the caller
 *  appends that). Throws on any failure so the caller can fall back. */
export async function composeRestylePrompt(args: {
  imageRef: string; // data URI or public URL of the user's room photo
  styleDescriptor: string; // STYLE_PROMPTS[style], or "Match this decor style: <caption>"
  budget: BudgetId | null;
  note: string;
  apiKey: string;
}): Promise<string> {
  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") || "https://api.minimaxi.com";
  const budgetLabel = args.budget
    ? BUDGET_LABEL[args.budget] ?? "no specific budget"
    : "no specific budget";
  const userText = `Target decor style to apply:\n${args.styleDescriptor}\n\nBudget: ${budgetLabel}.\n\nUser's specific request (highest priority, obey exactly): ${args.note.trim() || "none"}.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPOSER_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [
          { role: "system", content: COMPOSER_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: args.imageRef } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`composer_minimax_error ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      base_resp?: { status_code?: number; status_msg?: string };
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      throw new Error(
        `composer_minimax_status ${json.base_resp.status_code}: ${json.base_resp.status_msg ?? ""}`,
      );
    }
    const out = json.choices?.[0]?.message?.content;
    if (!out || typeof out !== "string" || !out.trim()) {
      throw new Error("composer_no_output");
    }
    return out.trim();
  } finally {
    clearTimeout(timer);
  }
}

const REFINE_COMPOSER_SYSTEM = `You are an expert image-editing prompt engineer for an AI model that makes SURGICAL edits to photos of real rooms. You are shown the CURRENT room image and the user's refine request. Write ONE precise English image-edit instruction that performs the user's requested change and nothing else.

Follow these rules strictly:
1. Make ONLY the change the user asked for. If the request is vague (for example "make it cozier" or "warmer"), interpret it into a concrete but MINIMAL change (for example add a soft throw blanket and a warm table lamp), never a full restyle.
2. Keep everything else in the room exactly the same: the existing furniture, decor, colours, textiles, objects and their positions stay untouched unless the user explicitly asked to change them.
3. Never alter architecture: do not change or move walls, windows, doors, ceiling, floor, room layout or the camera angle.
4. Be specific and actionable so the image model knows exactly what to add, remove or modify.

Output ONLY the instruction text. No preamble, no quotation marks, no bullet points, no explanation.`;

/** Compose a tailored, surgical refine instruction from the current room image +
 *  the user's refine request. Returns the creative instruction ONLY (no change-only
 *  guardrail — the caller appends REFINE_LOCK). Throws on any failure so the caller
 *  can fall back to the deterministic refine prompt. */
export async function composeRefinePrompt(args: {
  imageRef: string; // data URI or public URL of the current room image
  instruction: string; // the user's refine request
  apiKey: string;
}): Promise<string> {
  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") || "https://api.minimaxi.com";
  const userText = `User's refine request (make only this change, keep everything else the same): ${args.instruction.trim()}.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPOSER_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [
          { role: "system", content: REFINE_COMPOSER_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: args.imageRef } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`composer_minimax_error ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      base_resp?: { status_code?: number; status_msg?: string };
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      throw new Error(
        `composer_minimax_status ${json.base_resp.status_code}: ${json.base_resp.status_msg ?? ""}`,
      );
    }
    const out = json.choices?.[0]?.message?.content;
    if (!out || typeof out !== "string" || !out.trim()) {
      throw new Error("composer_no_output");
    }
    return out.trim();
  } finally {
    clearTimeout(timer);
  }
}
