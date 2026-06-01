import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DEV/TEST ONLY headless login. Lets the independent tester authenticate
 * without an email round-trip (magic links can't be automated).
 *
 * GET /api/dev/login?token=<ROOMORA_DEV_LOGIN_TOKEN>&email=<whitelisted addr>
 *
 * Gating: 403 unless the token matches AND the email is in TEST_USER_EMAILS.
 * Inert in production: if ROOMORA_DEV_LOGIN_TOKEN is unset, every request 404s.
 */

// Fixed password for the seeded test user(s). Only ever used server-side here.
const DEV_PASSWORD = "Roomora-dev-pw-7f3a9c2e5b!";

function whitelist(): string[] {
  return (process.env.TEST_USER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const devToken = process.env.ROOMORA_DEV_LOGIN_TOKEN;
  // Inert when the feature flag/token is unset (e.g. real production).
  if (!devToken) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (token !== devToken || !whitelist().includes(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Ensure the user exists (idempotent), confirmed, with the fixed password.
  let userId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });

  if (createErr) {
    // Likely already exists — look them up and reset the password to be sure.
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (!existing) {
      return NextResponse.json(
        { error: "user_provision_failed", detail: createErr.message },
        { status: 500 },
      );
    }
    userId = existing.id;
    await admin.auth.admin.updateUserById(existing.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
    });
  } else {
    userId = created.user?.id;
  }

  // Sign in via the SSR server client so auth cookies are written on the response.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });
  if (signInErr) {
    return NextResponse.json(
      { error: "signin_failed", detail: signInErr.message },
      { status: 500 },
    );
  }

  // Safety net: guarantee a profile row exists (the signup trigger creates it
  // for brand-new users; this covers users created before the trigger).
  if (userId) {
    await admin
      .from("profiles")
      .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  }

  return NextResponse.redirect(`${origin}/`);
}
