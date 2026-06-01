import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DEV/TEST ONLY. Resets a whitelisted test user's credits to a known value
 * (default 12) so functional tests are deterministic.
 *
 * GET /api/dev/reset?token=<ROOMORA_DEV_LOGIN_TOKEN>&email=<whitelisted addr>[&credits=12]
 *
 * Same gating as /api/dev/login. Inert (404) when ROOMORA_DEV_LOGIN_TOKEN unset.
 */

function whitelist(): string[] {
  return (process.env.TEST_USER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const devToken = process.env.ROOMORA_DEV_LOGIN_TOKEN;
  if (!devToken) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const credits = Number.parseInt(searchParams.get("credits") ?? "12", 10);

  if (token !== devToken || !whitelist().includes(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!Number.isFinite(credits) || credits < 0) {
    return NextResponse.json({ error: "bad_credits" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    return NextResponse.json(
      { error: "lookup_failed", detail: listErr.message },
      { status: 500 },
    );
  }
  const user = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // Ensure profile, then set credits to the known value and log a transaction.
  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, credits }, { onConflict: "id" });
  if (upsertErr) {
    return NextResponse.json(
      { error: "reset_failed", detail: upsertErr.message },
      { status: 500 },
    );
  }
  await admin.from("credit_transactions").insert({
    user_id: user.id,
    delta: 0,
    reason: `dev_reset_to_${credits}`,
  });

  return NextResponse.json({ ok: true, email, credits });
}
