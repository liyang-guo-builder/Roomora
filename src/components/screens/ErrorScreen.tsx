"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useFlow } from "@/components/flow/FlowProvider";
import { Btn, Icon, Hex } from "@/components/ui";

export function ErrorScreen() {
  const { t } = useT();
  const router = useRouter();
  const { doGenerate } = useFlow();
  return (
    <div className="px-5 pt-14 pb-10 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-3xl bg-danger-tint flex items-center justify-center text-danger mb-5">
        <Icon name="refresh" size={34} />
      </div>
      <h2 className="text-[20px] font-semibold text-ink">{t("That didn’t come out right", "这次没有生成成功")}</h2>
      <p className="mt-2 text-[14px] text-ink-2 max-w-[32ch]">
        {t(
          "Something went wrong on our side — so we’ve put your credit back. Let’s try that again.",
          "是我们这边出了点问题 —— 积分已退回。我们再试一次。",
        )}
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-sage bg-sage-tint px-3 py-1.5 rounded-full">
        <Hex size={13} /> +1 {t("credit refunded", "积分已退回")}
      </div>
      <Btn variant="primary" size="lg" icon="refresh" className="mt-6" onClick={() => void doGenerate()}>
        {t("Try again", "重新尝试")}
      </Btn>
      <Btn variant="ghost" size="md" className="mt-1" onClick={() => router.push("/setup")}>
        {t("Change the design", "修改设计方向")}
      </Btn>
    </div>
  );
}
