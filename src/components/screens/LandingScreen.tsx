"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { readImageFile } from "@/lib/readImageFile";
import { Icon, type IconName } from "@/components/ui";

export function LandingScreen() {
  const { t } = useT();
  const router = useRouter();
  const setRoomPhoto = useStore((s) => s.setRoomPhoto);
  const fileRef = useRef<HTMLInputElement>(null);

  const openPicker = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = await readImageFile(file);
    setRoomPhoto(uri);
    router.push("/setup");
  };

  const trust: [IconName, string][] = [
    ["home", t("Your layout", "保留格局")],
    ["eye", t("You preview", "先看后定")],
    ["heart", t("Free to try", "免费试用")],
  ];

  return (
    <div className="px-5 pb-8 pt-3">
      <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sage bg-sage-tint px-3 py-1.5 rounded-full mb-5">
        <Icon name="sparkle" size={14} />{" "}
        {t("First design free · no signup", "首张设计免费 · 无需注册")}
      </div>

      <h1 className="text-[30px] leading-[1.12] font-semibold tracking-[-.02em] text-ink text-balance">
        {t("Redesign your real room.", "重新设计你真实的房间，")}
        <br />
        <span className="text-sage">{t("It stays your room.", "它依然是你的房间。")}</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2 max-w-[34ch]">
        {t(
          "Same walls, windows and light — restyled into the look you love. You control what changes.",
          "相同的墙面、窗户与光线 —— 焕新成你向往的风格。一切由你掌控。",
        )}
      </p>

      {/* dropzone */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
      <button
        onClick={openPicker}
        className="mt-6 w-full rounded-[22px] border-2 border-dashed border-sage/45 bg-sage-tint/50 hover:bg-sage-tint transition-colors p-7 flex flex-col items-center text-center active:scale-[.99]"
      >
        <div className="w-16 h-16 rounded-2xl bg-sage text-paper flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(124,136,102,.9)] mb-4">
          <Icon name="camera" size={28} />
        </div>
        <div className="text-[16px] font-semibold text-ink">
          {t("Add a photo of your room", "上传你的房间照片")}
        </div>
        <div className="text-[13px] text-ink-2 mt-1">
          {t("Take a photo or upload from your library", "拍摄或从相册中选择")}
        </div>
      </button>
      <p className="text-center text-[11.5px] text-ink-3 mt-2.5">
        {t("JPG or PNG · your photo is private", "JPG 或 PNG · 照片仅你可见")}
      </p>

      {/* proof thumbnails */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-ink">
          {t("Real rooms, restyled", "真实房间，焕新效果")}
        </h2>
        <span className="text-[12.5px] text-ink-3">{t("Drag to compare", "拖动对比")}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[
          { id: "scandi", after: "/examples/proof_scandi.png" },
          { id: "japandi", after: "/examples/proof_japandi.jpg" },
          { id: "boho", after: "/examples/proof_boho.jpg" },
        ].map((ex) => (
          <div key={ex.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-card">
            {/* after (full) */}
            <Image src={ex.after} alt="" fill sizes="33vw" className="object-cover" />
            {/* before (left half, clipped to align with the after) */}
            <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
              <div className="relative h-full w-[200%]">
                <Image src="/examples/room-before.jpg" alt="" fill sizes="33vw" className="object-cover" />
              </div>
            </div>
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/85" />
          </div>
        ))}
      </div>

      {/* trust row */}
      <div className="mt-7 grid grid-cols-3 gap-3 text-center">
        {trust.map(([ic, lab]) => (
          <div key={lab} className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center text-sage">
              <Icon name={ic} size={18} />
            </div>
            <span className="text-[11.5px] text-ink-2 leading-tight">{lab}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
