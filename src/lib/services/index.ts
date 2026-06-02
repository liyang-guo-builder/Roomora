/* Roomora — service registry.
   Phase 2: auth + credits real (Supabase). Phase 3: generation real
   (/api/generate → Qwen-Image-Edit on fal). Phase 4: designs real
   (/api/designs → saved generations). Payment stays mock. */
export * from "./types";

// Real Supabase-backed services.
export { authService, creditsService } from "./supabase";

// Real generation (Phase 3).
export { generationService } from "./generation";

// Real Save + My Designs (Phase 4).
export { designsService } from "./designs";

// Still mock (payment).
export { paymentService, forceNextGenerationFailure } from "./mock";
