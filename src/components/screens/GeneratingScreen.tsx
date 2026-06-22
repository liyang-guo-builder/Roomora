"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon, type IconName } from "@/components/ui";
import { GEN_MSGS, STYLE_NAMES } from "@/lib/constants";

// The "designer at work" checklist — four steps the engine conceptually walks
// through. Icons are decorative; "done" steps swap to a check.
const STEPS: [string, string, IconName][] = [
  ["Reading your room", "读取你的房间", "eye"],
  ["Mapping the layout", "规划布局", "grid"],
  ["Choosing furniture", "挑选家具", "home"],
  ["Matching the light", "匹配灯光", "sparkle"],
];

export function GeneratingScreen() {
  const { t } = useT();
  const roomPhoto = useStore((s) => s.roomPhoto);
  const styleId = useStore((s) => s.setup.style) ?? "scandi";
  const [en, zh] = STYLE_NAMES[styleId] ?? STYLE_NAMES.scandi;

  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % GEN_MSGS.length), 2200);
    const id2 = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 4000);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, []);

  return (
    <div className="px-5 pt-6 pb-10">
      {/* scanning canvas: the user's real room, scanned by a sweeping band */}
      <div
        className="relative rounded-[22px] overflow-hidden h-[300px]"
        style={{ background: "linear-gradient(150deg,#bdbeb6,#a4a094)" }}
      >
        {roomPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={roomPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-ink/30" />
        {/* measuring grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(246,243,234,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(246,243,234,.14) 1px,transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        {/* sweeping scan band */}
        <div
          className="absolute top-0 bottom-0 w-[46%] scan-band"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(124,136,102,0) 30%,rgba(124,136,102,.55) 88%,rgba(231,235,223,.9))",
            borderRight: "2px solid rgba(255,255,255,.85)",
          }}
        />
        {/* corner reticles */}
        <span className="absolute top-3.5 left-3.5 w-5 h-5 border-2 border-white/80 border-r-0 border-b-0" />
        <span className="absolute top-3.5 right-3.5 w-5 h-5 border-2 border-white/80 border-l-0 border-b-0" />
        <span className="absolute bottom-3.5 left-3.5 w-5 h-5 border-2 border-white/80 border-r-0 border-t-0" />
        <span className="absolute bottom-3.5 right-3.5 w-5 h-5 border-2 border-white/80 border-l-0 border-t-0" />
        {/* center spinner + live caption */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 px-6 text-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-white/55 border-t-sage animate-spin" />
          <span
            key={i}
            className="text-[12.5px] font-semibold text-white drop-shadow transition-opacity duration-500"
          >
            {t(GEN_MSGS[i][0], GEN_MSGS[i][1])}
          </span>
        </div>
      </div>

      <div className="mt-6 text-center text-[17px] font-semibold text-ink">
        {t(`Designing your ${en} room`, `正在设计你的${zh}房间`)}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-[12.5px] text-ink-3">
        <Icon name="lock" size={14} />{" "}
        {t("Your walls, doors and layout stay as they are", "墙面、门窗与格局保持原样")}
      </div>

      {/* checklist — a designer working through your room */}
      <div className="mt-7 flex flex-col gap-3">
        {STEPS.map(([cen, czh, iconName], n) => {
          const state = n < step ? "done" : n === step ? "active" : "todo";
          return (
            <div key={cen} className="flex items-center gap-3">
              <div
                className={`w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 ${
                  state === "done"
                    ? "bg-sage text-paper"
                    : state === "active"
                      ? "bg-sage-tint text-sage ring-4 ring-sage/10"
                      : "bg-surface-sunk text-ink-3"
                }`}
              >
                <Icon name={state === "done" ? "check" : iconName} size={14} />
              </div>
              <span
                className={`text-[14px] font-medium ${
                  state === "done" ? "text-ink-2" : state === "active" ? "text-ink" : "text-ink-3"
                }`}
              >
                {t(cen, czh)}
              </span>
              <div className="flex-1 ml-1.5 h-1 rounded-full bg-surface-sunk overflow-hidden">
                <div
                  className={`h-full rounded-full bg-sage transition-[width] duration-700 ${
                    n < step ? "w-full" : n === step ? "w-2/3 animate-pulse" : "w-0"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[12px] text-ink-3">
        {t("Usually takes 10–20 seconds", "通常需要 10–20 秒")}
      </p>
    </div>
  );
}
