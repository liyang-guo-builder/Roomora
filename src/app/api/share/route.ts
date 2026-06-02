import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface ShareBody {
  generationId?: string;
}

/**
 * POST /api/share  { generationId }
 * Marks a generation as publicly shareable (shared=true) so /share/[id] renders
 * it. Works for both signed-in users (own rows, or orphaned anon rows they
 * created) and anonymous trial users (rows with user_id IS NULL). The id is an
 * unguessable UUID, so the share link acts as an unlisted capability URL.
 *
 * Sharing is always opt-in: nothing is public until the user taps Share.
 */
export async function POST(request: NextRequest) {
  let body: ShareBody;
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const generationId = body.generationId;
  if (!generationId) {
    return NextResponse.json({ error: "missing_generation_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  let query = admin
    .from("generations")
    .update({ shared: true })
    .eq("id", generationId);

  // Signed in: own rows OR orphaned anon rows. Anonymous: anon rows only.
  query = user
    ? query.or(`user_id.eq.${user.id},user_id.is.null`)
    : query.is("user_id", null);

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json(
      { error: "share_failed", detail: error.message },
      { status: 500 },
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: generationId });
}
