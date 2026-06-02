/* Roomora — real Supabase-backed services (Phase 2).
   Drop-in replacements for the mocks, behind the SAME typed interfaces. */

"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  AuthService,
  AuthSession,
  AuthProvider,
  CreditsService,
} from "./types";

/* ── auth ──
   Backed by the Supabase browser session. signIn for email = magic link
   (no immediate session — the user clicks the link, /auth/callback finishes).
   Google/WeChat are deferred placeholders (handled in the UI). */
export const authService: AuthService = {
  async signIn(provider: AuthProvider, email?: string): Promise<AuthSession> {
    const supabase = createClient();

    if (provider === "email") {
      if (!email) throw new Error("email_required");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) throw error;
      // Magic link sent; session is established later via the callback route.
      return { userId: "", email, grantedCredits: 0 };
    }

    if (provider === "google") {
      // OAuth redirect flow: Supabase sends the user to Google, then back to
      // /auth/callback which exchanges the code for a session. New users get
      // +3 credits via the signup trigger. (Requires the Google provider to be
      // configured in Supabase with a client id/secret.)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) throw error;
      // The browser navigates away; no session is returned synchronously.
      return { userId: "", email: null, grantedCredits: 0 };
    }

    // WeChat OAuth not configured yet — UI keeps it as a placeholder.
    throw new Error("provider_not_configured");
  },

  async signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
  },
};

/* ── credits ──
   Real balance from profiles.credits; mutations go through the
   SECURITY DEFINER RPCs which enforce the ledger server-side. */
export const creditsService: CreditsService = {
  async balance(): Promise<number> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return 0;
    const { data, error } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userData.user.id)
      .single();
    if (error || !data) return 0;
    return data.credits as number;
  },

  async spend(n = 1): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("spend_credits", {
      p_amount: n,
      p_reason: "generation",
    });
    if (error) throw error;
    return data as number;
  },

  async refund(n = 1): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_credits", {
      p_amount: n,
      p_reason: "refund",
    });
    if (error) throw error;
    return data as number;
  },

  async grant(n: number): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_credits", {
      p_amount: n,
      p_reason: "grant",
    });
    if (error) throw error;
    return data as number;
  },
};
