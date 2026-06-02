"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Btn, Icon, Hex } from "@/components/ui";
import { useFlow } from "@/components/flow/FlowProvider";
import { paymentService } from "@/lib/services";
import type { PayMethod } from "@/lib/types";
import { Sheet } from "./Sheet";

const PACKS = paymentService.packs;

export function BuyModal({ forceOut }: { forceOut: boolean }) {
  const { t } = useT();
  const { closeModal, doPurchase } = useFlow();
  const credits = useStore((s) => s.credits);
  const [sel, setSel] = useState(1);
  const [pay, setPay] = useState<PayMethod>("card");
  const out = forceOut || credits === 0;

  const methods: [PayMethod, string, string, string, string][] = [
    ["card", "#635BFF", "€", t("Card", "银行卡"), "Stripe · EUR"],
    ["wechat", "#07C160", "W", t("WeChat Pay", "微信支付"), "CNY"],
  ];

  return (
    <Sheet
      onClose={closeModal}
      title={t("Add credits", "购买积分")}
      sub={t(
        "1 credit = one generation or one refine. No subscription.",
        "1 积分 = 一次生成或一次微调。无需订阅。",
      )}
    >
      {out && (
        <div className="flex items-center gap-2 text-[12.5px] text-danger bg-danger-tint rounded-xl px-3 py-2.5 mb-3 -mt-1">
          <Icon name="info" size={15} />{" "}
          {t("You’re out of credits. Top up to keep designing.", "积分已用完，充值即可继续设计。")}
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {PACKS.map((p, i) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            className={`relative w-full flex items-center gap-3 p-3.5 rounded-[16px] border-2 transition-all text-left ${
              sel === i ? "border-sage bg-sage-tint/50" : "border-line bg-surface"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                sel === i ? "bg-sage text-paper" : "bg-surface-sunk text-brass"
              }`}
            >
              <Hex size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-ink flex items-center gap-2">
                {p.c} {t("credits", "积分")}
                {p.best && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-paper bg-brass px-2 py-0.5 rounded-full">
                    {t("best value", "超值")}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-ink-3">
                {p.c} {t("designs or refines", "次设计或微调")}
              </div>
            </div>
            <div className="ml-auto text-right shrink-0">
              <div className="text-[16px] font-semibold text-ink">
                {pay === "card" ? `€${p.eur}` : `¥${p.cny}`}
              </div>
              <div className="text-[11px] text-ink-3">
                €{(p.eur / p.c).toFixed(2)}/{t("ea", "个")}
              </div>
            </div>
            <div
              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                sel === i ? "border-sage bg-sage" : "border-line"
              }`}
            >
              {sel === i && <Icon name="check" size={12} stroke={3} className="text-paper" />}
            </div>
          </button>
        ))}
      </div>

      {/* payment method */}
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        {methods.map(([k, tone, mono, lab, sub]) => (
          <button
            key={k}
            onClick={() => setPay(k)}
            className={`flex items-center gap-2.5 p-3 rounded-[14px] border-2 transition-all ${
              pay === k ? "border-sage bg-sage-tint/40" : "border-line bg-surface"
            }`}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold text-white shrink-0"
              style={{ background: tone }}
            >
              {mono}
            </span>
            <div className="text-left min-w-0">
              <div className="text-[13.5px] font-semibold text-ink truncate">{lab}</div>
              <div className="text-[10.5px] text-ink-3">{sub}</div>
            </div>
          </button>
        ))}
      </div>

      <Btn
        variant="primary"
        size="lg"
        full
        className="mt-4"
        onClick={() => void doPurchase(sel, pay)}
      >
        {t("Pay", "支付")} {pay === "card" ? `€${PACKS[sel].eur}` : `¥${PACKS[sel].cny}`} ·{" "}
        {PACKS[sel].c} {t("credits", "积分")}
      </Btn>
      <p className="text-center text-[11.5px] text-ink-3 mt-3">
        {t("Secure checkout · cancel anytime", "安全支付 · 随时取消")}
      </p>
    </Sheet>
  );
}
