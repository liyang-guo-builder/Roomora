/* Roomora — service registry.
   Phase 2: auth + credits real (Supabase). Phase 3: generation real
   (/api/generate → Qwen-Image-Edit on fal). Payment/designs stay mock (Phase 4). */
export * from "./types";

// Real Supabase-backed services.
export { authService, creditsService } from "./supabase";

// Real generation (Phase 3).
export { generationService } from "./generation";

// Still mock (Phase 4).
export {
  paymentService,
  designsService,
  forceNextGenerationFailure,
} from "./mock";
