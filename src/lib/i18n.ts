"use client";

import { useStore } from "./store";

/**
 * Lightweight i18n hook ported from the prototype's inline `t('English','中文')`
 * pattern. Reads `lang` from the Zustand store and returns a translator.
 */
export function useT() {
  const lang = useStore((s) => s.lang);
  // Third (French) arg is optional so existing two-arg calls keep working; when
  // French is selected but no French string is provided, fall back to English.
  const t = (en: string, zh: string, fr?: string) =>
    lang === "zh" ? zh : lang === "fr" ? fr ?? en : en;
  return { lang, t };
}
