"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { designsService } from "@/lib/services";
import { Btn, Icon, RoomPhoto } from "@/components/ui";
import { STYLE_NAMES } from "@/lib/constants";
import type { SavedDesign, StyleId, GenerationResult } from "@/lib/types";

/** Map a stored style string back to a display name (falls back gracefully). */
function styleName(style: string | null, t: (en: string, zh: string) => string): string {
  if (style && style in STYLE_NAMES) {
    const [en, zh] = STYLE_NAMES[style as StyleId];
    return t(en, zh);
  }
  return t("Restyled", "焕新设计");
}

export function MyDesignsScreen() {
  const { t } = useT();
  const router = useRouter();
  const anon = useStore((s) => s.anon);
  const setResult = useStore((s) => s.setResult);
  const setCurrentSaved = useStore((s) => s.setCurrentSaved);

  const { data, isLoading } = useQuery({
    queryKey: ["designs", anon],
    queryFn: () => designsService.list(),
    // No saved designs for signed-out users; skip the call.
    enabled: !anon,
  });

  const designs: SavedDesign[] = anon ? [] : data ?? [];
  const empty = !isLoading && designs.length === 0;

  const queryClient = useQueryClient();
  const remove = async (id: string) => {
    await designsService.unsave(id).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["designs"] });
  };

  // Reopen a saved design in the Result screen.
  const open = (d: SavedDesign) => {
    const result: GenerationResult = {
      jobId: d.id,
      styleId: (d.style && d.style in STYLE_NAMES ? d.style : "scandi") as StyleId,
      originalUrl: d.originalUrl,
      generationId: d.id,
      versions: [
        { id: d.id, variant: "after", refineNote: null, resultUrl: d.resultUrl },
      ],
    };
    setResult(result);
    // Already saved — reflect the filled heart immediately (setResult cleared it).
    setCurrentSaved(true);
    router.push("/result");
  };

  if (empty) {
    return (
      <div className="px-5 pt-16 pb-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-sage-tint flex items-center justify-center text-sage mb-5">
          <Icon name="grid" size={34} />
        </div>
        <h2 className="text-[19px] font-semibold text-ink">{t("No saved designs yet", "还没有保存的设计")}</h2>
        <p className="mt-2 text-[14px] text-ink-2 max-w-[30ch]">
          {t(
            "Restyle a room and tap save. It’ll live here for you to revisit.",
            "设计一个房间并点击保存，它会出现在这里随时查看。",
          )}
        </p>
        <Btn variant="primary" size="lg" icon="camera" className="mt-6" onClick={() => router.push("/app")}>
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
          {isLoading ? "…" : designs.length} {t("saved", "已保存")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] rounded-[16px] bg-surface-sunk ring-1 ring-line" />
                <div className="mt-1.5 h-3.5 w-2/3 rounded bg-surface-sunk" />
              </div>
            ))
          : designs.map((d) => (
              <div key={d.id} className="relative">
                <button
                  onClick={() => open(d)}
                  className="block w-full text-left active:scale-[.98] transition-transform"
                >
                <div className="relative aspect-[4/5] rounded-[16px] overflow-hidden shadow-card ring-1 ring-line">
                  {/* AFTER (base) */}
                  {d.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.resultUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <RoomPhoto variant="after" rounded="rounded-none" tag={false} className="absolute inset-0" />
                  )}
                  {/* BEFORE (clipped left strip) */}
                  <div className="absolute inset-0 overflow-hidden" style={{ width: "44%" }}>
                    {d.originalUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.originalUrl}
                        alt=""
                        className="h-full object-cover"
                        style={{ width: "227%", maxWidth: "none" }}
                      />
                    ) : (
                      <RoomPhoto variant="before" rounded="rounded-none" tag={false} className="h-full" />
                    )}
                  </div>
                  <div className="absolute top-0 bottom-0 left-[44%] w-[2px] bg-white/80" />
                </div>
                <div className="mt-1.5 px-0.5">
                  <div className="text-[13.5px] font-semibold text-ink leading-tight">
                    {styleName(d.style, t)}
                  </div>
                  <div className="text-[11.5px] text-ink-3">{t("Paris 14e", "巴黎 14 区")}</div>
                </div>
                </button>
                <button
                  onClick={() => remove(d.id)}
                  aria-label={t("Delete", "删除")}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center active:scale-90 hover:bg-black/60 transition"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}
