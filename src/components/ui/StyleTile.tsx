"use client";

import { useT } from "@/lib/i18n";
import { STYLE_TONES } from "@/lib/constants";
import type { StyleId } from "@/lib/types";
import { Icon } from "./Icon";

export function StyleTile({
  id,
  en,
  zh,
  active,
  onClick,
}: {
  id: StyleId;
  en: string;
  zh: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const { lang } = useT();
  return (
    <button
      onClick={onClick}
      className={`group relative aspect-[4/5] rounded-[16px] overflow-hidden text-left transition-all active:scale-[.98] ${
        active ? "ring-2 ring-sage ring-offset-2 ring-offset-paper" : "ring-1 ring-line"
      }`}
      style={{ background: STYLE_TONES[id] }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 75% 10%, rgba(255,255,255,.4), transparent 60%)" }}
      />
      <div className="absolute right-2 bottom-9 w-[34%] h-[30%] rounded-[7px] bg-white/25" />
      <div className="absolute inset-x-0 bottom-0 p-2.5 pt-6 bg-gradient-to-t from-black/45 to-transparent">
        <div className="text-paper text-[13px] font-semibold leading-tight">
          {lang === "en" ? en : zh}
        </div>
        <div className="text-paper/70 text-[10.5px] leading-tight">{lang === "en" ? zh : en}</div>
      </div>
      {active && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sage text-paper flex items-center justify-center shadow">
          <Icon name="check" size={15} stroke={2.2} />
        </div>
      )}
    </button>
  );
}
