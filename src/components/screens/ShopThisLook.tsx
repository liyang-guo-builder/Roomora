"use client";

import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Icon } from "@/components/ui";
import { shopService, type ShopGroup, type ShopProduct } from "@/lib/services";
import { CATEGORY_LABELS } from "@/lib/shop/categories";

/** Format a price like "€199" / "199 €" — keep it compact, drop trailing .00. */
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
          {t("Buy at", "前往")} {p.brand ?? t("store", "商家")}
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
  const label = group.item.query
    ? group.item.query.charAt(0).toUpperCase() + group.item.query.slice(1)
    : t(en, zh);
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[11px] text-ink-3">{t(en, zh)}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1">
        {group.products.map((p, i) => (
          <ProductCard key={`${p.deeplink ?? p.title}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}

/** Real shopping goes live only once a real affiliate feed is connected.
 * Until then we show a "coming soon" teaser instead of the sample products
 * (whose buy links are placeholders). Flip NEXT_PUBLIC_SHOP_LIVE=true in Vercel
 * the day an approved feed is ingested — no code change. */
const SHOP_LIVE = process.env.NEXT_PUBLIC_SHOP_LIVE === "true";

export function ShopThisLook({ generationId }: { generationId: string }) {
  const { t } = useT();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["shop", generationId],
    queryFn: () => shopService.getShop(generationId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: SHOP_LIVE,
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

  if (isLoading) {
    return (
      <div className="mt-3 space-y-4" aria-busy="true">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g}>
            <div className="h-3.5 w-28 rounded bg-surface-sunk animate-pulse mb-2" />
            <div className="flex gap-2.5 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[148px] animate-pulse">
                  <div className="aspect-square rounded-2xl bg-surface-sunk ring-1 ring-line" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-surface-sunk" />
                  <div className="mt-1.5 h-3 w-1/3 rounded bg-surface-sunk" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-2 bg-danger-tint/60 rounded-xl px-3 py-2.5">
        <Icon name="info" size={15} className="text-danger shrink-0" />
        {t("Couldn’t load matches. Try again.", "暂时无法加载，请稍后重试。")}
      </div>
    );
  }

  const groups = data?.groups ?? [];
  if (groups.length === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-2 bg-sage-tint/50 rounded-xl px-3 py-2.5">
        <Icon name="bag" size={15} className="text-sage shrink-0" />
        {t("No close matches yet.", "暂无相近的商品。")}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-5">
      {groups.map((g, i) => (
        <Group key={`${g.item.category}-${i}`} group={g} />
      ))}
      <div className="text-[11px] text-ink-3 px-0.5">
        {t(
          "Similar items · we may earn a commission.",
          "相似商品 · 我们可能获得佣金。",
        )}
      </div>
    </div>
  );
}
