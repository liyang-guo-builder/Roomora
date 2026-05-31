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
import {
  authService,
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

  const credits = useStore((s) => s.credits);
  const spend = useStore((s) => s.spend);
  const refund = useStore((s) => s.refund);
  const grant = useStore((s) => s.grant);
  const incSaved = useStore((s) => s.incSaved);
  const anon = useStore((s) => s.anon);
  const setAnon = useStore((s) => s.setAnon);
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
    if (credits < 1) {
      openModal("buy");
      return;
    }
    spend(1);
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
      refund(1); // refund on failure
      router.push("/error");
    }
  }, [credits, spend, refund, router, setup, setResult, openModal]);

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
      if (credits < 1) {
        openModal("buy");
        return;
      }
      const result = useStore.getState().result;
      if (!result) return;
      spend(1);
      router.push("/generating");
      try {
        const next = await generationService.refine({ result, note });
        // append only the newest version onto current store result
        const newest = next.versions[next.versions.length - 1];
        setResult(result);
        appendVersion(newest);
        router.push("/result");
      } catch {
        refund(1);
        router.push("/error");
      }
    },
    [credits, spend, refund, router, setResult, appendVersion, openModal],
  );

  const onAuthed = useCallback(
    async (provider: "google" | "email", email?: string) => {
      const session = await authService.signIn(provider, email);
      setAnon(false);
      closeModal();
      grant(session.grantedCredits);
      showToast(t("Signed in · +3 credits", "已登录 · +3 积分"), "check");
    },
    [setAnon, closeModal, grant, showToast, t],
  );

  const doPurchase = useCallback(
    async (packIndex: number, method: PayMethod) => {
      const { added } = await paymentService.purchase(packIndex, method);
      grant(added);
      closeModal();
      showToast(t("Credits added", "积分已到账"), "check");
    },
    [grant, closeModal, showToast, t],
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
