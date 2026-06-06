import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildRestylePrompt,
  buildRefinePrompt,
  buildMatchPrompt,
  STYLE_PROMPTS,
  ARCHITECTURE_LOCK,
  REFINE_LOCK,
  userOverride,
} from "@/lib/prompts";
import { composeRestylePrompt, composeRefinePrompt } from "@/lib/composer";
import type { StyleId, BudgetId } from "@/lib/types";

// LLM prompt composer: when ON, a MiniMax vision call reads the actual room
// photo + style + budget + the user's note and writes a tailored restyle
// instruction (we still append ARCHITECTURE_LOCK and fall back to the
// deterministic template on any failure). Only fires when the user typed
// something in "anything specific" — that's where it earns its keep. Flip the
// COMPOSER_ENABLED env var to "true"/"false" to toggle without a code change.
const COMPOSER_ENABLED = process.env.COMPOSER_ENABLED === "true";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Anonymous (signed-out) free-trial caps (server-enforced) ──
// Best-effort anti-abuse: a device cookie + IP gate. Clearing cookies,
// incognito, or a fresh IP can still reset this — the goal is stopping casual
// replay of the free trial, NOT perfect enforcement.
const ANON_FREE_PER_DEVICE = 1; // total free generations per device cookie
const ANON_FREE_PER_IP = 3; // free generations per IP per rolling 24h
const RA_DID_COOKIE = "ra_did";
const RA_DID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Attach the anon device-id cookie to a response and return it. */
function withDeviceCookie(res: NextResponse, deviceId: string): NextResponse {
  res.cookies.set(RA_DID_COOKIE, deviceId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: RA_DID_MAX_AGE,
  });
  return res;
}

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

  // ── Anonymous device id (httpOnly cookie). ──
  // Read the existing ra_did cookie; mint one if absent. We MUST set this on the
  // responses we return for anon requests (success + the anon-limit 402).
  const deviceId =
    request.cookies.get(RA_DID_COOKIE)?.value || crypto.randomUUID();

  // Client IP (first hop of x-forwarded-for, then x-real-ip).
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  // ── Credit logic (server-authoritative). ──
  // Signed in: spend 1 credit BEFORE calling fal; refund on failure.
  // Anonymous: server-enforced free trial (device cookie + IP), best-effort
  // anti-abuse — see the ANON_FREE_* constants above. The free row is recorded
  // only on SUCCESS, so failures don't burn the trial.
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
  } else {
    // Anonymous: count prior free trials BEFORE generating. Admin client
    // (service role) bypasses RLS on anon_trials.
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: deviceCount } = await admin
      .from("anon_trials")
      .select("id", { count: "exact", head: true })
      .eq("device_id", deviceId);

    let ipCount = 0;
    if (ip) {
      const { count } = await admin
        .from("anon_trials")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gt("created_at", sinceIso);
      ipCount = count ?? 0;
    }

    if (
      (deviceCount ?? 0) >= ANON_FREE_PER_DEVICE ||
      ipCount >= ANON_FREE_PER_IP
    ) {
      // Distinct from insufficient_credits: the anon free trial is used up.
      return withDeviceCookie(
        NextResponse.json({ error: "anon_trial_used" }, { status: 402 }),
        deviceId,
      );
    }
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
    // When COMPOSER_ENABLED and there is text to act on, a MiniMax vision call
    // reads the actual room photo + the user's note and writes a tailored prompt.
    // The deterministic template is computed FIRST as the guaranteed fallback,
    // then overwritten only on composer success. Any thrown error leaves the
    // deterministic prompt in place — strictly additive, never breaking.
    let prompt: string;
    if (mode === "refine") {
      // Fallback first (always safe).
      prompt = buildRefinePrompt(note);
      if (COMPOSER_ENABLED && process.env.MINIMAX_API_KEY && note.trim()) {
        try {
          // Fetch the parent result to a data URI for reliable MiniMax vision.
          // A failure here falls back to the deterministic refine prompt.
          const pbuf = Buffer.from(await (await fetch(inputImageUrl)).arrayBuffer());
          const refDataUri = `data:image/png;base64,${pbuf.toString("base64")}`;
          const composed = await composeRefinePrompt({
            imageRef: refDataUri,
            instruction: note,
            apiKey: process.env.MINIMAX_API_KEY,
          });
          prompt = `${composed} ${REFINE_LOCK}`;
        } catch (composerErr) {
          console.error("refine composer failed, using deterministic prompt:", composerErr);
        }
      }
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
      // Fallback first (always safe).
      prompt = buildMatchPrompt(caption, budget, note);
      if (COMPOSER_ENABLED && minimaxKey && note.trim()) {
        try {
          const imageRef = body.imageBase64 ?? inputImageUrl;
          const composed = await composeRestylePrompt({
            imageRef,
            styleDescriptor: `Match this decor style: ${caption}`,
            budget,
            note,
            apiKey: minimaxKey,
          });
          // Re-assert the user's note LAST (after the lock) so it wins on
          // recency, mirroring the deterministic path. Without this the lock's
          // "furnish with free-standing furniture" can override "keep the bed".
          prompt = `${composed} ${ARCHITECTURE_LOCK} ${userOverride(note)}`;
        } catch (composerErr) {
          console.error("match composer failed, using deterministic prompt:", composerErr);
        }
      }
    } else {
      // Fallback first (always safe).
      prompt = buildRestylePrompt({ style, budget, note });
      if (COMPOSER_ENABLED && process.env.MINIMAX_API_KEY && note.trim()) {
        try {
          // Prefer the data URI when present (MiniMax reads it directly).
          const imageRef = body.imageBase64 ?? inputImageUrl;
          const composed = await composeRestylePrompt({
            imageRef,
            styleDescriptor: STYLE_PROMPTS[style] ?? STYLE_PROMPTS.scandi,
            budget,
            note,
            apiKey: process.env.MINIMAX_API_KEY,
          });
          // Re-assert the user's note LAST (after the lock) so it wins on
          // recency, mirroring the deterministic path. Without this the lock's
          // "furnish with free-standing furniture" can override "keep the bed".
          prompt = `${composed} ${ARCHITECTURE_LOCK} ${userOverride(note)}`;
        } catch (composerErr) {
          console.error("restyle composer failed, using deterministic prompt:", composerErr);
        }
      }
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

    // Record the anon free trial ONLY on success (so failures don't burn it).
    if (!user) {
      await admin.from("anon_trials").insert({ device_id: deviceId, ip });
    }

    const successRes = NextResponse.json({
      generationId: row.id as string,
      originalUrl,
      resultUrl,
      balance,
    });
    // Set the device cookie on anon success so future requests are gated.
    return user ? successRes : withDeviceCookie(successRes, deviceId);
  } catch (err) {
    // Anything after a successful spend → refund and report.
    await refundOnFailure();
    const message = err instanceof Error ? err.message : "generation_failed";
    const errorRes = NextResponse.json(
      { error: "generation_failed", detail: message, balance },
      { status: 500 },
    );
    // Keep the anon device cookie stable across retries (no trial recorded).
    return user ? errorRes : withDeviceCookie(errorRes, deviceId);
  }
}
