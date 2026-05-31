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

interface RoomoraState {
  /* ── persisted global state ── */
  lang: Lang;
  credits: number;
  saved: number;

  /* ── transient per-flow state (not persisted) ── */
  hasPhoto: boolean;
  setup: SetupState;
  result: GenerationResult | null;
  anon: boolean;
  currentSaved: boolean;

  /* ── actions ── */
  setLang: (lang: Lang) => void;
  spend: (n?: number) => void;
  refund: (n?: number) => void;
  grant: (n: number) => void;
  setCredits: (n: number) => void;
  incSaved: () => void;

  setHasPhoto: (v: boolean) => void;
  setSetup: (s: SetupState) => void;
  setResult: (r: GenerationResult | null) => void;
  appendVersion: (v: GenerationVersion) => void;
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

      hasPhoto: false,
      setup: DEFAULT_SETUP,
      result: null,
      anon: true,
      currentSaved: false,

      setLang: (lang) => set({ lang }),
      spend: (n = 1) => set({ credits: Math.max(0, get().credits - n) }),
      refund: (n = 1) => set({ credits: get().credits + n }),
      grant: (n) => set({ credits: get().credits + n }),
      setCredits: (n) => set({ credits: n }),
      incSaved: () => set({ saved: get().saved + 1 }),

      setHasPhoto: (hasPhoto) => set({ hasPhoto }),
      setSetup: (setup) => set({ setup }),
      setResult: (result) => set({ result, currentSaved: false }),
      appendVersion: (v) => {
        const r = get().result;
        if (!r) return;
        set({ result: { ...r, versions: [...r.versions, v] } });
      },
      setAnon: (anon) => set({ anon }),
      setCurrentSaved: (currentSaved) => set({ currentSaved }),
      resetFlow: () =>
        set({
          hasPhoto: false,
          setup: DEFAULT_SETUP,
          result: null,
          currentSaved: false,
        }),
    }),
    {
      name: "roomora",
      storage: createJSONStorage(() => localStorage),
      // Only the global state persists, matching the prototype's localStorage shape.
      partialize: (s) => ({ lang: s.lang, credits: s.credits, saved: s.saved }),
    },
  ),
);
