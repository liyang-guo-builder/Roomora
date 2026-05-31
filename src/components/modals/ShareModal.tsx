"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Icon, BeforeAfter } from "@/components/ui";
import { useFlow } from "@/components/flow/FlowProvider";
import { Sheet } from "./Sheet";

export function ShareModal() {
  const { t } = useT();
  const { closeModal } = useFlow();
  const [copied, setCopied] = useState(false);
  const targets: [string, string, string][] = [
    ["#FF2442", "书", t("RedNote", "小红书")],
    ["#E1306C", "◎", "Instagram"],
    ["#000", "♪", "TikTok"],
  ];
  return (
    <Sheet
      onClose={closeModal}
      title={t("Share your room", "分享你的房间")}
      sub={t(
        "Looks great in a Reel. Free designs include a small Roomora watermark.",
        "很适合做成短视频。免费设计会带有 Roomora 小水印。",
      )}
    >
      <div className="rounded-[18px] overflow-hidden mb-4 shadow-card">
        <BeforeAfter height={170} watermark />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {targets.map(([tone, mono, lab]) => (
          <button
            key={lab}
            onClick={closeModal}
            className="flex flex-col items-center gap-2 py-2 active:scale-95 transition-transform"
          >
            <span
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] text-white shadow-card"
              style={{ background: tone }}
            >
              {mono}
            </span>
            <span className="text-[12px] font-medium text-ink">{lab}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="mt-4 w-full h-[52px] rounded-[14px] border border-line bg-surface flex items-center justify-center gap-2 text-[14.5px] font-medium text-ink hover:border-ink-3 transition-colors"
      >
        <Icon
          name={copied ? "check" : "share"}
          size={18}
          className={copied ? "text-sage" : "text-ink-2"}
        />
        {copied ? t("Link copied", "链接已复制") : t("Copy link", "复制链接")}
      </button>
    </Sheet>
  );
}
