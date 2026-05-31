"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Btn, Icon, RoomPhoto } from "@/components/ui";
import type { StyleId } from "@/lib/types";

const ITEMS: [StyleId, string, string][] = [
  ["scandi", "Scandinavian", "北欧风"],
  ["cream", "Cream", "奶油风"],
  ["japandi", "Japandi", "日式简约"],
  ["wood", "Natural Wood", "原木风"],
  ["boho", "Bohemian", "波西米亚"],
  ["modern", "Modern", "现代简约"],
];

export function MyDesignsScreen() {
  const { t } = useT();
  const router = useRouter();
  // Empty state when the user has saved nothing in this session AND no seed.
  const saved = useStore((s) => s.saved);
  const empty = saved <= 0;

  if (empty) {
    return (
      <div className="px-5 pt-16 pb-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-sage-tint flex items-center justify-center text-sage mb-5">
          <Icon name="grid" size={34} />
        </div>
        <h2 className="text-[19px] font-semibold text-ink">{t("No saved designs yet", "还没有保存的设计")}</h2>
        <p className="mt-2 text-[14px] text-ink-2 max-w-[30ch]">
          {t(
            "Restyle a room and tap save — it’ll live here for you to revisit.",
            "设计一个房间并点击保存 —— 它会出现在这里随时查看。",
          )}
        </p>
        <Btn variant="primary" size="lg" icon="camera" className="mt-6" onClick={() => router.push("/")}>
          {t("Restyle a room", "设计一个房间")}
        </Btn>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold text-ink">{t("My designs", "我的设计")}</h2>
        <span className="text-[13px] text-ink-3">
          {ITEMS.length} {t("saved", "已保存")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ITEMS.map(([, en, zh], i) => (
          <button
            key={i}
            onClick={() => router.push("/result")}
            className="text-left active:scale-[.98] transition-transform"
          >
            <div className="relative aspect-[4/5] rounded-[16px] overflow-hidden shadow-card ring-1 ring-line">
              <RoomPhoto variant="after" rounded="rounded-none" tag={false} className="absolute inset-0" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: "44%" }}>
                <RoomPhoto variant="before" rounded="rounded-none" tag={false} className="h-full" />
              </div>
              <div className="absolute top-0 bottom-0 left-[44%] w-[2px] bg-white/80" />
            </div>
            <div className="mt-1.5 px-0.5">
              <div className="text-[13.5px] font-semibold text-ink leading-tight">{t(en, zh)}</div>
              <div className="text-[11.5px] text-ink-3">{t("Paris 14e", "巴黎 14 区")}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
