import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface SaveBody {
  generationId?: string;
}

/**
 * POST /api/designs  { generationId }
 * Flags a generation as saved for the current user. Server-authoritative:
 * requires a session and updates via the service-role admin client.
 *
 * Handles the anon→sign-in edge case: a generation made while signed out has
 * user_id IS NULL. On save (now signed in) we claim it by setting user_id to
 * the session user. The WHERE clause only matches the caller's own rows OR
 * orphaned (NULL) rows, so nobody can save someone else's design.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const generationId = body.generationId;
  if (!generationId) {
    return NextResponse.json({ error: "missing_generation_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generations")
    .update({ saved: true, user_id: user.id })
    .eq("id", generationId)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "save_failed", detail: error.message },
      { status: 500 },
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/designs
 * Returns the current user's saved generations, newest first.
 * Shape: [{ id, resultUrl, originalUrl, style, createdAt }]
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generations")
    .select("id, result_url, original_url, style, created_at")
    .eq("user_id", user.id)
    .eq("saved", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "list_failed", detail: error.message },
      { status: 500 },
    );
  }

  const designs = (data ?? []).map((r) => ({
    id: r.id as string,
    resultUrl: (r.result_url as string | null) ?? null,
    originalUrl: (r.original_url as string | null) ?? null,
    style: (r.style as string | null) ?? null,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json(designs);
}

/**
 * DELETE /api/designs  { generationId }
 * Removes a design from the user's saved list (sets saved=false). Only the
 * owner's own row can be unsaved; the generation itself is kept.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const generationId = body.generationId;
  if (!generationId) {
    return NextResponse.json({ error: "missing_generation_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("generations")
    .update({ saved: false })
    .eq("id", generationId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "unsave_failed", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
