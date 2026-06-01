import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback: exchanges the `code` from the email link for a session
 * (auth cookies set via the SSR server client), then redirects home.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code or exchange failed — send home with an error flag the UI can ignore.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
