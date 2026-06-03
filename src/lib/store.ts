"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Lang,
  SetupState,
  GenerationResult,
  GenerationVersion,
} from "./types";

const DEFAULT_SETUP: SetupState = {
  tab: "browse",
  style: "scandi",
  note: "",
  budget: null,
};

/** Minimal authenticated-user shape mirrored from the Supabase session. */
export interface SessionUser {
  id: string;
  email: string | null;
}

/** Free designs an anonymous (signed-out) user gets before sign-in is required. */
export const ANON_TRIAL_MAX = 3;

interface RoomoraState {
  /* ── persisted global state ── */
  lang: Lang;
  credits: number;
  saved: number;
  /** Remaining free anonymous designs (generate or refine). Persisted per browser. */
  anonTrialRemaining: number;

  /* ── transient per-flow state (not persisted) ── */
  hasPhoto: boolean;
  /** The user's chosen room photo as a data URI (Phase 3). */
  roomPhoto: string | null;
  /** The "Match a photo" inspiration image as a data URI (captioned, never edited). */
  inspirationPhoto: string | null;
  setup: SetupState;
  result: GenerationResult | null;
  /** Real Supabase session user; null when signed out. */
  user: SessionUser | null;
  /** Derived: true when there is no signed-in user. Kept for screen parity. */
  anon: boolean;
  currentSaved: boolean;

  /* ── actions ── */
  setLang: (lang: Lang) => void;
  spend: (n?: number) => void;
  refund: (n?: number) => void;
  grant: (n: number) => void;
  setCredits: (n: number) => void;
  incSaved: () => void;
  consumeAnonTrial: () => void;

  setHasPhoto: (v: boolean) => void;
  setRoomPhoto: (uri: string | null) => void;
  setInspirationPhoto: (uri: string | null) => void;
  setSetup: (s: SetupState) => void;
  setResult: (r: GenerationResult | null) => void;
  appendVersion: (v: GenerationVersion) => void;
  setUser: (u: SessionUser | null) => void;
  setAnon: (v: boolean) => void;
  setCurrentSaved: (v: boolean) => void;
  resetFlow: () => void;
}

export const useStore = create<RoomoraState>()(
  persist(
    (set, get) => ({
      lang: "en",
      credits: 12,
      saved: 3,
      anonTrialRemaining: ANON_TRIAL_MAX,

      hasPhoto: false,
      roomPhoto: null,
      inspirationPhoto: null,
      setup: DEFAULT_SETUP,
      result: null,
      user: null,
      anon: true,
      currentSaved: false,

      setLang: (lang) => set({ lang }),
      spend: (n = 1) => set({ credits: Math.max(0, get().credits - n) }),
      refund: (n = 1) => set({ credits: get().credits + n }),
      grant: (n) => set({ credits: get().credits + n }),
      setCredits: (n) => set({ credits: n }),
      incSaved: () => set({ saved: get().saved + 1 }),
      consumeAnonTrial: () =>
        set({ anonTrialRemaining: Math.max(0, get().anonTrialRemaining - 1) }),

      setHasPhoto: (hasPhoto) => set({ hasPhoto }),
      setRoomPhoto: (roomPhoto) => set({ roomPhoto, hasPhoto: !!roomPhoto }),
      setInspirationPhoto: (inspirationPhoto) => set({ inspirationPhoto }),
      setSetup: (setup) => set({ setup }),
      setResult: (result) => set({ result, currentSaved: false }),
      appendVersion: (v) => {
        const r = get().result;
        if (!r) return;
        // The appended version is now the latest, so it becomes what Save flags.
        set({
          result: { ...r, versions: [...r.versions, v], generationId: v.id },
        });
      },
      setUser: (user) => set({ user, anon: !user }),
      setAnon: (anon) => set({ anon }),
      setCurrentSaved: (currentSaved) => set({ currentSaved }),
      resetFlow: () =>
        set({
          hasPhoto: false,
          roomPhoto: null,
          inspirationPhoto: null,
          setup: DEFAULT_SETUP,
          result: null,
          currentSaved: false,
        }),
    }),
    {
      name: "roomora",
      storage: createJSONStorage(() => localStorage),
      // Only the global state persists, matching the prototype's localStorage shape.
      partialize: (s) => ({
        lang: s.lang,
        credits: s.credits,
        saved: s.saved,
        anonTrialRemaining: s.anonTrialRemaining,
      }),
    },
  ),
);
