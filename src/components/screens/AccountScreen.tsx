"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useFlow } from "@/components/flow/FlowProvider";
import { authService, creditsService } from "@/lib/services";
import { Btn, Icon, Hex, type IconName } from "@/components/ui";
import type { Lang } from "@/lib/types";

function Row({
  icon,
  label,
  value,
  onClick,
  danger,
}: {
  icon: IconName;
  label: string;
  value?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 h-14 ${
        onClick ? "hover:bg-black/[.03] active:bg-black/[.05]" : ""
      } transition-colors text-left`}
    >
      <Icon name={icon} size={19} className={danger ? "text-danger" : "text-ink-2"} />
      <span className={`text-[14.5px] ${danger ? "text-danger font-medium" : "text-ink"}`}>{label}</span>
      <span className="ml-auto flex items-center gap-1.5 text-[13.5px] text-ink-3">
        {value}
        {onClick && !danger && <Icon name="chevronRight" size={16} className="text-ink-3" />}
      </span>
    </button>
  );
}

export function AccountScreen() {
  const { t } = useT();
  const { openModal, showToast } = useFlow();
  const searchParams = useSearchParams();
  const credits = useStore((s) => s.credits);
  const setCredits = useStore((s) => s.setCredits);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const user = useStore((s) => s.user);

  // Returning from Stripe Checkout: the webhook credits the account server-side,
  // and it can land several seconds after the redirect (longer for the async
  // WeChat Pay / Alipay methods). Poll the authoritative balance until it rises
  // (up to ~30s), updating the displayed number live so the user is never left
  // looking at their old balance. We strip the query param with history (not a
  // router navigation) so removing it does NOT re-run this effect and cancel the
  // poll mid-flight.
  const purchaseStatus = searchParams.get("purchase");
  const handledPurchase = useRef(false);
  useEffect(() => {
    if (!purchaseStatus || handledPurchase.current) return;
    handledPurchase.current = true;

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/account");
    }

    if (purchaseStatus === "cancelled") {
      showToast(t("Checkout cancelled", "支付已取消"), "info");
      return;
    }

    if (purchaseStatus !== "success") return;

    let cancelled = false;
    const baseline = useStore.getState().credits;
    (async () => {
      let credited = false;
      // ~30s window: 15 tries, 2s apart.
      for (let i = 0; i < 15 && !cancelled; i++) {
        try {
          const bal = await creditsService.balance();
          if (!cancelled) setCredits(bal);
          if (bal > baseline) {
            credited = true;
            break;
          }
        } catch {
          // ignore; useAuthSync also refreshes on mount
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) {
        showToast(
          credited
            ? t("Credits added", "积分已到账")
            : t(
                "Payment received. Your credits will appear shortly.",
                "支付成功，积分将很快到账。",
              ),
          "check",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchaseStatus, setCredits, showToast, t]);

  const displayName = user?.email ? user.email.split("@")[0] : t("Guest", "访客");
  const displayEmail = user?.email ?? t("Not signed in", "未登录");

  async function handleSignOut() {
    if (!user) {
      openModal("auth", { reason: "save" });
      return;
    }
    await authService.signOut();
    showToast(t("Signed out", "已退出登录"), "check");
  }

  const langOpts: [Lang, string][] = [
    ["en", "English"],
    ["zh", "中文"],
  ];

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-14 h-14 rounded-full bg-brass-tint border border-brass/30 flex items-center justify-center text-brass-deep text-[20px] font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-[16px] font-semibold text-ink">{displayName}</div>
          <div className="text-[13px] text-ink-3">{displayEmail}</div>
        </div>
      </div>

      {/* credits card */}
      <div className="rounded-[20px] p-4 bg-sage text-paper shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12.5px] text-paper/70">{t("Credit balance", "积分余额")}</div>
            <div className="text-[28px] font-semibold flex items-center gap-2 leading-none mt-1">
              <Hex size={22} className="text-paper" />
              {credits}
            </div>
          </div>
          <Btn variant="brass" size="md" icon="plus" onClick={() => openModal("buy")}>
            {t("Buy more", "购买积分")}
          </Btn>
        </div>
        <div className="text-[11.5px] text-paper/70 mt-3">
          {t("1 credit = one generation or one refine", "1 积分 = 一次生成或一次微调")}
        </div>
      </div>

      <div className="mt-5 rounded-[20px] bg-surface border border-line/70 shadow-card divide-y divide-line/70 overflow-hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="flex items-center gap-3 text-[14.5px] text-ink">
            <Icon name="globe" size={19} className="text-ink-2" />
            {t("Language", "语言")}
          </span>
          <div className="inline-flex rounded-full bg-surface-sunk p-[3px] text-[12.5px] font-semibold">
            {langOpts.map(([k, lab]) => (
              <button
                key={k}
                onClick={() => setLang(k)}
                className={`px-3 h-[28px] rounded-full ${lang === k ? "bg-sage text-paper" : "text-ink-3"}`}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
        <Row icon="info" label={t("Billing history", "账单记录")} value={t("None yet", "暂无")} onClick={() => {}} />
        <Row
          icon="lock"
          label={t("Privacy Policy", "隐私政策")}
          onClick={() => {
            window.location.href = "/privacy";
          }}
        />
        <Row
          icon="info"
          label={t("Terms of Service", "服务条款")}
          onClick={() => {
            window.location.href = "/terms";
          }}
        />
      </div>

      <div className="mt-4 rounded-[20px] bg-surface border border-line/70 shadow-card overflow-hidden">
        {user ? (
          <Row icon="arrowLeft" label={t("Sign out", "退出登录")} danger onClick={() => void handleSignOut()} />
        ) : (
          <Row
            icon="arrowRight"
            label={t("Sign in", "登录")}
            onClick={() => openModal("auth", { reason: "save" })}
          />
        )}
      </div>
      <p className="text-center text-[11px] text-ink-3 mt-6">
        Roomora · v1.0 · {t("Made in Paris", "巴黎制造")}
      </p>
    </div>
  );
}
