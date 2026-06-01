"use client";

import { useRef } from "react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useFlow } from "@/components/flow/FlowProvider";
import { readImageFile } from "@/lib/readImageFile";
import { Btn, Chip, Icon, RoomPhoto, StyleTile, FieldLabel, type IconName } from "@/components/ui";
import { STYLES } from "@/lib/constants";
import type { BudgetId, SetupTab } from "@/lib/types";

export function SetupScreen() {
  const { t } = useT();
  const { doGenerate } = useFlow();
  const setup = useStore((s) => s.setup);
  const setSetup = useStore((s) => s.setSetup);
  const roomPhoto = useStore((s) => s.roomPhoto);
  const setRoomPhoto = useStore((s) => s.setRoomPhoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const tab = setup.tab;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRoomPhoto(await readImageFile(file));
  };

  const budgets: [BudgetId, string][] = [
    ["low", t("Under €1k", "€1k 以内")],
    ["mid", "€1k–3k"],
    ["high", "€3k+"],
    ["skip", t("Skip", "不限")],
  ];

  const tabs: [SetupTab, IconName, string][] = [
    ["browse", "grid", t("Browse styles", "浏览风格")],
    ["match", "image", t("Match a photo", "参考图片")],
  ];

  const canContinue = !(tab === "browse" && !setup.style);

  return (
    <div className="px-5 pb-32 pt-3">
      {/* your room */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line/70 shadow-card">
        {roomPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={roomPhoto}
            alt={t("your room", "你的房间")}
            className="w-16 h-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <RoomPhoto variant="before" rounded="rounded-xl" tag={false} className="w-16 h-16 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            {t("your room", "你的房间")}
          </div>
          <div className="text-[14px] font-semibold text-ink truncate">
            {roomPhoto
              ? t("Your photo", "你的照片")
              : t("Studio · Paris 14e", "工作室 · 巴黎 14 区")}
          </div>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="ml-auto text-[12.5px] font-medium text-sage hover:underline shrink-0"
        >
          {t("Change", "更换")}
        </button>
      </div>

      <h2 className="mt-6 text-[20px] font-semibold tracking-[-.01em] text-ink">
        {t("Choose a direction", "选择设计方向")}
      </h2>

      {/* tabs */}
      <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-surface-sunk border border-line/70">
        {tabs.map(([k, ic, lab]) => (
          <button
            key={k}
            onClick={() => setSetup({ ...setup, tab: k })}
            className={`h-10 rounded-[11px] text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === k ? "bg-surface text-ink shadow-card" : "text-ink-3"
            }`}
          >
            <Icon name={ic} size={16} /> {lab}
          </button>
        ))}
      </div>

      {tab === "browse" ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {STYLES.map((s) => (
            <StyleTile
              key={s.id}
              {...s}
              active={setup.style === s.id}
              onClick={() => setSetup({ ...setup, style: s.id })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <button className="w-full rounded-[18px] border-2 border-dashed border-brass/45 bg-brass-tint/40 hover:bg-brass-tint transition-colors p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-brass text-paper flex items-center justify-center mb-3">
              <Icon name="image" size={24} />
            </div>
            <div className="text-[15px] font-semibold text-ink">
              {t("Upload an inspiration photo", "上传你喜欢的灵感图")}
            </div>
            <div className="text-[12.5px] text-ink-2 mt-1 max-w-[30ch]">
              {t(
                "A room you love from Pinterest, 小红书 or a magazine — we’ll bring its look into your space.",
                "来自 Pinterest、小红书或杂志的房间 —— 我们会把它的风格带入你的空间。",
              )}
            </div>
          </button>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-brass bg-brass-tint/60 rounded-xl px-3 py-2.5">
            <Icon name="sparkle" size={15} />{" "}
            {t("Coming soon — designed and ready to ship.", "即将推出 —— 设计已就绪。")}
          </div>
        </div>
      )}

      {/* note */}
      <div className="mt-6">
        <FieldLabel hint={t("optional", "可选")}>{t("Anything specific?", "有什么特别要求？")}</FieldLabel>
        <input
          value={setup.note}
          onChange={(e) => setSetup({ ...setup, note: e.target.value })}
          placeholder={t("e.g. cozy, lots of plants, keep my bookshelf", "例如：温馨、多放些绿植、保留书架")}
          className="w-full h-12 px-4 rounded-[14px] bg-surface border border-line text-[14px] text-ink placeholder:text-ink-3 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none"
        />
      </div>

      {/* budget */}
      <div className="mt-5">
        <FieldLabel hint={t("optional", "可选")}>{t("Budget", "预算")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {budgets.map(([k, lab]) => (
            <Chip
              key={k}
              active={setup.budget === k}
              onClick={() => setSetup({ ...setup, budget: setup.budget === k ? null : k })}
            >
              {lab}
            </Chip>
          ))}
        </div>
      </div>

      {/* sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 px-5 pt-3 pb-5 bg-gradient-to-t from-paper via-paper to-transparent mx-auto w-full max-w-[480px]">
        <Btn
          variant="primary"
          size="lg"
          full
          iconRight="arrowRight"
          onClick={() => void doGenerate()}
          className={canContinue ? "" : "opacity-55 pointer-events-none"}
        >
          {t("Generate design · 1 credit", "生成设计 · 消耗 1 积分")}
        </Btn>
        <p className="text-center text-[11.5px] text-ink-3 mt-2">
          {canContinue
            ? t("Takes about 30 seconds", "大约需要 30 秒")
            : t("Pick a style to continue", "选择一种风格以继续")}
        </p>
      </div>
    </div>
  );
}
