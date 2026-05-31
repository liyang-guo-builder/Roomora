"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useFlow } from "@/components/flow/FlowProvider";
import { Btn, Icon, RoomPhoto, BeforeAfter, type IconName } from "@/components/ui";
import { STYLE_NAMES } from "@/lib/constants";

export function ResultScreen() {
  const { t } = useT();
  const router = useRouter();
  const { openModal, doSave, doDownload } = useFlow();
  const result = useStore((s) => s.result);
  const anon = useStore((s) => s.anon);
  const currentSaved = useStore((s) => s.currentSaved);
  const setupStyle = useStore((s) => s.setup.style);

  const [activeV, setActiveV] = useState(0);
  const variations = Math.max(1, result?.versions.length ?? 1);
  const styleId = result?.styleId ?? setupStyle ?? "scandi";
  const [en, zh] = STYLE_NAMES[styleId];
  const styleName = t(en, zh);

  const actions: [IconName, string, () => void][] = [
    ["heart", t("Save", "保存"), doSave],
    ["download", t("Download", "下载"), doDownload],
    ["share", t("Share", "分享"), () => openModal("share")],
  ];

  return (
    <div className="px-5 pt-3 pb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            {t("your room, restyled", "你的房间，焕然一新")}
          </div>
          <h2 className="text-[19px] font-semibold tracking-[-.01em] text-ink">{styleName}</h2>
        </div>
        <button
          onClick={doSave}
          className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            currentSaved
              ? "bg-sage text-paper border-sage"
              : "bg-surface text-ink-2 border-line hover:border-sage"
          }`}
        >
          <Icon name={currentSaved ? "heartFill" : "heart"} size={20} />
        </button>
      </div>

      <BeforeAfter height={320} watermark={anon || !currentSaved} />

      {/* variation strip */}
      <div className="mt-5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{t("Variations", "设计版本")}</span>
        <span className="text-[11.5px] text-ink-3">{t("Tap to switch", "点击切换")}</span>
      </div>
      <div className="mt-2 flex items-start gap-4 overflow-x-auto pt-1 pb-1 -mx-1 px-1.5">
        {Array.from({ length: variations }).map((_, i) => (
          <div key={i} className="shrink-0 flex flex-col items-center gap-1">
            <button
              onClick={() => setActiveV(i)}
              className={`relative w-16 h-16 rounded-xl overflow-hidden transition-all ${
                activeV === i
                  ? "ring-2 ring-sage ring-offset-2 ring-offset-paper"
                  : "ring-1 ring-line opacity-80"
              }`}
            >
              <RoomPhoto variant="after" rounded="rounded-none" tag={false} className="absolute inset-0" />
            </button>
            <span className={`text-[10px] font-medium ${activeV === i ? "text-sage" : "text-ink-3"}`}>
              {t("v", "版")}
              {i + 1}
            </span>
          </div>
        ))}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-xl border border-dashed border-line flex items-center justify-center text-ink-3 text-[10px] text-center leading-tight px-1">
            {t("variation", "更多")}
          </div>
          <span className="text-[10px] text-transparent select-none">·</span>
        </div>
      </div>

      {/* actions */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {actions.map(([ic, lab, fn]) => (
          <button
            key={lab}
            onClick={fn}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-surface border border-line/70 shadow-card hover:border-sage transition-colors active:scale-[.98]"
          >
            <Icon name={ic} size={21} className="text-sage" />
            <span className="text-[12.5px] font-medium text-ink">{lab}</span>
          </button>
        ))}
      </div>

      <Btn variant="brass" size="lg" full icon="wand" className="mt-3" onClick={() => router.push("/refine")}>
        {t("Refine this design", "继续微调")}
      </Btn>

      <div className="mt-4 flex items-start gap-2 text-[12px] text-ink-2 bg-sage-tint/50 rounded-xl px-3 py-2.5">
        <Icon name="lock" size={15} className="text-sage mt-px shrink-0" />
        {t(
          "This is still your room — same walls, windows and proportions. Only the styling changed.",
          "这依然是你的房间 —— 墙面、窗户和比例不变，只改变了风格。",
        )}
      </div>
    </div>
  );
}
