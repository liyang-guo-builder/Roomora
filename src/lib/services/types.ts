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
  /** The user's room photo as a data URI (Phase 3). null falls back to no image. */
  roomPhoto: string | null;
  style: StyleId;
  note: string;
  budget: BudgetId | null;
}

export interface RefineInput {
  result: GenerationResult;
  note: string;
}

/** Raised when the server rejects a generation for lack of credits (HTTP 402). */
export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

export interface GenerationService {
  /**
   * Submit a generation job. Resolves with a result or rejects on failure.
   * Throws InsufficientCreditsError when the server returns 402.
   * `balance` (when present) is the server-authoritative credit balance.
   */
  generate(input: GenerateInput): Promise<GenerationResult & { balance: number | null }>;
  /** Apply a refine instruction, appending a new version to the result. */
  refine(input: RefineInput): Promise<GenerationResult & { balance: number | null }>;
}

export interface PurchaseResult {
  added: number;
}

export interface PaymentService {
  packs: CreditPack[];
  purchase(packIndex: number, method: "card" | "wechat"): Promise<PurchaseResult>;
}

export interface DesignsService {
  /** The current user's saved designs, newest first. */
  list(): Promise<SavedDesign[]>;
  /** Flag a persisted generation as saved. Resolves on success. */
  save(generationId: string): Promise<void>;
  /** Remove a design from the user's saved list (unflag). */
  unsave(generationId: string): Promise<void>;
}
