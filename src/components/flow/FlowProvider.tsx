"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useAuthSync } from "@/lib/useAuthSync";
import {
  authService,
  creditsService,
  generationService,
  paymentService,
  mockPaymentService,
  designsService,
  forceNextGenerationFailure,
  InsufficientCreditsError,
  AnonTrialUsedError,
  StripeNotConfiguredError,
} from "@/lib/services";
import type { AuthReason, ModalKind } from "@/lib/types";
import type { IconName } from "@/components/ui";

interface ToastState {
  msg: string;
  icon: IconName;
}

interface FlowContextValue {
  /* modal + toast */
  modal: ModalKind;
  authReason: AuthReason;
  forceOut: boolean;
  toast: ToastState | null;
  openModal: (m: Exclude<ModalKind, null>, opts?: { reason?: AuthReason; forceOut?: boolean }) => void;
  closeModal: () => void;
  showToast: (msg: string, icon: IconName) => void;

  /* mock action handlers */
  doGenerate: () => Promise<void>;
  doSave: () => Promise<void>;
  doDownload: (url?: string | null) => void;
  doApplyRefine: (note: string) => Promise<void>;
  onAuthed: (provider: "google" | "email", email?: string) => Promise<void>;
  doPurchase: (packIndex: number) => Promise<void>;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}

export function FlowProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useT();

  // Keep the store mirrored to the real Supabase session + credit balance.
  useAuthSync();

  const credits = useStore((s) => s.credits);
  const refund = useStore((s) => s.refund);
  const setCredits = useStore((s) => s.setCredits);
  const incSaved = useStore((s) => s.incSaved);
  const anon = useStore((s) => s.anon);
  const anonTrialRemaining = useStore((s) => s.anonTrialRemaining);
  const consumeAnonTrial = useStore((s) => s.consumeAnonTrial);
  const setCurrentSaved = useStore((s) => s.setCurrentSaved);
  const setResult = useStore((s) => s.setResult);
  const appendVersion = useStore((s) => s.appendVersion);
  const setup = useStore((s) => s.setup);

  const [modal, setModal] = useState<ModalKind>(null);
  const [authReason, setAuthReason] = useState<AuthReason>("save");
  const [forceOut, setForceOut] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, icon: IconName) => {
    setToast({ msg, icon });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const openModal: FlowContextValue["openModal"] = useCallback((m, opts) => {
    if (m === "auth") setAuthReason(opts?.reason ?? "save");
    if (m === "buy") setForceOut(opts?.forceOut ?? false);
    setModal(m);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const doGenerate = useCallback(async () => {
    const { roomPhoto, inspirationPhoto } = useStore.getState();

    // "Match a photo" tab restyles the user's room to match an uploaded
    // inspiration; the browse tab uses a curated style. Both cost 1 credit /
    // 1 free design and run the same single-image edit on the user's room.
    const isMatch = setup.tab === "match";
    const genInput = {
      roomPhoto,
      style: setup.style ?? "scandi",
      note: setup.note,
      budget: setup.budget,
      mode: isMatch ? ("match" as const) : ("restyle" as const),
      inspirationBase64: isMatch ? inspirationPhoto : null,
    };

    // Anonymous trial: 1 free design, no signup. The SERVER is the gate
    // (device cookie + IP, see /api/generate); the client counter is just a
    // display hint. The free design is consumed only on SUCCESS.
    if (anon) {
      if (anonTrialRemaining <= 0) {
        openModal("auth", { reason: "free" });
        return;
      }
      router.push("/generating");
      try {
        const result = await generationService.generate(genInput);
        consumeAnonTrial();
        setResult(result);
        router.push("/result");
      } catch (err) {
        if (err instanceof AnonTrialUsedError) {
          // Server says the free trial is used up → prompt sign-up.
          openModal("auth", { reason: "free" });
          return;
        }
        router.push("/error"); // no free design consumed → nothing to refund
      }
      return;
    }

    // Signed in: the SERVER spends the credit (inside /api/generate) and
    // refunds on failure. Client only mirrors the returned balance.
    if (credits < 1) {
      openModal("buy");
      return;
    }
    router.push("/generating");
    try {
      const result = await generationService.generate(genInput);
      if (typeof result.balance === "number") setCredits(result.balance);
      setResult(result);
      router.push("/result");
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        openModal("buy"); // server refused for lack of credits
        return;
      }
      // Server already refunded; reload the authoritative balance.
      try {
        setCredits(await creditsService.balance());
      } catch {
        refund(1);
      }
      router.push("/error");
    }
  }, [
    anon,
    anonTrialRemaining,
    consumeAnonTrial,
    credits,
    refund,
    setCredits,
    router,
    setup,
    setResult,
    openModal,
  ]);

  const doSave = useCallback(async () => {
    if (anon) {
      openModal("auth", { reason: "save" });
      return;
    }
    const generationId = useStore.getState().result?.generationId;
    if (!generationId) {
      showToast(t("Nothing to save yet", "暂无可保存的设计"), "info");
      return;
    }
    // Optimistic UI: flip the heart + counter, then persist server-side.
    setCurrentSaved(true);
    incSaved();
    try {
      await designsService.save(generationId);
      showToast(t("Saved to My Designs", "已保存到我的设计"), "heartFill");
    } catch {
      // Roll back optimistic state on failure.
      setCurrentSaved(false);
      showToast(t("Couldn’t save, try again", "保存失败，请重试"), "info");
    }
  }, [anon, setCurrentSaved, incSaved, showToast, t, openModal]);

  const doDownload = useCallback(
    async (url?: string | null) => {
      if (anon) {
        openModal("auth", { reason: "save" });
        return;
      }
      const href = url ?? useStore.getState().result?.versions.at(-1)?.resultUrl ?? null;
      if (!href) return;
      try {
        // Fetch the image bytes so we can truly save it (a cross-origin <a
        // download> is ignored by browsers and just opens the image in a tab).
        const blob = await (await fetch(href)).blob();
        const file = new File([blob], "roomora-design.png", {
          type: blob.type || "image/png",
        });
        const nav = navigator as Navigator & {
          canShare?: (d?: { files?: File[] }) => boolean;
          share?: (d: { files?: File[]; title?: string }) => Promise<void>;
        };
        const coarse =
          typeof window !== "undefined" &&
          window.matchMedia?.("(pointer: coarse)").matches;
        // Phone/tablet: native share sheet → "Save Image" to the photo gallery.
        if (coarse && nav.share && nav.canShare?.({ files: [file] })) {
          try {
            await nav.share({ files: [file], title: "Roomora design" });
          } catch {
            /* user dismissed the share sheet */
          }
          return;
        }
        // Desktop: real download to the Downloads folder via a blob URL.
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "roomora-design.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        showToast(t("Saved to your device", "已保存到设备"), "download");
      } catch {
        // Last resort: open the image so the user can long-press to save it.
        window.open(href, "_blank", "noopener");
        showToast(t("Long-press the image to save it", "长按图片即可保存"), "info");
      }
    },
    [anon, showToast, t, openModal],
  );

  const doApplyRefine = useCallback(
    async (note: string) => {
      const result = useStore.getState().result;
      if (!result) return;

      // Anonymous: a refine also uses one free design (consumed on success).
      if (anon) {
        if (anonTrialRemaining <= 0) {
          openModal("auth", { reason: "free" });
          return;
        }
        router.push("/generating");
        try {
          const next = await generationService.refine({ result, note });
          consumeAnonTrial();
          const newest = next.versions[next.versions.length - 1];
          setResult(result);
          appendVersion(newest);
          router.push("/result");
        } catch (err) {
          if (err instanceof AnonTrialUsedError) {
            openModal("auth", { reason: "free" });
            return;
          }
          router.push("/error");
        }
        return;
      }

      // Signed in: server spends/refunds a real credit.
      if (credits < 1) {
        openModal("buy");
        return;
      }
      router.push("/generating");
      try {
        const next = await generationService.refine({ result, note });
        if (typeof next.balance === "number") setCredits(next.balance);
        // append only the newest version onto current store result
        const newest = next.versions[next.versions.length - 1];
        setResult(result);
        appendVersion(newest);
        router.push("/result");
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          openModal("buy");
          return;
        }
        try {
          setCredits(await creditsService.balance());
        } catch {
          refund(1);
        }
        router.push("/error");
      }
    },
    [
      anon,
      anonTrialRemaining,
      consumeAnonTrial,
      credits,
      refund,
      setCredits,
      router,
      setResult,
      appendVersion,
      openModal,
    ],
  );

  const onAuthed = useCallback(
    async (provider: "google" | "email", email?: string) => {
      if (provider === "email") {
        if (!email) return;
        try {
          await authService.signIn("email", email);
          closeModal();
          // Magic link: no immediate session — the user must click the email.
          // The real session (and +3 credits for new users) lands via
          // /auth/callback, which onAuthStateChange picks up.
          showToast(t("Check your email for a magic link", "请查收登录链接"), "mail");
        } catch {
          showToast(t("Couldn’t send the link, try again", "发送失败，请重试"), "info");
        }
        return;
      }
      // Google OAuth: redirect to Google → back to /auth/callback (which
      // exchanges the code). New users get +3 credits via the signup trigger.
      // Won't complete until the Supabase Google provider is configured.
      try {
        await authService.signIn("google");
        // The browser navigates away on success; nothing more to do here.
      } catch {
        showToast(
          t("Google sign-in isn’t available yet", "Google 登录暂不可用"),
          "info",
        );
      }
    },
    [closeModal, showToast, t],
  );

  const doPurchase = useCallback(
    async (packIndex: number) => {
      // Real payment: ask the server for a Stripe Checkout url and redirect.
      // The payment method (card / WeChat Pay / Alipay) is chosen on Stripe's
      // hosted page, not here. Credits are granted server-side by the webhook on
      // payment success, so we do NOT bump the balance here. On returning to
      // /account?purchase=success the balance refetches from the server.
      try {
        const { checkoutUrl } = await paymentService.purchase(packIndex);
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
      } catch (err) {
        if (!(err instanceof StripeNotConfiguredError)) {
          showToast(t("Couldn’t start checkout, try again", "无法发起支付，请重试"), "info");
          return;
        }
        // Stripe not configured (local/dev): fall back to the mock credit bump
        // so nothing crashes and the flow stays demoable.
      }

      const { added } = await mockPaymentService.purchase(packIndex);
      const amount = added ?? 0;
      try {
        const newBalance = await creditsService.grant(amount);
        setCredits(newBalance);
      } catch {
        // Anonymous or RPC failure — fall back to local grant for display.
        useStore.getState().grant(amount);
      }
      closeModal();
      showToast(t("Credits added", "积分已到账"), "check");
    },
    [setCredits, closeModal, showToast, t],
  );

  // referenced to keep the import meaningful for the error edge-state hook
  void forceNextGenerationFailure;

  const value: FlowContextValue = {
    modal,
    authReason,
    forceOut,
    toast,
    openModal,
    closeModal,
    showToast,
    doGenerate,
    doSave,
    doDownload,
    doApplyRefine,
    onAuthed,
    doPurchase,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}
