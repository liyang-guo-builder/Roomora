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
  designsService,
  forceNextGenerationFailure,
  InsufficientCreditsError,
} from "@/lib/services";
import type { AuthReason, ModalKind, PayMethod } from "@/lib/types";
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
  doSave: () => void;
  doDownload: (url?: string | null) => void;
  doApplyRefine: (note: string) => Promise<void>;
  onAuthed: (provider: "google" | "email", email?: string) => Promise<void>;
  doPurchase: (packIndex: number, method: PayMethod) => Promise<void>;
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
    const roomPhoto = useStore.getState().roomPhoto;

    // Anonymous trial: a few free designs (no signup, no server credit).
    // The free design is consumed only on SUCCESS. (Server allows anon; client gates.)
    if (anon) {
      if (anonTrialRemaining <= 0) {
        openModal("auth", { reason: "free" });
        return;
      }
      router.push("/generating");
      try {
        const result = await generationService.generate({
          roomPhoto,
          style: setup.style ?? "scandi",
          note: setup.note,
          budget: setup.budget,
        });
        consumeAnonTrial();
        setResult(result);
        router.push("/result");
      } catch {
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
      const result = await generationService.generate({
        roomPhoto,
        style: setup.style ?? "scandi",
        note: setup.note,
        budget: setup.budget,
      });
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

  const doSave = useCallback(() => {
    if (anon) {
      openModal("auth", { reason: "save" });
      return;
    }
    setCurrentSaved(true);
    incSaved();
    void designsService.save({ styleId: setup.style ?? "scandi", location: "Paris 14e" });
    showToast(t("Saved to My Designs", "已保存到我的设计"), "heartFill");
  }, [anon, setCurrentSaved, incSaved, setup.style, showToast, t, openModal]);

  const doDownload = useCallback(
    (url?: string | null) => {
      if (anon) {
        openModal("auth", { reason: "save" });
        return;
      }
      const href = url ?? useStore.getState().result?.versions.at(-1)?.resultUrl ?? null;
      if (href) {
        const a = document.createElement("a");
        a.href = href;
        a.download = "roomora-design.png";
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      showToast(t("Downloaded", "已下载"), "download");
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
        } catch {
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
          showToast(t("Couldn’t send the link — try again", "发送失败，请重试"), "info");
        }
        return;
      }
      // Google OAuth not configured yet — keep as a designed placeholder.
      showToast(t("Google sign-in coming soon", "Google 登录即将上线"), "info");
    },
    [closeModal, showToast, t],
  );

  const doPurchase = useCallback(
    async (packIndex: number, method: PayMethod) => {
      // Payment stays mock; credits are granted via the real RPC so the
      // server ledger stays authoritative.
      const { added } = await paymentService.purchase(packIndex, method);
      try {
        const newBalance = await creditsService.grant(added);
        setCredits(newBalance);
      } catch {
        // Anonymous or RPC failure — fall back to local grant for display.
        useStore.getState().grant(added);
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
