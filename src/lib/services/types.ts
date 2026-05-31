/* Roomora — service interface contracts.
   Phase 1 ships mock implementations; real backends drop in behind these. */

import type {
  StyleId,
  BudgetId,
  GenerationResult,
  CreditPack,
  SavedDesign,
} from "../types";

export type AuthProvider = "google" | "wechat" | "email";

export interface AuthSession {
  userId: string;
  email: string | null;
  /** Credits granted on first sign-in (e.g. +3). */
  grantedCredits: number;
}

export interface AuthService {
  /** Sign in with the given provider. WeChat is a deferred placeholder. */
  signIn(provider: AuthProvider, email?: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export interface CreditsService {
  balance(): Promise<number>;
  spend(n?: number): Promise<number>;
  refund(n?: number): Promise<number>;
  grant(n: number): Promise<number>;
}

export interface GenerateInput {
  /** Placeholder; a real photo blob/URL slots in here in Phase 3. */
  roomPhoto: string | null;
  style: StyleId;
  note: string;
  budget: BudgetId | null;
}

export interface RefineInput {
  result: GenerationResult;
  note: string;
}

export interface GenerationService {
  /** Submit a generation job. Resolves with a result (~2.9s) or rejects on failure. */
  generate(input: GenerateInput): Promise<GenerationResult>;
  /** Apply a refine instruction, appending a new version to the result. */
  refine(input: RefineInput): Promise<GenerationResult>;
}

export interface PurchaseResult {
  added: number;
}

export interface PaymentService {
  packs: CreditPack[];
  purchase(packIndex: number, method: "card" | "wechat"): Promise<PurchaseResult>;
}

export interface DesignsService {
  list(): Promise<SavedDesign[]>;
  save(design: Omit<SavedDesign, "id">): Promise<SavedDesign>;
}
