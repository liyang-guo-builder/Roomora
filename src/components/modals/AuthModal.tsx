"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Btn } from "@/components/ui";
import { useFlow } from "@/components/flow/FlowProvider";
import { authService } from "@/lib/services";
import { Sheet, BrandBtn, GoogleGMark } from "./Sheet";
import type { AuthReason } from "@/lib/types";

export function AuthModal({ reason }: { reason: AuthReason }) {
  const { t } = useT();
  const { closeModal, showToast, onAuthed } = useFlow();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    "w-full h-[52px] rounded-[14px] px-4 bg-surface border border-line text-[15px] text-ink placeholder:text-ink-3 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none";
  const labelCls = "text-[12.5px] font-medium text-ink-2 mb-1.5 block";

  async function submit() {
    const e = email.trim();
    if (!e || !password) {
      showToast(t("Enter your email and password", "请输入邮箱和密码"), "info");
      return;
    }
    if (mode === "signup") {
      if (password.length < 6) {
        showToast(t("Password must be at least 6 characters", "密码至少 6 位"), "info");
        return;
      }
      if (password !== confirm) {
        showToast(t("Passwords do not match", "两次输入的密码不一致"), "info");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await authService.signUp(e, password, name.trim() || undefined);
        showToast(t("Account created", "账号已创建"), "check");
      } else {
        await authService.signInWithPassword(e, password);
        showToast(t("Signed in", "登录成功"), "check");
      }
      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const friendly =
        mode === "signin"
          ? t("Wrong email or password", "邮箱或密码错误")
          : /already|registered|exists/i.test(msg)
            ? t("That email already has an account. Sign in instead.", "该邮箱已注册，请直接登录。")
            : t("Couldn’t create the account, try again", "创建失败，请重试");
      showToast(friendly, "info");
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    const e = email.trim();
    if (!e) {
      showToast(t("Enter your email first", "请先输入邮箱"), "info");
      return;
    }
    setBusy(true);
    try {
      await authService.resetPassword(e);
      showToast(t("Check your email for a reset link", "重置链接已发送至你的邮箱"), "mail");
    } catch {
      showToast(t("Couldn’t send the reset email, try again", "发送失败，请重试"), "info");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={closeModal} title={t("Keep this design", "保存这个设计")} sub={subs[reason]}>
      <div className="flex flex-col gap-3 mt-1">
        <BrandBtn
          icon={<GoogleGMark />}
          label={t("Continue with Google", "使用 Google 继续")}
          onClick={() => void onAuthed("google")}
        />
        <div className="flex items-center gap-3 my-0.5 text-ink-3 text-[11.5px] uppercase tracking-wide">
          <div className="h-px flex-1 bg-line" />
          {t("or with email", "或使用邮箱")}
          <div className="h-px flex-1 bg-line" />
        </div>

        {mode === "signup" && (
          <div>
            <label className={labelCls}>{t("Full name", "姓名")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder={t("Your name", "你的名字")}
              className={inputCls}
            />
          </div>
        )}
        <div>
          <label className={labelCls}>{t("Email", "邮箱")}</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t("Password", "密码")}</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={t("At least 6 characters", "至少 6 位")}
            className={inputCls}
          />
        </div>
        {mode === "signin" && (
          <button
            onClick={() => void forgot()}
            className="text-[12.5px] text-ink-3 hover:text-sage text-left -mt-1 w-fit"
          >
            {t("Forgot password?", "忘记密码？")}
          </button>
        )}
        {mode === "signup" && (
          <div>
            <label className={labelCls}>{t("Confirm password", "确认密码")}</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder={t("Re-enter your password", "再次输入密码")}
              className={inputCls}
            />
          </div>
        )}

        <Btn variant="primary" size="lg" full className="mt-1" onClick={() => void submit()}>
          {busy
            ? t("Please wait…", "请稍候…")
            : mode === "signup"
              ? t("Create account", "创建账号")
              : t("Sign in", "登录")}
        </Btn>
      </div>

      <button
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="w-full text-center text-[13px] text-sage font-medium mt-4"
      >
        {mode === "signup"
          ? t("Already have an account? Sign in", "已有账号？登录")
          : t("New here? Create an account", "还没有账号？注册")}
      </button>
      <p className="text-center text-[11px] text-ink-3 mt-3 leading-relaxed">
        {t("By continuing you agree to our", "继续即表示同意我们的")}{" "}
        <a href="/terms" target="_blank" rel="noopener" className="underline">
          {t("Terms", "条款")}
        </a>{" "}
        {t("and", "和")}{" "}
        <a href="/privacy" target="_blank" rel="noopener" className="underline">
          {t("Privacy Policy", "隐私政策")}
        </a>
        .
      </p>
    </Sheet>
  );
}
