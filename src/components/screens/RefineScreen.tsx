"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useFlow } from "@/components/flow/FlowProvider";
import { Btn, Chip, Icon, RoomPhoto, FieldLabel } from "@/components/ui";
import { REFINE_CHIPS } from "@/lib/constants";

export function RefineScreen() {
  const { t } = useT();
  const router = useRouter();
  const { doApplyRefine } = useFlow();
  const result = useStore((s) => s.result);
  const history = result?.versions ?? [];
  const latestUrl = history.at(-1)?.resultUrl ?? null;

  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (c: string) =>
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const ready = Boolean(text.trim() || picked.length);

  const apply = () => {
    const note = [...picked, text.trim()].filter(Boolean).join(", ");
    void doApplyRefine(note);
  };

  return (
    <div className="px-5 pt-3 pb-32">
      <div className="flex items-center gap-3">
        {latestUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={latestUrl}
            alt=""
            className="w-20 h-20 shrink-0 rounded-2xl object-cover shadow-card"
          />
        ) : (
          <RoomPhoto variant="after" rounded="rounded-2xl" tag={false} className="w-20 h-20 shrink-0 shadow-card" />
        )}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            {t("refining", "微调中")}
          </div>
          <h2 className="text-[18px] font-semibold text-ink">{t("Tell me what to change", "告诉我要改什么")}</h2>
          <p className="text-[12.5px] text-ink-2">
            {t("I’ll change only that — nothing else moves.", "我只会改这一处，其余不动。")}
          </p>
        </div>
      </div>

      {/* version history */}
      {history.length > 1 && (
        <div className="mt-5">
          <FieldLabel>{t("Versions", "历史版本")}</FieldLabel>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {history.map((h, i) => (
              <div key={h.id} className="shrink-0 flex flex-col items-center gap-1">
                <button
                  className={`relative w-14 h-14 rounded-xl overflow-hidden ${
                    i === history.length - 1
                      ? "ring-2 ring-sage ring-offset-2 ring-offset-paper"
                      : "ring-1 ring-line opacity-75"
                  }`}
                >
                  {h.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.resultUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <RoomPhoto variant="after" rounded="rounded-none" tag={false} className="absolute inset-0" />
                  )}
                </button>
                <span className="text-[10px] text-ink-3">{i === 0 ? t("original", "原始") : `v${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <FieldLabel>{t("Quick changes", "常用调整")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {REFINE_CHIPS.map(([en, zh]) => (
            <Chip key={en} active={picked.includes(en)} onClick={() => toggle(en)}>
              {t(en, zh)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t(
              "Describe a change… e.g. swap the rug for something softer",
              "描述你想要的改动… 例如：把地毯换成更柔软的",
            )}
            className="w-full p-4 pr-12 rounded-[16px] bg-surface border border-line text-[14px] text-ink placeholder:text-ink-3 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none resize-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-[12px] text-sage bg-sage-tint/60 rounded-xl px-3 py-2.5">
        <Icon name="check" size={15} className="mt-px shrink-0" stroke={2.3} />
        {t("Everything you don’t mention stays exactly the same.", "你没有提到的部分将保持完全一致。")}
      </div>

      <div className="fixed inset-x-0 bottom-0 px-5 pt-3 pb-5 bg-gradient-to-t from-paper via-paper to-transparent flex gap-3 mx-auto w-full max-w-[480px]">
        <Btn variant="secondary" size="lg" onClick={() => router.push("/result")} icon="arrowLeft">
          {t("Back", "返回")}
        </Btn>
        <Btn
          variant="primary"
          size="lg"
          full
          iconRight="wand"
          onClick={apply}
          className={ready ? "" : "opacity-55 pointer-events-none"}
        >
          {t("Apply · 1 credit", "应用 · 1 积分")}
        </Btn>
      </div>
    </div>
  );
}
