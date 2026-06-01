/* Roomora — service registry.
   Phase 2: auth + credits are real (Supabase). Generation/payment/designs
   stay on the typed mocks (Phase 3/4). Swap the remaining bindings later. */
export * from "./types";

// Real Supabase-backed services.
export { authService, creditsService } from "./supabase";

// Still mock (untouched).
export {
  generationService,
  paymentService,
  designsService,
  forceNextGenerationFailure,
} from "./mock";
