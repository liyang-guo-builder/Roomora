"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { readImageFile } from "@/lib/readImageFile";
import { Icon } from "@/components/ui";
import { BeforeAfter } from "@/components/ui/BeforeAfter";

const EXAMPLES = [
  { id: "scandi", en: "Scandinavian", zh: "北欧风", after: "/examples/proof_scandi.png" },
  { id: "japandi", en: "Japandi", zh: "日式简约", after: "/examples/proof_japandi.jpg" },
  { id: "boho", en: "Bohemian", zh: "波西米亚", after: "/examples/proof_boho.jpg" },
];

export function LandingScreen() {
  const { t, lang } = useT();
  const router = useRouter();
  const setRoomPhoto = useStore((s) => s.setRoomPhoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sel, setSel] = useState(0);

  const openPicker = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = await readImageFile(file);
    setRoomPhoto(uri);
    router.push("/setup");
  };

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
          "Same walls, windows and light, restyled into the look you love. You control what changes.",
          "相同的墙面、窗户与光线，焕新成你向往的风格。一切由你掌控。",
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

      {/* interactive proof — same room, switch styles, drag to compare */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-ink">
          {t("Real rooms, restyled", "真实房间，焕新效果")}
        </h2>
        <span className="text-[12.5px] text-ink-3">{t("Drag to compare", "拖动对比")}</span>
      </div>
      <div className="mt-3 flex gap-2">
        {EXAMPLES.map((ex, idx) => (
          <button
            key={ex.id}
            onClick={() => setSel(idx)}
            className={`flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-medium border transition-colors active:scale-[.98] ${
              idx === sel
                ? "bg-sage text-paper border-sage"
                : "bg-surface text-ink-2 border-line hover:border-sage/50"
            }`}
          >
            {lang === "en" ? ex.en : ex.zh}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <BeforeAfter
          beforeUrl="/examples/room-before.jpg"
          afterUrl={EXAMPLES[sel].after}
          height={280}
        />
      </div>

    </div>
  );
}
