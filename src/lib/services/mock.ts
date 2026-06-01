/* Roomora — mock service implementations (Phase 1).
   Reproduce the prototype's behavior; real backends replace these later. */

import type {
  AuthService,
  AuthSession,
  AuthProvider,
  CreditsService,
  GenerationService,
  GenerateInput,
  RefineInput,
  PaymentService,
  PurchaseResult,
  DesignsService,
} from "./types";
import type { GenerationResult, GenerationVersion, CreditPack, SavedDesign } from "../types";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/* ── auth ── */
export const authService: AuthService = {
  async signIn(provider: AuthProvider, email?: string): Promise<AuthSession> {
    await wait(400);
    return {
      userId: uid(),
      email: provider === "email" ? (email ?? null) : null,
      grantedCredits: 3, // +3 on first sign-in
    };
  },
  async signOut(): Promise<void> {
    await wait(150);
  },
};

/* ── credits ──
   The authoritative balance lives in the Zustand store on the client for now.
   These methods are thin and stateless; the store applies the deltas. */
export const creditsService: CreditsService = {
  async balance(): Promise<number> {
    return 0;
  },
  async spend(n = 1): Promise<number> {
    return n;
  },
  async refund(n = 1): Promise<number> {
    return n;
  },
  async grant(n: number): Promise<number> {
    return n;
  },
};

/* ── generation ──
   Structured so a real `POST /api/generate` slots in here trivially in Phase 3:
   replace the wait()+resolve with a fetch + poll loop returning the same shape. */
const GEN_LATENCY_MS = 2900;
const GEN_FAIL_RATE = 0; // deterministic success in mock; flip per-call via failNext

let failNext = false;
/** Test/edge-state hook: force the next generate() to fail (refund path). */
export function forceNextGenerationFailure() {
  failNext = true;
}

export const generationService: GenerationService = {
  async generate(input: GenerateInput): Promise<GenerationResult & { balance: number | null }> {
    await wait(GEN_LATENCY_MS);
    if (failNext || Math.random() < GEN_FAIL_RATE) {
      failNext = false;
      throw new Error("generation_failed");
    }
    const original: GenerationVersion = {
      id: uid(),
      variant: "after",
      refineNote: null,
    };
    return {
      jobId: uid(),
      styleId: input.style,
      versions: [original],
      balance: null,
    };
  },

  async refine(input: RefineInput): Promise<GenerationResult & { balance: number | null }> {
    await wait(GEN_LATENCY_MS);
    const next: GenerationVersion = {
      id: uid(),
      variant: "after",
      refineNote: input.note,
    };
    return {
      ...input.result,
      versions: [...input.result.versions, next],
      balance: null,
    };
  },
};

/* ── payment ── */
const PACKS: CreditPack[] = [
  { c: 20, eur: 5, cny: 38 },
  { c: 60, eur: 12, cny: 92, best: true },
  { c: 150, eur: 25, cny: 188 },
];

export const paymentService: PaymentService = {
  packs: PACKS,
  async purchase(packIndex: number): Promise<PurchaseResult> {
    await wait(300);
    const pack = PACKS[packIndex] ?? PACKS[0];
    return { added: pack.c };
  },
};

/* ── designs ── */
const SEED_DESIGNS: SavedDesign[] = [
  { id: uid(), styleId: "scandi", location: "Paris 14e" },
  { id: uid(), styleId: "cream", location: "Paris 14e" },
  { id: uid(), styleId: "japandi", location: "Paris 14e" },
  { id: uid(), styleId: "wood", location: "Paris 14e" },
  { id: uid(), styleId: "boho", location: "Paris 14e" },
  { id: uid(), styleId: "modern", location: "Paris 14e" },
];

export const designsService: DesignsService = {
  async list(): Promise<SavedDesign[]> {
    await wait(150);
    return SEED_DESIGNS;
  },
  async save(design): Promise<SavedDesign> {
    await wait(150);
    return { ...design, id: uid() };
  },
};
