"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui";
import { GEN_MSGS, STYLE_NAMES } from "@/lib/constants";

export function GeneratingScreen() {
  const { t, lang } = useT();
  const roomPhoto = useStore((s) => s.roomPhoto);
  const styleId = useStore((s) => s.setup.style) ?? "scandi";
  const [en, zh] = STYLE_NAMES[styleId] ?? STYLE_NAMES.scandi;
  const styleName = lang === "en" ? en : zh;

  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % GEN_MSGS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-5 pt-6 pb-10">
      {/* preview: the user's actual room, dimmed, with a working shimmer */}
      <div className="relative rounded-[20px] overflow-hidden h-[300px] bg-surface-sunk">
        {roomPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={roomPhoto}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px] brightness-[.8]"
          />
        ) : (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: "linear-gradient(155deg,#e7e1d2,#ddd6c4)" }}
          />
        )}
        <div className="absolute inset-0 bg-paper/30" />
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full border-[3px] border-white/60 border-t-sage animate-spin" />
          <span className="text-[12.5px] font-semibold text-white/90 drop-shadow">
            {t("Roomora is designing…", "Roomora 正在设计…")}
          </span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="text-[17px] font-semibold text-ink">
          {t(`Designing your ${en} room`, `正在设计你的${zh}房间`)}
        </div>
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

      {/* step skeletons */}
      <div className="mt-7 grid grid-cols-4 gap-2.5">
        {[
          t("Layout", "格局"),
          t("Furniture", "家具"),
          t("Lighting", "灯光"),
          t("Details", "细节"),
        ].map((labelText, n) => (
          <div key={labelText} className="flex flex-col items-center gap-1.5">
            <div
              className={`aspect-square w-full rounded-xl bg-surface-sunk ${n <= i % 4 ? "" : "animate-pulse"}`}
              style={{ animationDelay: `${n * 0.15}s` }}
            />
            <span className="text-[10px] text-ink-3">{labelText}</span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[12px] text-ink-3">
        {t("Usually takes 10–20 seconds", "通常需要 10–20 秒")}
      </p>
    </div>
  );
}
