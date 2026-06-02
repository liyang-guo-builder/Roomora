"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Btn, Icon } from "@/components/ui";
import { useFlow } from "@/components/flow/FlowProvider";
import { Sheet, BrandBtn } from "./Sheet";
import type { AuthReason } from "@/lib/types";

export function AuthModal({ reason }: { reason: AuthReason }) {
  const { t } = useT();
  const { closeModal, onAuthed } = useFlow();
  const [email, setEmail] = useState("");

  const subs: Record<AuthReason, string> = {
    save: t("Save your design and get 3 free credits.", "保存你的设计，再得 3 个免费积分。"),
    free: t(
      "You’ve used your free design. Sign in to keep going and get 3 free credits.",
      "免费设计已用完，登录即可继续，并获得 3 个免费积分。",
    ),
    default: t("Save your design and get 3 free credits.", "保存你的设计，再得 3 个免费积分。"),
  };

  return (
    <Sheet onClose={closeModal} title={t("Keep this design", "保存这个设计")} sub={subs[reason]}>
      <div className="flex flex-col gap-2.5 mt-1">
        <BrandBtn
          tone="#4285F4"
          mono="G"
          label={t("Continue with Google", "使用 Google 继续")}
          onClick={() => void onAuthed("google")}
        />
        <BrandBtn tone="#07C160" mono="W" label={t("Continue with WeChat", "使用微信继续")} soon />
        <div className="flex items-center gap-3 my-1 text-ink-3 text-[12px]">
          <div className="h-px flex-1 bg-line" />
          {t("or", "或")}
          <div className="h-px flex-1 bg-line" />
        </div>
        <div className="relative">
          <Icon
            name="mail"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-surface border border-line text-[15px] text-ink placeholder:text-ink-3 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none"
          />
        </div>
        <Btn variant="primary" size="lg" full onClick={() => void onAuthed("email", email)}>
          {t("Email me a magic link", "发送登录链接")}
        </Btn>
      </div>
      <p className="text-center text-[11.5px] text-ink-3 mt-4 leading-relaxed">
        {t(
          "No passwords, ever. By continuing you agree to our Terms & Privacy.",
          "永不需要密码。继续即表示同意我们的条款与隐私政策。",
        )}
      </p>
    </Sheet>
  );
}
