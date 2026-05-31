/* Roomora — service registry. Swap these bindings for real impls in Phase 2/3. */
export * from "./types";
export {
  authService,
  creditsService,
  generationService,
  paymentService,
  designsService,
  forceNextGenerationFailure,
} from "./mock";
