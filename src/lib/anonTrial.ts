"use client";

/**
 * Anonymous trial: preserves the "first design free · no signup" promise
 * without granting server credits. One free generation per browser, tracked
 * in localStorage. After it's used, a second generation — or any
 * Save/Download/Refine — must prompt sign-in (real server credits take over).
 */

const KEY = "roomora.anonTrialUsed";

export function anonTrialUsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markAnonTrialUsed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // ignore storage failures (private mode etc.)
  }
}

export function clearAnonTrial(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
