"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader, Icon } from "@/components/ui";
import { InstallHint } from "@/components/ui/InstallHint";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useFlow } from "./FlowProvider";
import { AuthModal } from "@/components/modals/AuthModal";
import { BuyModal } from "@/components/modals/BuyModal";
import { ShareModal } from "@/components/modals/ShareModal";
import { Toast } from "@/components/modals/Toast";

/** Routes that show the bottom nav (Home / Designs / Account). */
const NAV_ROUTES = ["/app", "/designs", "/account"];

function BottomNav() {
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const tabs: [string, "home" | "grid" | "gear", string][] = [
    ["/app", "home", t("Home", "首页")],
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
  const anon = useStore((s) => s.anon);
  // Keep the app home a focused conversion funnel for first-time (anon)
  // visitors: no bottom nav competing with the single "add a photo" CTA.
  // Signed-in users keep the nav on /app to reach Designs / Account.
  const showNav = NAV_ROUTES.includes(pathname) && !(pathname === "/app" && anon);

  // Public/standalone pages render full-width, outside the mobile app chrome
  // (no phone frame, header, bottom nav, or in-app modals): the marketing
  // homepage ("/"), the share pages, and the legal pages (long-form, readable).
  const bare = ["/share", "/terms", "/privacy"];
  if (pathname === "/" || (pathname && bare.some((r) => pathname.startsWith(r)))) {
    return <>{children}</>;
  }

  return (
    // Outer canvas: flat paper on mobile; on desktop a warm gradient that frames
    // the app as an intentional centered "device" instead of a lonely column.
    <div className="min-h-dvh bg-paper md:bg-[linear-gradient(155deg,#E7EBDF_0%,#EFE9D9_55%,#E4DECE_100%)] md:flex md:items-center md:justify-center md:p-6">
      <div className="relative flex flex-col bg-paper w-full max-w-[480px] min-h-dvh md:min-h-0 md:h-[min(900px,94vh)] md:rounded-[44px] md:border md:border-line/70 md:shadow-[0_30px_80px_-24px_rgba(60,59,48,.4)] md:overflow-hidden">
        <AppHeader onCredits={() => openModal("buy")} />
        <main className="flex-1 overflow-x-hidden md:overflow-y-auto">{children}</main>
        {showNav && <BottomNav />}

        {modal === "auth" && <AuthModal reason={authReason} />}
        {modal === "buy" && <BuyModal forceOut={forceOut} />}
        {modal === "share" && <ShareModal />}
        {toast && <Toast icon={toast.icon}>{toast.msg}</Toast>}
        <InstallHint />
      </div>
    </div>
  );
}
