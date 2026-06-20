/* Roomora — shared domain types */

export type Lang = "en" | "zh";

export type SetupTab = "browse" | "match";

export type StyleId =
  | "scandi"
  | "japandi"
  | "cream"
  | "french"
  | "midcentury"
  | "americanvintage"
  | "wabisabi"
  | "wood"
  | "modern"
  | "quietluxury"
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
  /** Public URL of the real generated PNG (Phase 3). null on legacy/mock data. */
  resultUrl?: string | null;
}

/** Result of a generation/refine job. */
export interface GenerationResult {
  jobId: string;
  styleId: StyleId;
  versions: GenerationVersion[];
  /** Public URL of the user's real uploaded room photo (the "before"). */
  originalUrl?: string | null;
  /**
   * Id of the persisted `generations` row for the current (latest) version.
   * This is what Save flags. Mirrors the latest version's id from the server.
   */
  generationId?: string | null;
}

export interface CreditPack {
  c: number;
  eur: number;
  cny: number;
  best?: boolean;
}

/** A saved design returned by GET /api/designs (a flagged `generations` row). */
export interface SavedDesign {
  id: string;
  resultUrl: string | null;
  originalUrl: string | null;
  /** Style id as stored (string; may be null on legacy rows). */
  style: string | null;
  createdAt: string;
}

export type PayMethod = "card" | "wechat";

export type AuthReason = "save" | "free" | "default";

export type ModalKind = "auth" | "buy" | "share" | null;
