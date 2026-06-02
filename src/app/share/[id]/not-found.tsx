"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Logo, Icon } from "@/components/ui";

export default function ShareNotFound() {
  const { t } = useT();
  return (
    <div className="min-h-dvh bg-paper flex flex-col items-center justify-center px-6 text-center">
      <Logo size={34} />
      <h1 className="mt-8 text-[22px] font-semibold text-ink">
        {t("This design isn’t available", "该设计不可用")}
      </h1>
      <p className="mt-2 text-[14.5px] text-ink-2 max-w-[34ch]">
        {t(
          "The link may be private or expired. You can still design your own room for free.",
          "该链接可能未公开或已失效。你仍然可以免费设计自己的房间。",
        )}
      </p>
      <Link
        href="/?utm_source=share&utm_medium=social&utm_campaign=share_404"
        className="mt-7 h-[52px] px-7 rounded-[16px] bg-sage text-paper flex items-center justify-center gap-2 text-[15.5px] font-semibold shadow-[0_8px_22px_-8px_rgba(124,136,102,.7)] hover:bg-sage-deep transition-colors"
      >
        <Icon name="camera" size={19} />
        {t("Design your room", "设计你的房间")}
      </Link>
    </div>
  );
}
