"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useFlow } from "@/components/flow/FlowProvider";
import { Btn, Icon, RoomPhoto, BeforeAfter, type IconName } from "@/components/ui";
import { STYLE_NAMES } from "@/lib/constants";
import { ShopThisLook } from "@/components/screens/ShopThisLook";

export function ResultScreen() {
  const { t } = useT();
  const router = useRouter();
  const { openModal, doSave, doDownload } = useFlow();
  const result = useStore((s) => s.result);
  const anon = useStore((s) => s.anon);
  const anonTrialRemaining = useStore((s) => s.anonTrialRemaining);
  const currentSaved = useStore((s) => s.currentSaved);
  const setupStyle = useStore((s) => s.setup.style);
  const resetFlow = useStore((s) => s.resetFlow);

  // Out of the free trial → any "start a new design" action prompts sign-up
  // (which grants 3 more) instead of walking into a dead end.
  const outOfFree = anon && anonTrialRemaining <= 0;

  const startNewRoom = () => {
    if (outOfFree) {
      openModal("auth", { reason: "free" });
      return;
    }
    resetFlow();
    router.push("/app");
  };

  const startRefine = () => {
    if (outOfFree) {
      openModal("auth", { reason: "free" });
      return;
    }
    router.push("/refine");
  };

  const versions = result?.versions ?? [];
  // Default to the NEWEST version. A refine appends a version, so the big image
  // must follow to the latest one (not stay on the original) — otherwise every
  // refine "looks unchanged". Initialise to the last index, and jump forward
  // whenever a new version is appended, while still letting the user tap back.
  const [activeV, setActiveV] = useState(() => Math.max(0, versions.length - 1));
  const prevLen = useRef(versions.length);
  useEffect(() => {
    if (versions.length > prevLen.current) setActiveV(versions.length - 1);
    prevLen.current = versions.length;
  }, [versions.length]);
  const variations = Math.max(1, versions.length || 1);
  const styleId = result?.styleId ?? setupStyle ?? "scandi";
  const [en, zh] = STYLE_NAMES[styleId];
  const styleName = t(en, zh);

  const beforeUrl = result?.originalUrl ?? null;
  const activeVersion = versions[Math.min(activeV, versions.length - 1)];
  const afterUrl = activeVersion?.resultUrl ?? null;
  const generationId = result?.generationId ?? null;
  const [shopOpen, setShopOpen] = useState(false);

  const actions: [IconName, string, () => void][] = [
    [
      currentSaved ? "heartFill" : "heart",
      currentSaved ? t("Saved", "已保存") : t("Save", "保存"),
      doSave,
    ],
    ["download", t("Download", "下载"), () => void doDownload(afterUrl)],
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

      <BeforeAfter
        height={320}
        watermark={anon || !currentSaved}
        beforeUrl={beforeUrl}
        afterUrl={afterUrl}
      />

      {/* variation strip */}
      <div className="mt-5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{t("Variations", "设计版本")}</span>
        <span className="text-[11.5px] text-ink-3">
          {versions.length > 1 ? t("Tap to switch", "点击切换") : t("Refine to add more", "微调可生成更多")}
        </span>
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
              {versions[i]?.resultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={versions[i].resultUrl!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <RoomPhoto variant="after" rounded="rounded-none" tag={false} className="absolute inset-0" />
              )}
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

      {/* Shop this look */}
      {generationId && (
        <div className="mt-3">
          <button
            onClick={() => setShopOpen((v) => !v)}
            aria-expanded={shopOpen}
            className="w-full flex items-center justify-between gap-2 px-4 h-[52px] rounded-2xl bg-sage-tint/70 border border-sage/30 text-ink hover:border-sage transition-colors active:scale-[.99]"
          >
            <span className="flex items-center gap-2">
              <Icon name="bag" size={19} className="text-sage" />
              <span className="text-[14.5px] font-semibold">{t("Shop this look", "购买同款")}</span>
            </span>
            <Icon
              name="chevronDown"
              size={18}
              className={`text-ink-3 transition-transform ${shopOpen ? "rotate-180" : ""}`}
            />
          </button>
          {shopOpen && <ShopThisLook generationId={generationId} />}
        </div>
      )}

      <Btn variant="brass" size="lg" full icon="wand" className="mt-3" onClick={startRefine}>
        {t("Refine this design", "继续微调")}
      </Btn>

      <button
        onClick={startNewRoom}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-[13.5px] font-medium text-ink-2 hover:text-sage transition-colors active:scale-[.99]"
      >
        <Icon name="camera" size={16} />
        {t("Try another room", "换一个房间")}
      </button>

      <div className="mt-4 flex items-start gap-2 text-[12px] text-ink-2 bg-sage-tint/50 rounded-xl px-3 py-2.5">
        <Icon name="lock" size={15} className="text-sage mt-px shrink-0" />
        {t(
          "This is still your room: same walls, windows and proportions. Only the styling changed.",
          "这依然是你的房间，墙面、窗户和比例不变，只改变了风格。",
        )}
      </div>
    </div>
  );
}
