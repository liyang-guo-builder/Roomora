"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";

export function Toast({ icon = "check", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 flex items-center gap-2 px-4 h-11 rounded-full bg-ink text-paper text-[13.5px] font-medium shadow-soft toast-in">
      <Icon name={icon} size={16} className="text-sage" stroke={2.4} />
      {children}
    </div>
  );
}
