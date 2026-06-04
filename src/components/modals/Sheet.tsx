"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui";

/** Official multicolor Google "G" mark for the Sign-in-with-Google button. */
export function GoogleGMark({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

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

/** Brand button. Pass `icon` for an official logo (e.g. Google), or `tone`+`mono`
    for a neutral monogram placeholder. */
export function BrandBtn({
  tone,
  mono,
  icon,
  label,
  onClick,
  soon,
}: {
  tone?: string;
  mono?: string;
  icon?: ReactNode;
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
      {icon ? (
        <span className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center shrink-0">
          {icon}
        </span>
      ) : (
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold text-white shrink-0"
          style={{ background: tone }}
        >
          {mono}
        </span>
      )}
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3 bg-surface-sunk px-2 py-0.5 rounded-full">
          soon
        </span>
      )}
    </button>
  );
}
