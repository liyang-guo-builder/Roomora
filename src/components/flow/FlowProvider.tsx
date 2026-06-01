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
import { anonTrialUsed, markAnonTrialUsed } from "@/lib/anonTrial";
import {
  authService,
  creditsService,
  generationService,
  paymentService,
  designsService,
  forceNextGenerationFailure,
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
  doDownload: () => void;
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
    // Anonymous trial: first generation is free (no signup, no server credit).
    // A second generation requires sign-in.
    if (anon) {
      if (anonTrialUsed()) {
        openModal("auth", { reason: "free" });
        return;
      }
      markAnonTrialUsed();
      router.push("/generating");
      try {
        const result = await generationService.generate({
          roomPhoto: null,
          style: setup.style ?? "scandi",
          note: setup.note,
          budget: setup.budget,
        });
        setResult(result);
        router.push("/result");
      } catch {
        router.push("/error"); // no server credit spent → nothing to refund
      }
      return;
    }

    // Signed in: spend a real server credit (RPC), refund on failure.
    if (credits < 1) {
      openModal("buy");
      return;
    }
    let newBalance: number;
    try {
      newBalance = await creditsService.spend(1);
    } catch {
      openModal("buy"); // insufficient credits / RPC error
      return;
    }
    setCredits(newBalance);
    router.push("/generating");
    try {
      const result = await generationService.generate({
        roomPhoto: null,
        style: setup.style ?? "scandi",
        note: setup.note,
        budget: setup.budget,
      });
      setResult(result);
      router.push("/result");
    } catch {
      try {
        const refunded = await creditsService.refund(1);
        setCredits(refunded);
      } catch {
        refund(1); // optimistic local refund if RPC fails
      }
      router.push("/error");
    }
  }, [anon, credits, refund, setCredits, router, setup, setResult, openModal]);

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

  const doDownload = useCallback(() => {
    if (anon) {
      openModal("auth", { reason: "save" });
      return;
    }
    showToast(t("Downloaded", "已下载"), "download");
  }, [anon, showToast, t, openModal]);

  const doApplyRefine = useCallback(
    async (note: string) => {
      // Refine requires auth (it consumes a real server credit).
      if (anon) {
        openModal("auth", { reason: "free" });
        return;
      }
      if (credits < 1) {
        openModal("buy");
        return;
      }
      const result = useStore.getState().result;
      if (!result) return;
      let newBalance: number;
      try {
        newBalance = await creditsService.spend(1);
      } catch {
        openModal("buy");
        return;
      }
      setCredits(newBalance);
      router.push("/generating");
      try {
        const next = await generationService.refine({ result, note });
        // append only the newest version onto current store result
        const newest = next.versions[next.versions.length - 1];
        setResult(result);
        appendVersion(newest);
        router.push("/result");
      } catch {
        try {
          const refunded = await creditsService.refund(1);
          setCredits(refunded);
        } catch {
          refund(1);
        }
        router.push("/error");
      }
    },
    [anon, credits, refund, setCredits, router, setResult, appendVersion, openModal],
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
