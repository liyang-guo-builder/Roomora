"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useT } from "@/lib/i18n";
import { RoomPhoto } from "./RoomPhoto";
import { Icon } from "./Icon";

/** Real interactive Before/After comparison slider. Pointer + touch.
 *  Pass beforeUrl/afterUrl to show real images; falls back to tonal placeholders. */
export function BeforeAfter({
  height = 300,
  label,
  watermark,
  className = "",
  beforeUrl,
  afterUrl,
}: {
  height?: number;
  label?: string;
  watermark?: boolean;
  className?: string;
  beforeUrl?: string | null;
  afterUrl?: string | null;
}) {
  const { t } = useT();
  const [pos, setPos] = useState(54);
  const [baseW, setBaseW] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Measure the container so the clipped "before" layer keeps full width
  // (instead of squishing as the clip shrinks).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBaseW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const apply = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(3, Math.min(97, p)));
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    apply(e.clientX);
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) apply(e.clientX);
  };
  const onUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      className={`relative select-none overflow-hidden rounded-[20px] touch-none cursor-ew-resize shadow-soft ${className}`}
      style={{ height }}
    >
      {/* AFTER (base, right side) */}
      {afterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={afterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <RoomPhoto
          variant="after"
          rounded="rounded-none"
          tag={false}
          className="absolute inset-0 w-full h-full"
          label={label}
        />
      )}
      {/* BEFORE (clipped from left to pos) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <div style={{ width: baseW || "100vw", height: "100%" }}>
          {beforeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={beforeUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ width: baseW || "100vw", height: "100%" }}
            />
          ) : (
            <RoomPhoto variant="before" rounded="rounded-none" tag={false} className="w-full h-full" />
          )}
        </div>
      </div>

      {/* labels */}
      <span className="absolute left-3 bottom-3 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/35 text-white backdrop-blur-sm z-10">
        {t("Before", "原图")} · {t("your room", "你的房间")}
      </span>
      <span className="absolute right-3 bottom-3 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sage/90 text-paper backdrop-blur-sm z-10">
        {t("After", "新设计")}
      </span>

      {watermark && (
        <span className="absolute right-3 top-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/25 text-white backdrop-blur-sm z-10 flex items-center gap-1">
          <span className="font-bold">R</span> Roomora
        </span>
      )}

      {/* divider + handle */}
      <div
        className="absolute top-0 bottom-0 z-20"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-[3px] h-full bg-white/90 shadow-[0_0_10px_rgba(0,0,0,.3)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.3)] flex items-center justify-center">
          <Icon name="arrowLeft" size={14} stroke={2.4} className="text-ink -mr-0.5" />
          <Icon name="arrowRight" size={14} stroke={2.4} className="text-ink -ml-0.5" />
        </div>
      </div>
    </div>
  );
}
