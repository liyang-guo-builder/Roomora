import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client (anon key + cookie-bound session).
 * `cookies()` is async in Next 16, so this must be awaited.
 * Use in route handlers, server components, and server actions.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore when
            // middleware is refreshing sessions.
          }
        },
      },
    },
  );
}
