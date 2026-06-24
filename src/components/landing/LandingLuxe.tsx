"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { STYLES } from "@/lib/constants";
import type { Lang } from "@/lib/types";
import { BeforeAfter } from "@/components/ui/BeforeAfter";

/** i18n hook plus `setLang` so the marketing nav can toggle EN / 中文 / FR. */
function useLandingLang() {
  const { t, lang } = useT();
  const setLang = useStore((s) => s.setLang);
  return { t, lang, setLang };
}

/** Three-way language switch (EN / 中 / FR) used in the nav and footer. */
function LangSwitch({
  lang,
  setLang,
  light = false,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  light?: boolean;
}) {
  const opts: [Lang, string][] = [
    ["en", "EN"],
    ["zh", "中"],
    ["fr", "FR"],
  ];
  const muted = light ? "text-white/55 hover:text-white" : "text-[#9a917c] hover:text-[#221F18]";
  const on = light ? "text-white" : "text-[#221F18]";
  return (
    <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em]">
      {opts.map(([k, lab], i) => (
        <span key={k} className="flex items-center gap-2">
          {i > 0 && <span className={light ? "text-white/35" : "text-[#c9c1ad]"}>·</span>}
          <button
            type="button"
            onClick={() => setLang(k)}
            className={`transition-colors ${lang === k ? on : muted}`}
          >
            {lab}
          </button>
        </span>
      ))}
    </div>
  );
}

/* ───────────────────────── motion helpers ───────────────────────── */

/** Scroll-reveal wrapper: subtle fade + translate-up on entry, once.
 *  Respects prefers-reduced-motion (no transform / no opacity animation). */
function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}) {
  const reduce = useReducedMotion();
  const MotionTag = as === "section" ? motion.section : motion.div;
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  );
}

/* ───────────────────────── small UI atoms ───────────────────────── */

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span
      className={`block text-[11px] font-medium uppercase tracking-[0.3em] ${
        light ? "text-white/65" : "text-[#9a917c]"
      }`}
    >
      {children}
    </span>
  );
}

function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`font-[family-name:var(--font-playfair)] font-medium text-[clamp(28px,4vw,38px)] leading-[1.1] tracking-[-0.01em] text-[#221F18] ${className}`}
    >
      {children}
    </h2>
  );
}

function Sub({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[16px] leading-[1.65] text-[#6b6451] ${className}`}>{children}</p>
  );
}

function MetaLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#9a917c]">
      {children}
    </p>
  );
}

function CtaLight({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-[2px] bg-[#F4F1EA] px-[30px] py-[15px] text-[14px] font-medium tracking-[0.04em] text-[#221F18] transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function CtaGhost({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="ml-3 inline-block rounded-[2px] border border-white/50 px-[26px] py-[15px] text-[14px] font-medium tracking-[0.04em] text-[#F4F1EA] transition-colors hover:border-white/80"
    >
      {children}
    </Link>
  );
}

/** Section shell: top hairline + generous vertical rhythm, centered wrap. */
function Section({
  children,
  id,
  className = "",
  noBorder = false,
  center = false,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  noBorder?: boolean;
  center?: boolean;
}) {
  return (
    <section
      id={id}
      className={`mx-auto max-w-[1140px] px-6 py-[72px] md:px-12 ${
        noBorder ? "" : "border-t border-[#E1DACC]"
      } ${center ? "text-center" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/* ───────────────────────── FAQ accordion ───────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="border-b border-[#E1DACC]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-5 text-left"
      >
        <span className="text-[15px] font-medium text-[#221F18]">{q}</span>
        <span
          className={`shrink-0 text-[20px] leading-none text-[#8B9173] transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <p className="pb-5 pr-10 text-[15px] leading-[1.65] text-[#6b6451]">{a}</p>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export function LandingLuxe() {
  const { t, lang, setLang } = useLandingLang();
  const reduce = useReducedMotion();

  // Pricing tiers
  const pricing = [
    {
      tag: t("Free", "免费", "Gratuit"),
      name: t("First look", "初次体验", "Premier essai"),
      price: t("1 free try", "1 次免费", "1 essai gratuit"),
      note: t("No sign-up needed", "无需注册", "Sans inscription"),
      points: [
        t("One full redesign", "一次完整的重新设计", "Un relooking complet"),
        t("Any of the 13 styles", "13 种风格任选", "Au choix parmi 13 styles"),
        t("Shoppable list included", "含可购买清单", "Liste d’achats incluse"),
      ],
    },
    {
      tag: t("Popular", "热门", "Populaire"),
      name: t("Create an account", "注册账户", "Créer un compte"),
      price: t("+3 free", "再得 3 次", "+3 gratuits"),
      note: t("Save your designs", "保存你的设计", "Enregistrez vos designs"),
      points: [
        t("Three more redesigns", "再获三次重新设计", "Trois relookings de plus"),
        t("Save & revisit your rooms", "保存并回看你的房间", "Enregistrez et retrouvez vos pièces"),
        t("Refine with words", "用文字微调", "Affinez avec des mots"),
      ],
      featured: true,
    },
    {
      tag: t("Top up", "充值", "Recharge"),
      name: t("Credit packs", "积分包", "Packs de crédits"),
      price: t("From a few €", "几欧元起", "À partir de quelques €"),
      note: t("Pay as you go", "按需付费", "Payez à l’usage"),
      points: [
        t("Buy credits in bundles", "成套购买积分", "Achetez des crédits en lots"),
        t("Never expire", "永不过期", "Sans expiration"),
        t("Best value per design", "单次设计更划算", "Le meilleur prix par design"),
      ],
    },
  ];

  // Showcase: real before/after pairs across room types (proves multi-setting)
  const showcase = [
    {
      before: "/examples/show-living-before.jpg",
      after: "/examples/show-living-after.jpg",
      label: t("Living room · Mid-Century", "客厅 · 中古风", "Salon · Mid-Century"),
    },
    {
      before: "/examples/show-bed-before.jpg",
      after: "/examples/show-bed-after.jpg",
      label: t("Bedroom · Cream", "卧室 · 奶油风", "Chambre · Crème"),
    },
    {
      before: "/examples/show-kitchen-before.jpg",
      after: "/examples/show-kitchen-after.jpg",
      label: t("Kitchen · Modern", "厨房 · 现代简约", "Cuisine · Moderne"),
    },
    {
      before: "/examples/show-garden-before.jpg",
      after: "/examples/show-garden-after.jpg",
      label: t("Terrace · Cosy outdoor", "露台 · 惬意户外", "Terrasse · Extérieur cosy"),
    },
  ];

  // How it works steps
  const steps = [
    {
      n: "01",
      title: t("Upload a photo", "上传一张照片", "Importez une photo"),
      body: t(
        "Snap or pick a photo of the room you actually live in.",
        "拍一张或选一张你真实居住的房间照片。",
        "Prenez ou choisissez une photo de la pièce où vous vivez vraiment.",
      ),
    },
    {
      n: "02",
      title: t("Pick or describe a style", "选择或描述风格", "Choisissez ou décrivez un style"),
      body: t(
        "Choose a curated style, or tell us the look in your own words.",
        "选择一种精选风格,或用你自己的话描述想要的样子。",
        "Choisissez un style proposé, ou décrivez l’ambiance avec vos mots.",
      ),
    },
    {
      n: "03",
      title: t("Design + shopping list", "设计 + 购物清单", "Design + liste d’achats"),
      body: t(
        "Get your restyled room and a list of real, buyable pieces.",
        "获得焕新后的房间,以及一份真实可购买的家具清单。",
        "Recevez votre pièce relookée et une liste de meubles réels et achetables.",
      ),
    },
  ];

  // FAQ
  const faqs = [
    {
      q: t(
        "Does it really keep my room's structure?",
        "它真的会保留我房间的结构吗?",
        "Est-ce que ça garde vraiment la structure de ma pièce ?",
      ),
      a: t(
        "Yes. We keep your walls, windows, doors and proportions in place and only restyle the furnishing. We never invent windows or move walls, so the result still reads as your room.",
        "是的。我们会保留你的墙面、窗户、门和空间比例,只对家具陈设进行重新设计。我们不会凭空添加窗户或移动墙体,所以效果依然是你认得出的那个房间。",
        "Oui. Nous conservons vos murs, fenêtres, portes et proportions, et ne retravaillons que le mobilier. Nous n’inventons jamais de fenêtres et ne déplaçons pas les murs : le résultat reste votre pièce.",
      ),
    },
    {
      q: t("Is my photo private?", "我的照片是私密的吗?", "Ma photo est-elle confidentielle ?"),
      a: t(
        "Your photo stays private. It is used only to generate your design and is never shown publicly or sold. You stay in control of what you share.",
        "你的照片始终保持私密,仅用于生成你的设计,绝不会公开展示或出售。你完全掌控自己分享的内容。",
        "Votre photo reste privée. Elle sert uniquement à générer votre design et n’est jamais rendue publique ni vendue. Vous gardez le contrôle de ce que vous partagez.",
      ),
    },
    {
      q: t("What languages does it work in?", "它支持哪些语言?", "Dans quelles langues est-ce disponible ?"),
      a: t(
        "Roomora works in French, English and 简体中文, with copy and styles tuned for life in Paris and across Europe.",
        "Roomora 支持法语、英语和简体中文,文案与风格针对巴黎及欧洲的生活方式做了优化。",
        "Roomora est disponible en français, en anglais et en 简体中文, avec des textes et des styles pensés pour la vie à Paris et en Europe.",
      ),
    },
    {
      q: t("How much does it cost?", "费用是多少?", "Combien ça coûte ?"),
      a: t(
        "Start free with one try, no sign-up. Create an account for three more free designs, then top up with affordable credit packs when you want more.",
        "免费开始,首次体验无需注册。注册账户即可再获三次免费设计,需要更多时可通过实惠的积分包充值。",
        "Commencez gratuitement avec un essai, sans inscription. Créez un compte pour trois designs gratuits de plus, puis rechargez avec des packs de crédits abordables quand vous en voulez plus.",
      ),
    },
  ];

  // Trust strip
  const trust = [
    t("Keeps your structure", "保留房间结构", "Garde votre structure"),
    t("Photo stays private", "照片保持私密", "Photo confidentielle"),
    t("Free to try, no signup", "免费试用,无需注册", "Essai gratuit, sans inscription"),
    t("Made for Paris / EU", "为巴黎 / 欧洲打造", "Pensé pour Paris / l’Europe"),
  ];

  // Style gallery: 13 tiles. French / Japandi / Scandi flagged "Popular in Paris".
  const popular = new Set(["french", "japandi", "scandi"]);

  return (
    <main className="bg-[#F4F1EA] font-[family-name:var(--font-inter)] text-[#221F18] antialiased">
      {/* ───────── 1. cinematic dark hero ───────── */}
      <header className="relative min-h-[660px] overflow-hidden bg-gradient-to-b from-[#33302a] via-[#26241d] to-[#1c1a15] text-[#F4F1EA]">
        {/* full-bleed room render with slow Ken-Burns zoom + dark overlay */}
        <div className="absolute inset-0">
          <Image
            src="/examples/hero-modern.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className={`object-cover ${reduce ? "" : "kenburns"}`}
          />
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(38,36,29,0.72),rgba(28,26,21,0.82))]" />
          {/* faint architectural grid for the cinematic mood */}
          <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:46px_46px]" />
        </div>

        {/* nav */}
        <nav className="relative mx-auto flex max-w-[1140px] items-center justify-between px-6 py-[22px] md:px-12">
          <div className="flex items-center gap-3 font-[family-name:var(--font-playfair)] text-[22px] tracking-[0.04em] text-white">
            <Image
              src="/logo-mark.png"
              alt="Roomora"
              width={40}
              height={40}
              className="rounded-[8px]"
            />
            ROOMORA
          </div>
          <div className="hidden items-center gap-9 text-[12px] uppercase tracking-[0.18em] text-white/85 md:flex">
            <a href="#how" className="transition-colors hover:text-white">
              {t("How it works", "使用方法", "Comment ça marche")}
            </a>
            <a href="#styles" className="transition-colors hover:text-white">
              {t("Styles", "风格", "Styles")}
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              {t("Pricing", "价格", "Tarifs")}
            </a>
            <LangSwitch lang={lang} setLang={setLang} light />
          </div>
          {/* mobile language switch */}
          <div className="md:hidden">
            <LangSwitch lang={lang} setLang={setLang} light />
          </div>
        </nav>

        {/* hero copy */}
        <div className="relative mx-auto max-w-[1140px] px-6 pt-[72px] text-center md:px-12 md:pt-[90px]">
          <Reveal>
            <Eyebrow light>
              {t("AI interior redesign · Paris", "AI 帮你灵感落地", "Relooking d’intérieur par IA · Paris")}
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-[22px] max-w-[18ch] font-[family-name:var(--font-playfair)] font-medium text-[clamp(40px,6.4vw,66px)] leading-[1.04] tracking-[-0.01em]">
              {t(
                "Fall for the room you already have, ",
                "让你现在的家，",
                "Tombez amoureux de la pièce que vous avez déjà, ",
              )}
              {lang === "zh" && <br />}
              <em className="italic">
                {t(
                  "restyled into the look you love.",
                  "变成你梦想的模样。",
                  "transformée dans le style que vous aimez.",
                )}
              </em>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-[22px] max-w-[54ch] text-[16px] leading-[1.65] text-white/80">
              {lang === "zh" ? (
                <>
                  墙面、窗户和光线照旧，改变什么由你决定。
                  <br />
                  你真实的房间，30 秒内焕然一新。
                </>
              ) : (
                t(
                  "Same walls, windows and light, you control what changes. Your real room, reimagined in 30 seconds.",
                  "墙面、窗户和光线照旧，改变什么由你决定。你真实的房间，30 秒内焕然一新。",
                  "Mêmes murs, mêmes fenêtres, même lumière : vous décidez de ce qui change. Votre vraie pièce, réimaginée en 30 secondes.",
                )
              )}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8">
              <CtaLight href="/app">{t("Try free →", "免费试用 →", "Essayer gratuitement →")}</CtaLight>
              <CtaGhost href="#how">{t("See how it works", "了解使用方法", "Voir comment ça marche")}</CtaGhost>
            </div>
          </Reveal>
        </div>
      </header>

      {/* ───────── 2. trust strip ───────── */}
      <section className="mx-auto max-w-[1140px] px-6 md:px-12">
        <div className="grid grid-cols-2 gap-px bg-[#E1DACC] md:grid-cols-4">
          {trust.map((item) => (
            <div
              key={item}
              className="flex h-[88px] items-center justify-center bg-[#F4F1EA] px-4 text-center text-[11.5px] font-medium uppercase tracking-[0.1em] text-[#5C5440]"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 3. Feature 01 — text + live before/after ───────── */}
      <Section>
        <div className="flex flex-col items-center gap-[54px] md:flex-row">
          <Reveal className="min-w-0 flex-1">
            <Eyebrow>{t("Feature 01", "功能 01", "Atout 01")}</Eyebrow>
            <H2 className="mt-3.5">
              {t(
                "Your room, redesigned. Still your room.",
                "你的房间,重新设计。依然是你的房间。",
                "Votre pièce, redessinée. Toujours la vôtre.",
              )}
            </H2>
            <Sub className="mt-[18px]">
              {t(
                "We keep your walls, windows, doors and proportions, and only restyle the furnishing. Pick a curated style, or describe your own. Drag the slider to see it on a real room.",
                "我们保留你的墙面、窗户、门和比例,只对家具陈设进行重新设计。选择一种精选风格,或描述你自己的想法。拖动滑块,在真实房间上一探究竟。",
                "Nous gardons vos murs, fenêtres, portes et proportions, et ne retravaillons que le mobilier. Choisissez un style proposé, ou décrivez le vôtre. Faites glisser le curseur pour le voir sur une vraie pièce.",
              )}
            </Sub>
            <MetaLabel>
              {t(
                "Scandi · Japandi · French · Cream · + 9 more",
                "北欧 · 日式简约 · 法式 · 奶油风 · 等 9 种",
                "Scandi · Japandi · Français · Crème · + 9 autres",
              )}
            </MetaLabel>
          </Reveal>
          <Reveal delay={0.12} className="min-w-0 flex-1">
            <BeforeAfter
              height={340}
              className="!rounded-[4px] w-full"
              beforeUrl="/examples/feat-living-before.jpg"
              afterUrl="/examples/feat-living-after.jpg"
            />
          </Reveal>
        </div>
      </Section>

      {/* ───────── 4. Feature 02 — media + text ───────── */}
      <Section>
        <div className="flex flex-col items-center gap-[54px] md:flex-row">
          <Reveal className="order-2 min-w-0 flex-1 md:order-1">
            <div className="relative h-[340px] w-full overflow-hidden rounded-[4px] border border-[#E1DACC]">
              <Image
                src="/examples/hero-modern.jpg"
                alt={t("A finished Roomora design", "Roomora 完成的设计", "Un design Roomora finalisé")}
                fill
                sizes="(max-width: 768px) 100vw, 540px"
                className="object-cover"
              />
              {/* floating product card overlay to evoke "shop the look" */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-[3px] bg-[#F4F1EA]/95 p-3 shadow-[0_8px_30px_-8px_rgba(34,31,24,0.4)] backdrop-blur-sm">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[2px]">
                  <Image
                    src="/examples/item-sofa.jpg"
                    alt={t("Linen curved sofa", "亚麻弧形沙发", "Canapé arrondi en lin")}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-[#221F18]">
                    {t("Linen curved sofa", "亚麻弧形沙发", "Canapé arrondi en lin")}
                  </p>
                  <p className="text-[11px] text-[#6b6451]">{t("€690 · La Redoute", "€690 · La Redoute", "690 € · La Redoute")}</p>
                </div>
                <span className="ml-auto rounded-[2px] bg-[#221F18] px-3 py-1.5 text-[11px] font-medium text-[#F4F1EA]">
                  {t("Buy", "购买", "Acheter")}
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="order-1 min-w-0 flex-1 md:order-2">
            <Eyebrow>{t("Feature 02", "功能 02", "Atout 02")}</Eyebrow>
            <H2 className="mt-3.5">{t("Shop the look in one tap.", "一键购买同款。", "Achetez le look en un clic.")}</H2>
            <Sub className="mt-[18px]">
              {t(
                "From your finished design we auto-list the real, buyable pieces, French retailers, euro prices, within your budget. Click to order.",
                "根据你完成的设计,我们自动列出真实可购买的家具,当地零售商、欧元定价、符合你的预算。点击即可下单。",
                "À partir de votre design finalisé, nous listons automatiquement les pièces réelles et achetables : enseignes françaises, prix en euros, dans votre budget. Cliquez pour commander.",
              )}
            </Sub>
            <MetaLabel>
              {t(
                "Real pieces · € prices · French stores",
                "真实家具 · 欧元定价 · 当地门店",
                "Vraies pièces · Prix en € · Enseignes françaises",
              )}
            </MetaLabel>
          </Reveal>
        </div>
      </Section>

      {/* ───────── 5. How it works ───────── */}
      <Section id="how" center>
        <Reveal>
          <Eyebrow>{t("How it works", "使用方法", "Comment ça marche")}</Eyebrow>
          <H2 className="mt-3.5">{t("Three steps", "三个步骤", "Trois étapes")}</H2>
        </Reveal>
        <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="h-full border-t border-[#221F18] pt-5">
                <span className="font-[family-name:var(--font-playfair)] text-[28px] text-[#8B9173]">
                  {s.n}
                </span>
                <h3 className="mt-3 text-[17px] font-medium text-[#221F18]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#6b6451]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ───────── 6. The styles — 13-tile gallery ───────── */}
      <Section id="styles">
        <Reveal>
          <Eyebrow>{t("The styles", "风格", "Les styles")}</Eyebrow>
          <H2 className="mt-3.5">{t("Thirteen looks", "十三种风格", "Treize ambiances")}</H2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {STYLES.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i * 0.03, 0.3)}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[4px] border border-[#E1DACC]">
                <Image
                  src={`/styles/${s.id}.jpg`}
                  alt={t(s.en, s.zh)}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#221F18]/70 via-transparent to-transparent" />
                {popular.has(s.id) && (
                  <span className="absolute right-2 top-2 rounded-[2px] bg-[#8B9173] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#F4F1EA]">
                    {t("Popular in Paris", "巴黎热门", "Populaire à Paris")}
                  </span>
                )}
                <span className="absolute bottom-2 left-2.5 text-[12px] font-medium text-[#F4F1EA]">
                  {t(s.en, s.zh)}
                </span>
              </div>
            </Reveal>
          ))}
          {/* growth cue: more styles on the way */}
          <Reveal delay={0.3}>
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-[#BDB4A4] bg-[#EEEAE0] px-2 text-center">
              <span className="font-[family-name:var(--font-playfair)] text-[26px] leading-none text-[#8B9173]">
                +
              </span>
              <span className="text-[11px] font-medium uppercase leading-tight tracking-[0.12em] text-[#6b6451]">
                {t("More coming soon", "更多风格陆续上线", "Et bientôt plus")}
              </span>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ───────── 7. Selected work — before/after showcase ───────── */}
      <Section>
        <Reveal>
          <Eyebrow>{t("Any room", "适用任何空间", "Toutes les pièces")}</Eyebrow>
          <H2 className="mt-3.5">
            {t("Before, and after, in any space.", "改造前后，适用任何空间。", "Avant, et après, dans chaque espace.")}
          </H2>
          <Sub className="mt-[18px] max-w-[54ch]">
            {t(
              "Living rooms, bedrooms, kitchens, even the garden. Your real space, restyled, and still yours.",
              "客厅、卧室、厨房，甚至花园露台。你的真实空间，焕新依旧是你的。",
              "Salons, chambres, cuisines, et même le jardin. Votre véritable espace, relooké, et toujours le vôtre.",
            )}
          </Sub>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {showcase.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08}>
              <div>
                <BeforeAfter
                  height={260}
                  className="!rounded-[4px] w-full"
                  beforeUrl={item.before}
                  afterUrl={item.after}
                  reveal={false}
                  hint={false}
                />
                <MetaLabel>{item.label}</MetaLabel>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ───────── 8. Pricing ───────── */}
      <Section id="pricing" center>
        <Reveal>
          <Eyebrow>{t("Pricing", "价格", "Tarifs")}</Eyebrow>
          <H2 className="mt-3.5">{t("Start free.", "免费开始。", "Commencez gratuitement.")}</H2>
        </Reveal>
        <div className="mt-9 grid gap-5 text-left md:grid-cols-3">
          {pricing.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <div
                className={`flex h-full flex-col rounded-[4px] border p-6 ${
                  p.featured
                    ? "border-[#8B9173] bg-[#F4F1EA] shadow-[0_8px_30px_-12px_rgba(92,84,64,0.4)]"
                    : "border-[#E1DACC] bg-[#F4F1EA]"
                }`}
              >
                <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#8B9173]">
                  {p.tag}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-playfair)] text-[22px] text-[#221F18]">
                  {p.name}
                </h3>
                <p className="mt-1 text-[15px] font-medium text-[#5C5440]">{p.price}</p>
                <p className="text-[13px] text-[#6b6451]">{p.note}</p>
                <ul className="mt-5 space-y-2.5 text-[14px] text-[#6b6451]">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span className="text-[#8B9173]">·</span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-2">
                  <Link
                    href="/app"
                    className={`inline-block rounded-[2px] px-5 py-2.5 text-[13px] font-medium tracking-[0.04em] transition-colors ${
                      p.featured
                        ? "bg-[#221F18] text-[#F4F1EA] hover:bg-black"
                        : "border border-[#221F18] text-[#221F18] hover:bg-[#221F18] hover:text-[#F4F1EA]"
                    }`}
                  >
                    {t("Try free →", "免费试用 →", "Essayer gratuitement →")}
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ───────── 9. FAQ ───────── */}
      <Section>
        <Reveal>
          <Eyebrow>{t("Questions", "常见问题", "Questions")}</Eyebrow>
          <H2 className="mt-3.5">{t("Good to know", "你想了解的", "Bon à savoir")}</H2>
        </Reveal>
        <Reveal delay={0.08} className="mt-7 border-t border-[#E1DACC]">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </Reveal>
      </Section>

      {/* ───────── 10. dark final CTA band ───────── */}
      <section className="bg-gradient-to-b from-[#2b2922] to-[#1c1a15] px-6 py-[84px] text-center text-[#F4F1EA]">
        <Reveal>
          <h2 className="mx-auto max-w-[20ch] font-[family-name:var(--font-playfair)] font-medium text-[clamp(34px,5.5vw,48px)] leading-[1.08]">
            {t("Redesign your real room ", "焕新你真实的房间,", "Redessinez votre vraie pièce ")}
            <em className="italic">{t("in 30 seconds.", "仅需 30 秒。", "en 30 secondes.")}</em>
          </h2>
          <div className="mt-8">
            <CtaLight href="/app">{t("Try free →", "免费试用 →", "Essayer gratuitement →")}</CtaLight>
          </div>
        </Reveal>
      </section>

      {/* ───────── 11. dark footer ───────── */}
      <footer className="bg-[#221F18] py-[46px] text-[12px] tracking-[0.04em] text-[#9a917c]">
        <div className="mx-auto flex max-w-[1140px] flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-12">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt="Roomora"
              width={28}
              height={28}
              className="rounded-[6px]"
            />
            <span className="font-[family-name:var(--font-playfair)] text-[16px] tracking-[0.04em] text-[#F4F1EA]">
              ROOMORA
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href="#styles" className="transition-colors hover:text-[#F4F1EA]">
              {t("Styles", "风格", "Styles")}
            </a>
            <a href="#pricing" className="transition-colors hover:text-[#F4F1EA]">
              {t("Pricing", "价格", "Tarifs")}
            </a>
            <Link href="/terms" className="transition-colors hover:text-[#F4F1EA]">
              {t("Terms", "条款", "Conditions")}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-[#F4F1EA]">
              {t("Privacy", "隐私", "Confidentialité")}
            </Link>
            <LangSwitch lang={lang} setLang={setLang} />
          </div>
        </div>
      </footer>
    </main>
  );
}
