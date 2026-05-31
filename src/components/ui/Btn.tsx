import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type BtnVariant =
  | "primary"
  | "brass"
  | "secondary"
  | "ghost"
  | "danger"
  | "outlineBrass";
export type BtnSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[.98] select-none rounded-[14px] leading-none";

const sizes: Record<BtnSize, string> = {
  lg: "text-[16px] px-6 h-[56px]",
  md: "text-[15px] px-5 h-[48px]",
  sm: "text-[13px] px-3.5 h-[38px]",
};

const variants: Record<BtnVariant, string> = {
  primary: "bg-sage text-paper shadow-[0_8px_22px_-8px_rgba(124,136,102,.7)] hover:bg-sage-deep",
  brass: "bg-brass-deep text-white shadow-[0_8px_22px_-8px_rgba(183,154,94,.7)] hover:bg-[#8a7240]",
  secondary: "bg-surface text-ink border border-line hover:border-ink-3 shadow-card",
  ghost: "text-ink-2 hover:bg-black/[.04]",
  danger: "bg-danger text-paper hover:opacity-90",
  outlineBrass: "border border-brass/55 text-ink hover:bg-brass-tint",
};

export function Btn({
  variant = "primary",
  size = "md",
  full,
  children,
  icon,
  iconRight,
  onClick,
  className = "",
  type = "button",
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  children: ReactNode;
  icon?: IconName;
  iconRight?: IconName;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 17 : 19} />}
      <span className="truncate">{children}</span>
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 17 : 19} />}
    </button>
  );
}
