import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — ADMIN/DEV ONLY.
 * NEVER import this into a client component (it reads the service-role key,
 * which must never reach the browser). Only import from route handlers /
 * server-side code.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
