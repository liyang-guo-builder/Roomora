"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { Btn } from "@/components/ui";

/**
 * Password reset landing page. The email link routes through /auth/callback
 * (which exchanges the code for a recovery session), then here. We confirm a
 * session exists, let the user set a new password, then send them home signed in.
 */
export default function ResetPasswordPage() {
  const { t } = useT();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setState(data.user ? "ready" : "invalid");
    });
  }, []);

  async function submit() {
    setErr(null);
    if (password.length < 6) {
      setErr(t("Password must be at least 6 characters", "密码至少 6 位"));
      return;
    }
    if (password !== confirm) {
      setErr(t("Passwords do not match", "两次输入的密码不一致"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setState("done");
      setTimeout(() => router.push("/"), 1400);
    } catch {
      setErr(t("Could not update the password. The link may have expired.", "更新失败，链接可能已过期。"));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full h-[52px] rounded-[14px] px-4 bg-surface border border-line text-[15px] text-ink placeholder:text-ink-3 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none";

  return (
    <div className="min-h-dvh bg-paper flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[400px] rounded-[20px] bg-surface border border-line/70 shadow-card p-6">
        <h1 className="text-[22px] font-semibold tracking-[-.01em] text-ink">
          {t("Set a new password", "设置新密码")}
        </h1>

        {state === "checking" && (
          <p className="text-[14px] text-ink-2 mt-3">{t("Checking your link…", "正在验证链接…")}</p>
        )}

        {state === "invalid" && (
          <>
            <p className="text-[14px] text-ink-2 mt-3">
              {t(
                "This reset link is invalid or has expired. Request a new one from the sign-in screen.",
                "重置链接无效或已过期，请在登录页重新申请。",
              )}
            </p>
            <Btn variant="primary" size="lg" full className="mt-5" onClick={() => router.push("/")}>
              {t("Back to Roomora", "返回 Roomora")}
            </Btn>
          </>
        )}

        {state === "ready" && (
          <div className="flex flex-col gap-3 mt-4">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder={t("New password (min 6 characters)", "新密码（至少 6 位）")}
              className={inputCls}
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder={t("Confirm new password", "确认新密码")}
              className={inputCls}
            />
            {err && <p className="text-[12.5px] text-danger">{err}</p>}
            <Btn variant="primary" size="lg" full className="mt-1" onClick={() => void submit()}>
              {busy ? t("Updating…", "更新中…") : t("Update password", "更新密码")}
            </Btn>
          </div>
        )}

        {state === "done" && (
          <p className="text-[14px] text-sage mt-3">
            {t("Password updated. Taking you back in…", "密码已更新，正在返回…")}
          </p>
        )}
      </div>
    </div>
  );
}
