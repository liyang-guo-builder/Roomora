/* Roomora — real designs service (Phase 4).
   Save = flag a persisted generation; My Designs = list saved generations.
   Backed by the server-authoritative /api/designs route. Behind the same
   typed interface the mock used. */

"use client";

import type { DesignsService } from "./types";
import type { SavedDesign } from "../types";

export const designsService: DesignsService = {
  async list(): Promise<SavedDesign[]> {
    const res = await fetch("/api/designs", { method: "GET" });
    if (!res.ok) {
      // Signed out (401) or failure → no designs to show.
      return [];
    }
    return (await res.json()) as SavedDesign[];
  },

  async save(generationId: string): Promise<void> {
    const res = await fetch("/api/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationId }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error((detail as { error?: string }).error ?? "save_failed");
    }
  },
};
