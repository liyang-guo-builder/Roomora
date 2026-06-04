"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Btn, Icon } from "@/components/ui";
import { useFlow } from "@/components/flow/FlowProvider";
import { authService } from "@/lib/services";
import { Sheet, BrandBtn, GoogleGMark } from "./Sheet";
import type { AuthReason } from "@/lib/types";

export function AuthModal({ reason }: { reason: AuthReason }) {
  const { t } = useT();
  const { closeModal, showToast, onAuthed } = useFlow();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  const subs: Record<AuthReason, string> = {
    save: t("Save your design and get 3 free credits.", "保存你的设计，再得 3 个免费积分。"),
    free: t(
      "You’ve used your free design. Sign in to keep going and get 3 free credits.",
      "免费设计已用完，登录即可继续，并获得 3 个免费积分。",
    ),
    default: t("Save your design and get 3 free credits.", "保存你的设计，再得 3 个免费积分。"),
  };

  const inputCls =
    "w-full h-[52px] rounded-[14px] bg-surface border border-line text-[15px] text-ink placeholder:text-ink-3 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none";

  async function sendCode() {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    try {
      await authService.signIn("email", e);
      setStep("code");
      showToast(t("We sent you a 6-digit code", "验证码已发送至你的邮箱"), "mail");
    } catch {
      showToast(t("Couldn’t send the code, try again", "发送失败，请重试"), "info");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const c = code.trim();
    if (c.length < 6) return;
    setBusy(true);
    try {
      await authService.verifyEmailOtp(email.trim(), c);
      closeModal();
      showToast(t("Signed in", "登录成功"), "check");
    } catch {
      showToast(t("Invalid or expired code", "验证码无效或已过期"), "info");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={closeModal} title={t("Keep this design", "保存这个设计")} sub={subs[reason]}>
      <div className="flex flex-col gap-2.5 mt-1">
        <BrandBtn
          icon={<GoogleGMark />}
          label={t("Continue with Google", "使用 Google 继续")}
          onClick={() => void onAuthed("google")}
        />
        <div className="flex items-center gap-3 my-1 text-ink-3 text-[12px]">
          <div className="h-px flex-1 bg-line" />
          {t("or", "或")}
          <div className="h-px flex-1 bg-line" />
        </div>

        {step === "email" ? (
          <>
            <div className="relative">
              <Icon
                name="mail"
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                className={`${inputCls} pl-11 pr-4`}
              />
            </div>
            <Btn variant="primary" size="lg" full onClick={() => void sendCode()}>
              {busy ? t("Sending…", "发送中…") : t("Email me a code", "发送验证码")}
            </Btn>
          </>
        ) : (
          <>
            <p className="text-[13px] text-ink-2 px-0.5">
              {t(
                `Enter the 6-digit code we sent to ${email.trim()}.`,
                `请输入发送至 ${email.trim()} 的 6 位验证码。`,
              )}
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              className={`${inputCls} text-center text-[22px] font-semibold tracking-[0.4em]`}
            />
            <Btn variant="primary" size="lg" full onClick={() => void verify()}>
              {busy ? t("Verifying…", "验证中…") : t("Verify and sign in", "验证并登录")}
            </Btn>
            <div className="flex items-center justify-between text-[12.5px] text-ink-3 px-0.5">
              <button
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
              >
                {t("Use a different email", "换一个邮箱")}
              </button>
              <button onClick={() => void sendCode()} disabled={busy}>
                {t("Resend code", "重新发送")}
              </button>
            </div>
          </>
        )}
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
