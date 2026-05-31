"use client";

import { useStore } from "./store";

/**
 * Lightweight i18n hook ported from the prototype's inline `t('English','中文')`
 * pattern. Reads `lang` from the Zustand store and returns a translator.
 */
export function useT() {
  const lang = useStore((s) => s.lang);
  const t = (en: string, zh: string) => (lang === "en" ? en : zh);
  return { lang, t };
}
