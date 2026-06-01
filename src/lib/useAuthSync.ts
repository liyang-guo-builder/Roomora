"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { creditsService } from "@/lib/services";
import { useStore } from "@/lib/store";

/**
 * Subscribes to Supabase auth state and mirrors it into the Zustand store:
 * - sets `user` (and the derived `anon`)
 * - on a signed-in session, loads the real credit balance into `credits`
 *
 * Mount once near the app root (FlowProvider). Runs client-side only.
 */
export function useAuthSync() {
  const setUser = useStore((s) => s.setUser);
  const setCredits = useStore((s) => s.setCredits);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadBalance() {
      const bal = await creditsService.balance();
      if (active) setCredits(bal);
    }

    // Initial read.
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? null });
        void loadBalance();
      } else {
        setUser(null);
      }
    });

    // Live updates (sign-in via magic link / dev login, sign-out, refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? null });
        void loadBalance();
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setUser, setCredits]);
}
