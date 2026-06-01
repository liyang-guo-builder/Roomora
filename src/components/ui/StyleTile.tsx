"use client";

import Image from "next/image";
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
      <Image
        src={`/styles/${id}.jpg`}
        alt={lang === "en" ? en : zh}
        fill
        sizes="(max-width:480px) 45vw, 200px"
        className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-x-0 bottom-0 p-2.5 pt-7 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
        <div className="text-paper text-[13px] font-semibold leading-tight drop-shadow">
          {lang === "en" ? en : zh}
        </div>
        <div className="text-paper/75 text-[10.5px] leading-tight drop-shadow">{lang === "en" ? zh : en}</div>
      </div>
      {active && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sage text-paper flex items-center justify-center shadow">
          <Icon name="check" size={15} stroke={2.2} />
        </div>
      )}
    </button>
  );
}
