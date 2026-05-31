"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader, Icon } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useFlow } from "./FlowProvider";
import { AuthModal } from "@/components/modals/AuthModal";
import { BuyModal } from "@/components/modals/BuyModal";
import { ShareModal } from "@/components/modals/ShareModal";
import { Toast } from "@/components/modals/Toast";

/** Routes that show the bottom nav (Home / Designs / Account). */
const NAV_ROUTES = ["/", "/designs", "/account"];

function BottomNav() {
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const tabs: [string, "home" | "grid" | "gear", string][] = [
    ["/", "home", t("Home", "首页")],
    ["/designs", "grid", t("Designs", "设计")],
    ["/account", "gear", t("Account", "我的")],
  ];
  return (
    <nav className="shrink-0 flex items-stretch border-t border-line/70 bg-paper/95 backdrop-blur-md sticky bottom-0 z-20">
      {tabs.map(([href, ic, lab]) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 ${
              active ? "text-sage" : "text-ink-3"
            }`}
          >
            <Icon name={ic} size={22} stroke={active ? 2.1 : 1.7} />
            <span className="text-[10.5px] font-medium">{lab}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { modal, authReason, forceOut, toast, openModal } = useFlow();
  const showNav = NAV_ROUTES.includes(pathname);

  return (
    <div className="min-h-dvh flex flex-col bg-paper mx-auto w-full max-w-[480px] relative">
      <AppHeader onCredits={() => openModal("buy")} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      {showNav && <BottomNav />}

      {modal === "auth" && <AuthModal reason={authReason} />}
      {modal === "buy" && <BuyModal forceOut={forceOut} />}
      {modal === "share" && <ShareModal />}
      {toast && <Toast icon={toast.icon}>{toast.msg}</Toast>}
    </div>
  );
}
