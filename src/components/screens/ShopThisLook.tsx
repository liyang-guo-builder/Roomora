"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Icon } from "@/components/ui";
import { shopService, type ShopGroup, type ShopProduct } from "@/lib/services";
import { CATEGORY_LABELS } from "@/lib/shop/categories";

/** Real shopping is gated by NEXT_PUBLIC_SHOP_LIVE (also enforced server-side).
 *  When off, show a soft "coming soon" teaser instead of the picker. */
const SHOP_LIVE = process.env.NEXT_PUBLIC_SHOP_LIVE === "true";

function priceLabel(price: number | null, currency: string): string {
  if (price == null) return "";
  const n = Number.isInteger(price) ? price.toString() : price.toFixed(2);
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  return sym ? `${sym}${n}` : `${n} ${currency}`;
}

function ProductCard({ p }: { p: ShopProduct }) {
  const { t } = useT();
  const card = (
    <div className="shrink-0 w-[148px] rounded-2xl bg-surface border border-line/70 shadow-card overflow-hidden">
      <div className="relative w-full aspect-square bg-surface-sunk">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-3">
            <Icon name="image" size={26} />
          </div>
        )}
        {p.overBudget && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-danger-tint text-danger text-[9.5px] font-medium">
            {t("over budget", "超预算")}
          </span>
        )}
      </div>
      <div className="px-2.5 pt-2 pb-2.5">
        <div className="text-[12px] font-medium text-ink leading-snug line-clamp-2 min-h-[2.4em]">
          {p.title}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-1">
          <span className="text-[14px] font-semibold text-ink">
            {priceLabel(p.price, p.currency)}
          </span>
          {p.brand && (
            <span className="text-[10.5px] text-ink-3 truncate max-w-[64px]">{p.brand}</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 h-8 rounded-[10px] bg-brass-tint text-[11.5px] font-medium text-brass-deep">
          <Icon name="bag" size={13} />
          {t("View", "查看")}
        </div>
      </div>
    </div>
  );
  if (!p.deeplink) return card;
  return (
    <a
      href={p.deeplink}
      target="_blank"
      rel="sponsored noopener nofollow"
      className="block active:scale-[.98] transition-transform"
    >
      {card}
    </a>
  );
}

function Group({ group }: { group: ShopGroup }) {
  const { t } = useT();
  const [en, zh] = CATEGORY_LABELS[group.item.category] ?? ["Item", "单品"];
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[13px] font-semibold text-ink">{group.item.label}</span>
        <span className="text-[11px] text-ink-3">{t(en, zh)}</span>
      </div>
      {group.products.length === 0 ? (
        <div className="text-[12px] text-ink-3">{t("No close match found.", "暂无相近的商品。")}</div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1">
          {group.products.map((p, i) => (
            <ProductCard key={`${p.deeplink ?? p.title}-${i}`} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ShopThisLook({ generationId }: { generationId: string }) {
  const { t } = useT();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showMinor, setShowMinor] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["shop-items", generationId],
    queryFn: () => shopService.itemize(generationId),
    staleTime: 30 * 60 * 1000,
    retry: 1,
    enabled: SHOP_LIVE,
  });

  const search = useMutation({
    mutationFn: (keys: number[]) => shopService.search(generationId, keys),
  });

  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);
  const hero = items.filter((i) => i.tier === "hero");
  const minor = items.filter((i) => i.tier === "minor");

  const toggle = (key: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!SHOP_LIVE) {
    return (
      <div className="mt-3 flex items-start gap-2.5 text-[12.5px] text-ink-2 bg-sage-tint/50 rounded-xl px-3.5 py-3">
        <Icon name="bag" size={16} className="text-sage shrink-0 mt-0.5" />
        <span>
          {t(
            "Coming soon. Soon you'll be able to shop real furniture that matches your design.",
            "即将上线。很快你就可以购买与你的设计相搭配的真实家具。",
          )}
        </span>
      </div>
    );
  }

  if (itemsQuery.isLoading) {
    return (
      <div className="mt-3 space-y-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-surface-sunk animate-pulse" />
        ))}
      </div>
    );
  }
  if (itemsQuery.isError || items.length === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-2 bg-danger-tint/60 rounded-xl px-3 py-2.5">
        <Icon name="info" size={15} className="text-danger shrink-0" />
        {t("Couldn’t read the items in this design.", "无法识别该设计中的单品。")}
      </div>
    );
  }

  const Row = ({ k, label }: { k: number; label: string }) => {
    const on = selected.has(k);
    return (
      <button
        onClick={() => toggle(k)}
        className={`w-full flex items-center gap-3 px-3.5 h-12 rounded-xl border text-left transition-colors active:scale-[.99] ${
          on ? "bg-sage-tint/70 border-sage" : "bg-surface border-line/70 hover:border-sage"
        }`}
      >
        <span
          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
            on ? "bg-sage border-sage text-paper" : "border-ink-3/50 text-transparent"
          }`}
        >
          <Icon name="check" size={13} stroke={2.4} />
        </span>
        <span className="text-[13.5px] font-medium text-ink">{label}</span>
      </button>
    );
  };

  return (
    <div className="mt-3">
      <p className="text-[12.5px] text-ink-2 mb-2.5">
        {t(
          "Pick the pieces you want to shop. We’ll find similar items within your budget.",
          "选择你想购买的单品，我们会在你的预算内找到相似的商品。",
        )}
      </p>

      <div className="space-y-2">
        {hero.map((it) => (
          <Row key={it.key} k={it.key} label={it.label} />
        ))}
      </div>

      {minor.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowMinor((v) => !v)}
            className="flex items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-sage transition-colors py-1.5"
          >
            <Icon name="chevronDown" size={14} className={showMinor ? "rotate-180" : ""} />
            {t("Smaller decor", "更多小件饰品")} ({minor.length})
          </button>
          {showMinor && (
            <div className="space-y-2 mt-1">
              {minor.map((it) => (
                <Row key={it.key} k={it.key} label={it.label} />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => search.mutate([...selected])}
        disabled={selected.size === 0 || search.isPending}
        className="mt-3.5 w-full h-12 rounded-2xl bg-sage text-paper text-[14.5px] font-semibold flex items-center justify-center gap-2 shadow-card transition-all active:scale-[.99] disabled:opacity-50 disabled:active:scale-100"
      >
        {search.isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-paper/40 border-t-paper rounded-full animate-spin" />
            {t("Finding matches…", "正在寻找…")}
          </>
        ) : (
          <>
            <Icon name="bag" size={17} />
            {selected.size > 0
              ? t(`Find products (${selected.size})`, `查找商品 (${selected.size})`)
              : t("Select items to shop", "选择要购买的单品")}
          </>
        )}
      </button>

      {search.isError && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-2 bg-danger-tint/60 rounded-xl px-3 py-2.5">
          <Icon name="info" size={15} className="text-danger shrink-0" />
          {t("Couldn’t load matches. Try again.", "暂时无法加载，请稍后重试。")}
        </div>
      )}

      {search.data && (
        <div className="mt-4 space-y-5">
          {search.data.groups.length === 0 ? (
            <div className="flex items-center gap-2 text-[12.5px] text-ink-2 bg-sage-tint/50 rounded-xl px-3 py-2.5">
              <Icon name="bag" size={15} className="text-sage shrink-0" />
              {t("No close matches yet.", "暂无相近的商品。")}
            </div>
          ) : (
            <>
              {search.data.groups.map((g) => (
                <Group key={g.key} group={g} />
              ))}
              <div className="text-[11px] text-ink-3 px-0.5">
                {t(
                  "Similar items from French retailers · prices and stock on the store page.",
                  "来自法国零售商的相似商品 · 价格与库存以商家页面为准。",
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
