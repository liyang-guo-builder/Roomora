import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  pad?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-[20px] border border-line/70 shadow-card ${pad ? "p-4" : ""} ${
        onClick ? "cursor-pointer hover:shadow-soft transition-shadow" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <span className="text-[13px] font-semibold text-ink">{children}</span>
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </div>
  );
}
