"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon, BeforeAfter } from "@/components/ui";
import { useFlow } from "@/components/flow/FlowProvider";
import { Sheet } from "./Sheet";

export function ShareModal() {
  const { t } = useT();
  const { closeModal, showToast } = useFlow();
  const result = useStore((s) => s.result);

  const generationId = result?.generationId ?? null;
  const beforeUrl = result?.originalUrl ?? null;
  const afterUrl = result?.versions[result.versions.length - 1]?.resultUrl ?? null;

  const [copied, setCopied] = useState(false);

  const caption = t(
    "I restyled my real room with Roomora. Same walls, same windows. Try it free:",
    "我用 Roomora 重新设计了我的真实房间，墙和窗都没变。免费试试：",
  );

  // Publish the design (shared=true) and build the public link. Runs on open;
  // one retry on transient failure. Using TanStack Query keeps the loading /
  // error / retry states out of an effect.
  const {
    data: shareUrl,
    status,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["share", generationId],
    enabled: !!generationId,
    retry: 1,
    staleTime: Infinity,
    queryFn: async () => {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ generationId }),
      });
      if (!r.ok) throw new Error("share_failed");
      return `${window.location.origin}/share/${generationId}`;
    },
  });

  const ready = status === "success" && !!shareUrl;
  const failed = status === "error" || !generationId;
  const loading = isFetching && !ready;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(`${caption} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast(t("Couldn’t copy, try again", "复制失败，请重试"), "info");
    }
  };

  // Native share sheet (mobile) surfaces RedNote / Instagram / TikTok / WeChat
  // when installed. Desktop falls back to copying the link + caption.
  const share = async () => {
    if (!shareUrl) return;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "Roomora", text: caption, url: shareUrl });
      } catch {
        /* user dismissed the sheet — no-op */
      }
    } else {
      await copyLink();
      showToast(t("Link copied, paste to share", "链接已复制，粘贴即可分享"), "check");
    }
  };

  const targets: [string, string, string][] = [
    ["#FF2442", "书", t("RedNote", "小红书")],
    ["#E1306C", "◎", "Instagram"],
    ["#000", "♪", "TikTok"],
  ];

  const onBottom = () => {
    if (ready) void copyLink();
    else if (failed && generationId) void refetch();
  };
  const bottomLabel = copied
    ? t("Link copied", "链接已复制")
    : ready
      ? t("Copy link", "复制链接")
      : loading
        ? t("Preparing link…", "正在生成链接…")
        : t("Try again", "重试");

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
        <BeforeAfter height={170} watermark beforeUrl={beforeUrl} afterUrl={afterUrl} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {targets.map(([tone, mono, lab]) => (
          <button
            key={lab}
            onClick={share}
            disabled={!ready}
            className="flex flex-col items-center gap-2 py-2 active:scale-95 transition-transform disabled:opacity-50"
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
        onClick={onBottom}
        disabled={loading}
        className="mt-4 w-full h-[52px] rounded-[14px] border border-line bg-surface flex items-center justify-center gap-2 text-[14.5px] font-medium text-ink hover:border-ink-3 transition-colors disabled:opacity-50"
      >
        <Icon
          name={copied ? "check" : "share"}
          size={18}
          className={copied ? "text-sage" : failed && !loading ? "text-danger" : "text-ink-2"}
        />
        {bottomLabel}
      </button>
    </Sheet>
  );
}
