# Roomora — Decisions Log

## D1. Generation engine: Qwen-Image-Edit on fal.ai (DECIDED 2026-05-31)
**Question:** Which image model can restyle a user's room while preserving its architecture (the core promise) and obey targeted edits?

**Spike result (tested on the real Paris test room photo):**
- **MiniMax image-01** (subject_reference, type "character"): generated beautiful but *unfaithful* images — invented new windows, moved shelves, changed floor; ignored the "only change the sofa" instruction entirely. Capability mismatch (subject consistency, not structural editing). **Rejected.** (Host note: MiniMax key works only against `api.minimaxi.com`.)
- **Qwen-Image-Edit** (`fal-ai/qwen-image-edit`): preserved the exact three-panel shuttered window, built-in left shelves, parquet floor, chair, walls and proportions on full restyle; on the targeted edit it added only the requested sofa and left everything else (even a cardboard box) untouched. ~6-7s, ~€0.02/image. **Chosen.**

**Implications:**
- `generationService` (Phase 3) calls fal `fal-ai/qwen-image-edit`: POST `https://fal.run/fal-ai/qwen-image-edit`, header `Authorization: Key <FAL_KEY>`, body `{ prompt, image_url (base64 data URI ok), num_inference_steps:30, guidance_scale:4, output_format:'png' }`; result at `images[0].url`. Server-side only.
- Restyle = style-specific prompt + "keep architecture identical" clause. Refine = instruction-style prompt ("change X, keep everything else") — Qwen obeys this natively, which is our differentiator.
- Economics: ~€0.02 COGS vs €0.25/credit ≈ 92% gross margin.
- Consider `acceleration` tuning and a quality pass on prompt templates per style during Phase 3.

## D2. (open) Default branch is `master`
Repo pushed to `master`; plan referenced `main`. Low priority — align when wiring Vercel production branch.
