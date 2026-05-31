"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui";

export function Sheet({
  children,
  onClose,
  title,
  sub,
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  sub?: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] sheet-fade" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-paper rounded-t-[26px] px-5 pt-3 pb-7 shadow-[0_-12px_40px_rgba(60,59,48,.25)] sheet-up max-h-[92%] overflow-y-auto mx-auto w-full max-w-[480px]"
      >
        <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto mb-4" />
        {(title || sub) && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && (
                <h3 className="text-[19px] font-semibold tracking-[-.01em] text-ink">{title}</h3>
              )}
              {sub && <p className="text-[13.5px] text-ink-2 mt-1 max-w-[34ch]">{sub}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 -mr-1 rounded-full hover:bg-black/[.05] flex items-center justify-center text-ink-3 shrink-0"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Brand badge — neutral monogram placeholder, NOT official logos. */
export function BrandBtn({
  tone,
  mono,
  label,
  onClick,
  soon,
}: {
  tone: string;
  mono: string;
  label: string;
  onClick?: () => void;
  soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className={`w-full h-[52px] rounded-[14px] border flex items-center gap-3 px-4 font-medium text-[15px] transition-all active:scale-[.99] ${
        soon
          ? "border-line bg-surface/60 text-ink-3"
          : "border-line bg-surface text-ink hover:border-ink-3 shadow-card"
      }`}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold text-white shrink-0"
        style={{ background: tone }}
      >
        {mono}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3 bg-surface-sunk px-2 py-0.5 rounded-full">
          soon
        </span>
      )}
    </button>
  );
}
