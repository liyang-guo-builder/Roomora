import type { ReactNode } from "react";

export function Chip({
  active,
  children,
  onClick,
  className = "",
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] font-medium border transition-all active:scale-[.97] ${
        active
          ? "bg-sage text-paper border-sage shadow-[0_6px_16px_-8px_rgba(124,136,102,.8)]"
          : "bg-surface text-ink-2 border-line hover:border-ink-3"
      } ${className}`}
    >
      {children}
    </button>
  );
}
