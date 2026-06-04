/* Roomora — real Supabase-backed services (Phase 2).
   Drop-in replacements for the mocks, behind the SAME typed interfaces. */

"use client";

import { createClient } from "@/lib/supabase/client";
import { PACKS } from "@/lib/packs";
import type {
  AuthService,
  AuthSession,
  AuthProvider,
  CreditsService,
  PaymentService,
  PurchaseResult,
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
      // Send a 6-digit code (no emailRedirectTo → the email carries the code,
      // which the user types back into the app via verifyEmailOtp). New users
      // are created on verify; they get +3 credits via the signup trigger.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      // No session yet; the user enters the code, then verifyEmailOtp signs in.
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

    // WeChat OAuth not configured yet.
    throw new Error("provider_not_configured");
  },

  async signUp(email: string, password: string, fullName?: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) throw error;
    // Instant signup (email confirmation disabled) → session is set now, and
    // the signup trigger grants +3 credits. useAuthSync mirrors it to the store.
  },

  async signInWithPassword(email: string, password: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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

/* ── payment ──
   Real Stripe checkout. purchase() asks the server to create a Checkout
   Session and returns its url for the browser to redirect to; the credit is
   granted server-side by the webhook, never here. When Stripe is not
   configured the route replies 503 and we surface a typed error so the caller
   can fall back to the mock (local/dev). */
export class StripeNotConfiguredError extends Error {
  constructor() {
    super("stripe_not_configured");
    this.name = "StripeNotConfiguredError";
  }
}

export const paymentService: PaymentService = {
  packs: PACKS,
  async purchase(packIndex: number): Promise<PurchaseResult> {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packIndex }),
    });
    if (res.status === 503) {
      // Stripe not wired up — let the caller fall back to the mock grant.
      throw new StripeNotConfiguredError();
    }
    if (!res.ok) {
      throw new Error("checkout_failed");
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error("checkout_failed");
    return { checkoutUrl: data.url };
  },
};
