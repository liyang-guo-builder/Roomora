/* Roomora — real generation service (Phase 3).
   Calls the server-authoritative /api/generate route (which spends credits,
   runs Qwen-Image-Edit on fal, and persists the result). Behind the same
   typed interface the mock used. */

"use client";

import type {
  GenerationService,
  GenerateInput,
  RefineInput,
} from "./types";
import { InsufficientCreditsError } from "./types";
import type { GenerationResult, GenerationVersion } from "../types";

interface GenerateResponse {
  generationId: string;
  originalUrl: string | null;
  resultUrl: string | null;
  balance: number | null;
}

async function callGenerate(payload: Record<string, unknown>): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 402) throw new InsufficientCreditsError();
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail ?? "generation_failed");
  }
  return (await res.json()) as GenerateResponse;
}

export const generationService: GenerationService = {
  async generate(input: GenerateInput) {
    const data = await callGenerate({
      mode: "restyle",
      imageBase64: input.roomPhoto ?? undefined,
      style: input.style,
      note: input.note,
      budget: input.budget,
    });
    const version: GenerationVersion = {
      id: data.generationId,
      variant: "after",
      refineNote: null,
      resultUrl: data.resultUrl,
    };
    const result: GenerationResult & { balance: number | null } = {
      jobId: data.generationId,
      styleId: input.style,
      originalUrl: data.originalUrl,
      versions: [version],
      generationId: data.generationId,
      balance: data.balance,
    };
    return result;
  },

  async refine(input: RefineInput) {
    // The parent is the most recent version of the current result.
    const versions = input.result.versions;
    const parentId = versions[versions.length - 1]?.id;
    const data = await callGenerate({
      mode: "refine",
      parentId,
      note: input.note,
      style: input.result.styleId,
    });
    const next: GenerationVersion = {
      id: data.generationId,
      variant: "after",
      refineNote: input.note,
      resultUrl: data.resultUrl,
    };
    const result: GenerationResult & { balance: number | null } = {
      ...input.result,
      originalUrl: input.result.originalUrl ?? data.originalUrl,
      versions: [...versions, next],
      // Latest version is what Save flags; track its persisted id.
      generationId: data.generationId,
      balance: data.balance,
    };
    return result;
  },
};
