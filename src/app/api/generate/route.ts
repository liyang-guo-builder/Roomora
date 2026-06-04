import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildRestylePrompt,
  buildRefinePrompt,
  buildMatchPrompt,
} from "@/lib/prompts";
import type { StyleId, BudgetId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Restyle + match-a-photo use Nano Banana (Gemini image) — clearly more
// beautiful in the bake-off, ~$0.039/image, architecture preserved. Refine
// stays on Qwen-Image-Edit for tighter "change only X" control.
const QWEN_EDIT_URL = "https://fal.run/fal-ai/qwen-image-edit";
const NANO_BANANA_EDIT_URL = "https://fal.run/fal-ai/nano-banana/edit";

const CAPTION_PROMPT =
  "Describe ONLY the interior decor style of this room in 2-3 sentences for restyling a different room: colour palette, materials, furniture types, textiles, lighting, plants and mood. Do NOT mention walls, windows, ceiling, doors, room shape or architecture.";

interface GenerateBody {
  imageBase64?: string; // data URI (restyle input)
  imageUrl?: string; // public URL (alt restyle input)
  inspirationBase64?: string; // data URI (match-mode style reference; captioned only)
  style?: StyleId;
  note?: string;
  budget?: BudgetId | null;
  mode?: "restyle" | "match" | "refine";
  parentId?: string;
}

/** Caption the STYLE ONLY of the inspiration image via MiniMax vision.
   Throws on any failure so the caller can refund + report like a failed Qwen call. */
async function captionInspiration(
  inspirationDataUri: string,
  apiKey: string,
): Promise<string> {
  const base =
    process.env.MINIMAX_BASE_URL?.replace(/\/+$/, "") ||
    "https://api.minimaxi.com";
  const res = await fetch(`${base}/v1/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: CAPTION_PROMPT },
            { type: "image_url", image_url: { url: inspirationDataUri } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`minimax_error ${res.status}: ${detail.slice(0, 300)}`);
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
  const caption = json.choices?.[0]?.message?.content;
  if (!caption || typeof caption !== "string" || !caption.trim()) {
    throw new Error("minimax_no_caption");
  }
  return caption.trim();
}

/** Decode a data URI / raw base64 into bytes + content type. */
function decodeImage(dataUri: string): { bytes: Buffer; contentType: string } {
  const comma = dataUri.indexOf(",");
  const m = /^data:([^;]+);base64$/.exec(dataUri.slice(0, comma));
  if (comma !== -1 && m) {
    return { bytes: Buffer.from(dataUri.slice(comma + 1), "base64"), contentType: m[1] };
  }
  // Raw base64 (no prefix) — assume jpeg.
  return { bytes: Buffer.from(dataUri, "base64"), contentType: "image/jpeg" };
}

function extFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(request: NextRequest) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "engine_not_configured" }, { status: 500 });
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const mode =
    body.mode === "refine"
      ? "refine"
      : body.mode === "match"
        ? "match"
        : "restyle";
  const style: StyleId = body.style ?? "scandi";
  const note = body.note ?? "";
  const budget: BudgetId | null = body.budget ?? null;

  // Match mode requires an inspiration image to caption (rejected before any
  // credit is spent). The room photo (the edit base) is validated below.
  if (mode === "match" && !body.inspirationBase64) {
    return NextResponse.json({ error: "missing_inspiration" }, { status: 400 });
  }

  // ── Identify the user (server session). ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // ── Credit logic (server-authoritative). ──
  // Signed in: spend 1 credit BEFORE calling fal; refund on failure.
  // Anonymous: allowed (client enforces the 1-free trial).
  // TODO(phase-hardening): enforce the anonymous free-trial server-side too
  // (e.g. by device/IP) so the trial can't be replayed by clearing localStorage.
  let balance: number | null = null;
  let creditSpent = false;
  if (user) {
    const { data, error } = await supabase.rpc("spend_credits", {
      p_amount: 1,
      p_reason: mode === "refine" ? "refine" : "generation",
    });
    if (error) {
      // insufficient credits / no profile — signal the client to open Buy.
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }
    balance = data as number;
    creditSpent = true;
  }

  // Helper to refund the spent credit on any downstream failure.
  async function refundOnFailure() {
    if (!user || !creditSpent) return;
    await supabase
      .rpc("add_credits", { p_amount: 1, p_reason: "refund" })
      .then(({ data }) => {
        if (typeof data === "number") balance = data;
      });
  }

  try {
    // ── Resolve the input image URL Qwen will edit. ──
    let inputImageUrl: string;
    let originalUrl: string | null = null;

    if (mode === "refine") {
      if (!body.parentId) {
        await refundOnFailure();
        return NextResponse.json(
          { error: "missing_parent", balance },
          { status: 400 },
        );
      }
      const { data: parent, error: parentErr } = await admin
        .from("generations")
        .select("result_url, original_url")
        .eq("id", body.parentId)
        .single();
      if (parentErr || !parent?.result_url) {
        await refundOnFailure();
        return NextResponse.json(
          { error: "parent_not_found", balance },
          { status: 400 },
        );
      }
      inputImageUrl = parent.result_url as string;
      originalUrl = (parent.original_url as string | null) ?? null;
    } else {
      // restyle: upload the user's photo to the `rooms` bucket → public URL.
      const src = body.imageBase64 ?? body.imageUrl;
      if (!src) {
        await refundOnFailure();
        return NextResponse.json(
          { error: "missing_image", balance },
          { status: 400 },
        );
      }
      if (body.imageBase64) {
        const { bytes, contentType } = decodeImage(body.imageBase64);
        const path = `${user?.id ?? "anon"}/${crypto.randomUUID()}.${extFor(contentType)}`;
        const { error: upErr } = await admin.storage
          .from("rooms")
          .upload(path, bytes, { contentType, upsert: false });
        if (upErr) throw new Error(`room_upload_failed: ${upErr.message}`);
        originalUrl = admin.storage.from("rooms").getPublicUrl(path).data.publicUrl;
        inputImageUrl = originalUrl;
      } else {
        // Caller passed a public URL directly.
        inputImageUrl = body.imageUrl!;
        originalUrl = body.imageUrl!;
      }
    }

    // ── Build the prompt. ──
    let prompt: string;
    if (mode === "refine") {
      prompt = buildRefinePrompt(note);
    } else if (mode === "match") {
      // Caption the inspiration's STYLE ONLY via MiniMax (the inspiration image
      // itself NEVER reaches Qwen — only its decor description does, so the user's
      // room architecture is fully preserved). The user's roomPhoto stays the base.
      if (!body.inspirationBase64) {
        await refundOnFailure();
        return NextResponse.json(
          { error: "missing_inspiration", balance },
          { status: 400 },
        );
      }
      const minimaxKey = process.env.MINIMAX_API_KEY;
      if (!minimaxKey) throw new Error("minimax_not_configured");
      const caption = await captionInspiration(body.inspirationBase64, minimaxKey);
      prompt = buildMatchPrompt(caption, budget, note);
    } else {
      prompt = buildRestylePrompt({ style, budget, note });
    }

    // ── Call the image-edit engine on fal. ──
    // Nano Banana for restyle + match (more beautiful); Qwen for refine (control).
    const useNanoBanana = mode !== "refine";
    const falRes = await fetch(useNanoBanana ? NANO_BANANA_EDIT_URL : QWEN_EDIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        useNanoBanana
          ? { prompt, image_urls: [inputImageUrl], output_format: "png" }
          : {
              prompt,
              image_url: inputImageUrl,
              num_inference_steps: 30,
              guidance_scale: 4,
              output_format: "png",
            },
      ),
    });

    if (!falRes.ok) {
      const detail = await falRes.text().catch(() => "");
      throw new Error(`fal_error ${falRes.status}: ${detail.slice(0, 300)}`);
    }
    const falJson = (await falRes.json()) as { images?: { url: string }[] };
    const resultRemoteUrl = falJson.images?.[0]?.url;
    if (!resultRemoteUrl) throw new Error("fal_no_image");

    // ── Fetch the generated PNG bytes and persist to the `designs` bucket. ──
    const pngRes = await fetch(resultRemoteUrl);
    if (!pngRes.ok) throw new Error(`result_fetch_failed ${pngRes.status}`);
    const pngBytes = Buffer.from(await pngRes.arrayBuffer());
    const resultPath = `${user?.id ?? "anon"}/${crypto.randomUUID()}.png`;
    const { error: designErr } = await admin.storage
      .from("designs")
      .upload(resultPath, pngBytes, {
        contentType: "image/png",
        upsert: false,
      });
    if (designErr) throw new Error(`design_upload_failed: ${designErr.message}`);
    const resultUrl = admin.storage
      .from("designs")
      .getPublicUrl(resultPath).data.publicUrl;

    // ── Insert the generations row (admin bypasses RLS). ──
    const { data: row, error: insErr } = await admin
      .from("generations")
      .insert({
        user_id: user?.id ?? null,
        original_url: originalUrl,
        result_url: resultUrl,
        style,
        note: note || null,
        budget,
        prompt,
        parent_id: mode === "refine" ? body.parentId : null,
        status: "done",
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(`insert_failed: ${insErr?.message}`);

    return NextResponse.json({
      generationId: row.id as string,
      originalUrl,
      resultUrl,
      balance,
    });
  } catch (err) {
    // Anything after a successful spend → refund and report.
    await refundOnFailure();
    const message = err instanceof Error ? err.message : "generation_failed";
    return NextResponse.json(
      { error: "generation_failed", detail: message, balance },
      { status: 500 },
    );
  }
}
