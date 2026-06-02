"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Logo, BeforeAfter, Icon, LangToggle } from "@/components/ui";

/** Bilingual display names for the style ids. */
const STYLE_NAMES: Record<string, [string, string]> = {
  scandi: ["Scandinavian", "北欧风"],
  japandi: ["Japandi", "日式简约"],
  cream: ["Cream", "奶油风"],
  midcentury: ["Mid-century", "中古风"],
  wabisabi: ["Wabi-sabi", "侘寂风"],
  wood: ["Natural wood", "原木风"],
  modern: ["Modern", "现代风"],
  newchinese: ["New Chinese", "新中式"],
  boho: ["Bohemian", "波西米亚"],
  industrial: ["Industrial", "工业风"],
};

/**
 * Public, shareable before/after page. Rendered full-width (AppShell skips its
 * phone-frame chrome for /share routes). This is the social-distribution lever:
 * every shared design is a branded landing page with a single CTA.
 */
export function ShareView({
  beforeUrl,
  afterUrl,
  style,
}: {
  beforeUrl: string | null;
  afterUrl: string;
  style: string | null;
}) {
  const { t, lang } = useT();
  const styleName = style && STYLE_NAMES[style] ? STYLE_NAMES[style] : null;

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto w-full max-w-[560px] px-5 pb-12 pt-5">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <Logo size={30} />
          <LangToggle />
        </div>

        {/* headline — the fidelity promise */}
        <h1 className="mt-7 text-[27px] leading-[1.14] font-semibold tracking-[-.02em] text-ink text-balance">
          {t("Restyled with Roomora.", "用 Roomora 焕新设计。")}
          <br />
          <span className="text-sage">{t("Still the same room.", "依然是同一个房间。")}</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2 max-w-[40ch]">
          {t(
            "Same walls, windows and proportions, restyled into a look worth living in. Drag to compare.",
            "相同的墙面、窗户与空间比例，焕新成令人向往的风格。拖动对比。",
          )}
        </p>

        {/* the proof */}
        <div className="mt-5">
          <BeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} height={360} watermark />
        </div>

        {styleName && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-sage bg-sage-tint px-3 py-1.5 rounded-full">
            <Icon name="sparkle" size={14} />
            {lang === "en" ? styleName[0] : styleName[1]}
          </div>
        )}

        {/* CTA */}
        <Link
          href="/?utm_source=share&utm_medium=social&utm_campaign=share_page"
          className="mt-7 w-full h-[56px] rounded-[16px] bg-sage text-paper flex items-center justify-center gap-2 text-[16px] font-semibold shadow-[0_8px_22px_-8px_rgba(124,136,102,.7)] hover:bg-sage-deep transition-colors active:scale-[.99]"
        >
          <Icon name="camera" size={20} />
          {t("Design your own room, free", "免费设计你的房间")}
        </Link>
        <p className="text-center text-[12px] text-ink-3 mt-2.5">
          {t("3 free designs · no signup needed", "3 张免费设计 · 无需注册")}
        </p>

        {/* trust strip */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            ["camera", t("Upload your room", "上传房间")],
            ["sparkle", t("AI restyles it", "AI 焕新")],
            ["check", t("Keeps it yours", "结构不变")],
          ].map(([ic, label]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="w-11 h-11 rounded-2xl bg-surface border border-line flex items-center justify-center text-sage">
                <Icon name={ic as "camera"} size={20} />
              </span>
              <span className="text-[12px] text-ink-2 leading-snug">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[12.5px] text-ink-3">
          <span className="font-semibold text-ink-2">Roomora</span>
          <span>·</span>
          <span>{t("Redesign your real room", "重新设计你真实的房间")}</span>
        </div>
      </div>
    </div>
  );
}
