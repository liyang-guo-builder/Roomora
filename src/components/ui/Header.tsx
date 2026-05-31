"use client";

import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { Logo } from "./Logo";
import { Hex } from "./Icon";
import type { ReactNode } from "react";

export function LangToggle() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const opts: [Lang, string][] = [
    ["en", "EN"],
    ["zh", "中"],
  ];
  return (
    <div className="inline-flex items-center rounded-full bg-surface border border-line p-[3px] text-[12.5px] font-semibold">
      {opts.map(([k, lab]) => (
        <button
          key={k}
          onClick={() => setLang(k)}
          className={`px-2.5 h-[26px] rounded-full transition-all ${
            lang === k ? "bg-sage text-paper" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {lab}
        </button>
      ))}
    </div>
  );
}

export function CreditPill({ onClick }: { onClick?: () => void }) {
  const credits = useStore((s) => s.credits);
  const low = credits <= 2;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-[34px] pl-3 pr-3.5 rounded-full border text-[14px] font-semibold transition-colors ${
        low
          ? "border-danger/40 text-danger bg-danger-tint"
          : "border-line text-ink bg-surface hover:border-brass/60"
      }`}
    >
      <Hex size={13} className={low ? "text-danger" : "text-brass"} />
      {credits}
    </button>
  );
}

export function AppHeader({ onCredits, left }: { onCredits?: () => void; left?: ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 h-[58px] shrink-0 bg-paper/90 backdrop-blur-md border-b border-line/60 sticky top-0 z-20">
      {left || <Logo size={30} />}
      <div className="flex items-center gap-2">
        <LangToggle />
        <CreditPill onClick={onCredits} />
      </div>
    </header>
  );
}
