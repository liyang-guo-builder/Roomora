/* Tonal-placeholder "photograph" — stands in for real room imagery.
   before = cooler/plainer; after = warm sage+brass styled. */

export function RoomPhoto({
  variant = "after",
  label,
  className = "",
  rounded = "rounded-2xl",
  tag = true,
}: {
  variant?: "before" | "after";
  label?: string;
  className?: string;
  rounded?: string;
  tag?: boolean;
}) {
  const grad =
    variant === "before"
      ? "linear-gradient(155deg,#d9d6c9 0%,#cfccbd 45%,#c4c3b6 100%)"
      : "linear-gradient(155deg,#efe7d4 0%,#e4dcc3 45%,#d8cdb0 100%)";
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ background: grad }}>
      {/* window light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "before"
              ? "radial-gradient(120% 80% at 78% 8%, rgba(255,255,255,.55), transparent 55%)"
              : "radial-gradient(120% 85% at 80% 6%, rgba(255,249,233,.8), transparent 58%)",
        }}
      />
      <div
        className="absolute right-[12%] top-[8%] w-[26%] h-[46%] rounded-[4px]"
        style={{
          background: variant === "before" ? "rgba(255,255,255,.35)" : "rgba(255,252,240,.55)",
          boxShadow: "inset 0 0 0 3px rgba(255,255,255,.25)",
        }}
      />
      {/* furniture suggestion (soft blocks) */}
      {variant === "after" ? (
        <>
          <div
            className="absolute left-[10%] bottom-[8%] w-[44%] h-[26%] rounded-[10px]"
            style={{
              background: "linear-gradient(180deg,#b9a98a,#a9966f)",
              boxShadow: "0 8px 18px -8px rgba(60,50,30,.5)",
            }}
          />
          <div
            className="absolute left-[15%] bottom-[30%] w-[10%] h-[16%] rounded-full"
            style={{ background: "#7c8866" }}
          />
          <div
            className="absolute right-[14%] bottom-[9%] w-[18%] h-[34%] rounded-[8px]"
            style={{ background: "linear-gradient(180deg,#cdb98f,#b79a5e)" }}
          />
        </>
      ) : (
        <div
          className="absolute left-[12%] bottom-[9%] w-[40%] h-[20%] rounded-[8px]"
          style={{ background: "#bdbaa9" }}
        />
      )}
      {tag && (
        <div className="absolute left-2.5 top-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-white/70 text-ink/70 backdrop-blur-sm">
            {label || (variant === "before" ? "your room" : "restyled")}
          </span>
        </div>
      )}
    </div>
  );
}
