/* Roomora — shared domain types */

export type Lang = "en" | "zh";

export type SetupTab = "browse" | "match";

export type StyleId =
  | "scandi"
  | "japandi"
  | "cream"
  | "midcentury"
  | "wabisabi"
  | "wood"
  | "modern"
  | "newchinese"
  | "boho"
  | "industrial";

export type BudgetId = "low" | "mid" | "high" | "skip";

export interface SetupState {
  tab: SetupTab;
  style: StyleId | null;
  note: string;
  budget: BudgetId | null;
}

/** A single generated design version. */
export interface GenerationVersion {
  /** Stable id for the version. */
  id: string;
  /** Tonal-placeholder variant (always "after" for now). */
  variant: "after";
  /** Free-text refine instruction that produced this version (null = original). */
  refineNote: string | null;
}

/** Result of a generation/refine job. */
export interface GenerationResult {
  jobId: string;
  styleId: StyleId;
  versions: GenerationVersion[];
}

export interface CreditPack {
  c: number;
  eur: number;
  cny: number;
  best?: boolean;
}

export interface SavedDesign {
  id: string;
  styleId: StyleId;
  location: string;
}

export type PayMethod = "card" | "wechat";

export type AuthReason = "save" | "free" | "default";

export type ModalKind = "auth" | "buy" | "share" | null;
