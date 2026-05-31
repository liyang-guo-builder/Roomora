"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Icon } from "@/components/ui";
import { GEN_MSGS } from "@/lib/constants";

export function GeneratingScreen() {
  const { t } = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % GEN_MSGS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="px-5 pt-6 pb-10">
      <div className="relative rounded-[20px] overflow-hidden h-[300px] bg-surface-sunk">
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "linear-gradient(155deg,#e7e1d2,#ddd6c4)" }}
        />
        <div className="absolute inset-0 shimmer" />
        <div className="absolute right-[12%] top-[10%] w-[26%] h-[42%] rounded bg-white/40" />
        <div className="absolute left-[10%] bottom-[10%] w-[44%] h-[24%] rounded-xl bg-black/[.05]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full border-[3px] border-sage/25 border-t-sage animate-spin" />
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="text-[17px] font-semibold text-ink">{t("Restyling your room", "正在焕新你的房间")}</div>
        <div
          key={i}
          className="mt-1.5 text-[14px] text-ink-2 transition-opacity duration-500 min-h-[20px]"
        >
          {t(GEN_MSGS[i][0], GEN_MSGS[i][1])}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-ink-3">
        <Icon name="lock" size={14} />{" "}
        {t("Your walls, doors and layout stay exactly as they are", "墙面、门窗与格局保持原样")}
      </div>

      {/* skeleton thumbs */}
      <div className="mt-7 grid grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="aspect-square rounded-xl bg-surface-sunk animate-pulse"
            style={{ animationDelay: `${n * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
