/* Roomora — service registry.
   Phase 2: auth + credits real (Supabase). Phase 3: generation real
   (/api/generate → Qwen-Image-Edit on fal). Phase 4: designs real
   (/api/designs → saved generations). Phase 6: payment real (Stripe checkout,
   with a graceful mock fallback when Stripe is not configured). */
export * from "./types";

// Real Supabase-backed services.
export {
  authService,
  creditsService,
  paymentService,
  StripeNotConfiguredError,
} from "./supabase";

// Real generation (Phase 3).
export { generationService } from "./generation";

// Real Save + My Designs (Phase 4).
export { designsService } from "./designs";

// Real "Shop this look" (Phase 5).
export { shopService } from "./shop";
export type { ShopItem, ShopProduct, ShopGroup, ShopResult, ItemizeResult } from "./shop";

// Mock payment service kept as the dev/local fallback when Stripe is unset.
export { paymentService as mockPaymentService } from "./mock";

// Generation edge-state test hook.
export { forceNextGenerationFailure } from "./mock";
