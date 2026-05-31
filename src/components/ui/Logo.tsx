export function Logo({ size = 32, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-[11px] bg-sage flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(124,136,102,.9)]"
        style={{ width: size, height: size }}
      >
        <span
          className="font-bold text-paper"
          style={{ fontSize: size * 0.62, marginTop: -size * 0.03 }}
        >
          R
        </span>
      </div>
      {withWord && (
        <span className="text-[19px] font-semibold tracking-[-.02em] text-ink">Roomora</span>
      )}
    </div>
  );
}
