"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Icon } from "@/components/ui";

const DISMISS_KEY = "roomora_install_hint";

/** Minimal shape of the Chrome beforeinstallprompt event (not in lib.dom yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/**
 * One-time "Add to Home Screen" nudge. iOS Safari gets an instructional banner
 * (no programmatic prompt exists there); Android/desktop Chrome gets a real
 * Install button via the captured beforeinstallprompt event. Hidden when the app
 * already runs standalone, and after dismiss/install (persisted in localStorage).
 */
export function InstallHint() {
  const { t } = useT();
  const [mode, setMode] = useState<"none" | "ios" | "android">("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIOS && isSafari) {
      // Client-only UA detection must run after mount (a lazy initializer would
      // break SSR hydration), so a synchronous setState here is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("ios");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, "1");
      setMode("none");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "none") return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("none");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setMode("none");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-[480px] rounded-2xl bg-surface border border-line shadow-soft px-3.5 py-3 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-sage-tint flex items-center justify-center shrink-0">
          <Icon name="sparkle" size={18} className="text-sage" />
        </span>
        <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-2">
          {mode === "ios" ? (
            <>
              <span className="font-semibold text-ink">
                {t("Add Roomora to your home screen", "把 Roomora 添加到主屏幕")}
              </span>
              <br />
              {t("Tap Share, then Add to Home Screen", "点分享按钮，再选「添加到主屏幕」")}
            </>
          ) : (
            <span className="font-semibold text-ink">
              {t("Install Roomora for one-tap access", "安装 Roomora，下次一键打开")}
            </span>
          )}
        </div>
        {mode === "android" && (
          <button
            onClick={() => void install()}
            className="shrink-0 h-9 px-3.5 rounded-xl bg-sage text-paper text-[13px] font-semibold active:scale-[.98]"
          >
            {t("Install", "安装")}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label={t("Dismiss", "关闭")}
          className="shrink-0 w-7 h-7 rounded-full hover:bg-black/[.05] flex items-center justify-center text-ink-3"
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>
  );
}
