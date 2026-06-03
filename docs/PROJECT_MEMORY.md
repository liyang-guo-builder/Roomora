# Roomora — Project Memory

Session log. Append at the end of every session.

## Session 1 — 2026-05-31 — Day 1 setup
- Approved plan: Next.js 16 full-stack, free-credits-first, parallel kickoff. Plan file: `~/.claude/plans/here-is-the-claude-hashed-biscuit.md`.
- Scaffolded `roomora-app/` via create-next-app → **Next.js 16.2.6, React 19, Tailwind v4, TS, src dir, App Router**. Git initialized inside `roomora-app/`.
- Read Next 16 docs (server/client components, Tailwind v4 CSS `@theme`, `next/font`). Captured gotchas + Sauge Doré tokens + three-agent operating mode in `CLAUDE.md`.
- Added `.env.local.example`, `.env.test.example`.
- i18n decision: replicate prototype's inline `t(en,zh)` via a lightweight `useT()` hook over Zustand `lang` (not react-i18next), for fast, exact parity.
- Next: frontend dev sub-agent ports tokens/fonts/primitives/slider/all screens/modals/mock services (Tasks #2–#3). Engine spike (#4) waits on user keys + photos.

## Session 2 — 2026-05-31 — Phase 1 frontend + engine spike attempt
- **Frontend Phase 1 DONE** (frontend dev sub-agent): full handoff port to Next.js 16 — Sauge Doré tokens (Tailwind v4 @theme), Schibsted Grotesk + Noto Sans SC, all primitives + draggable before/after slider, 9 screens as App Router routes + Auth/Buy/Share modals, bilingual `t(en,zh)`, Zustand store, typed mock service layer. Verified: `tsc` clean, `build` green (11 routes), `lint` clean. Eyeballed landing + setup screenshots — faithful parity. No console errors.
- Committed + **pushed to GitHub** `paristennisbookingassistant-spec/Roomora` (branch `master`; machine had cached gh creds).
- Independent **tester** spawned (background) against local dev server (localhost:3000) vs prototype (localhost:8732) — 9 Phase-1 success criteria.
- **Engine spike (MiniMax): blocked on balance.** Key is valid but only against host `api.minimaxi.com` (NOT minimax.io). Account returns `1008 insufficient balance`. Recorded correct host in `.env.local` (MINIMAX_BASE_URL). Recommended pivot to **fal.ai + Qwen-Image-Edit** (structure-preserving, the research pick) — waiting on FAL_KEY.
- Supabase keys in `.env.local` (URL https://wakijejhpprftavrwipd.supabase.co). Backend not started yet.

## Session 2 (cont.) — Engine spike RESOLVED
- **Engine = Qwen-Image-Edit on fal.ai.** Spike on the real Paris room photo: Qwen preserved exact window/shelves/floor on restyle AND obeyed a targeted "only add a green sofa" edit (kept everything else, even the cardboard box). MiniMax failed both (invents rooms, ignores edits). See DECISIONS.md D1. fal funded with $10. Core technical risk retired.
- Spike artifacts in `../spike/` (qwen_restyle.png, qwen_edit-sofa.png = the proof).

## Session 2 (cont.) — Production deploy LIVE
- **https://roomora-gamma.vercel.app is live** with the real Phase 1 app (200, renders, no console errors).
- Deploy gotcha fixed: repo had app on `master` while Vercel deployed default `main` (README only) → 404. Merged init into app, pushed app to `main` (now the single deploy branch). Vercel project `roomora` had Framework Preset = "Other" (imported when main had only README) → added committed `vercel.json {"framework":"nextjs"}` and deployed via CLI.
- **Deploy control established**: Vercel CLI + token (in `.env.local` as VERCEL_TOKEN), linked to `leos-projects-11d290bd/roomora`. Deploy with `npx vercel --prod --yes --scope leos-projects-11d290bd --token $VERCEL_TOKEN`. Orchestrator can now deploy autonomously each phase.
- TODO Phase 2 deploy: add prod env vars via `vercel env add` (FAL_KEY, NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TEST_USER_EMAILS).

## Session 2 (cont.) — Phase 1 VERIFIED on production (CLOSED)
- Independent tester (against live https://roomora-gamma.vercel.app) → **PASS 9/9**: visual parity vs prototype, full flow (Landing→Setup→Generating→Result→Refine), slider drag, bilingual toggle, credit logic (12→spend→refund, danger ≤2), Auth/Buy/Share modals, bottom nav + Designs/Account, anon gating + mock +3 on sign-in.
- Tester flagged "CDN Tailwind / in-browser Babel" warnings — VERIFIED as misattribution from the prototype tab. Production HTML has no CDN/Babel, serves compiled `/_next/static`, no console messages. Production = real optimized Next build. ✅
- Phase 1 done. Next: Phase 2 backend — BLOCKED on a Supabase access token (sbp_...) to run migrations via Management API.

## Session 2 (cont.) — Phase 2 backend deployed
- Backend dev agent built Phase 2: @supabase/ssr clients + middleware, magic-link auth + /auth/callback, profiles + credit_transactions + spend/add RPCs + signup trigger (3 free credits), real auth/credits services (gen/designs still mock), anon 1-free-trial, gated /api/dev/login + /api/dev/reset. Migration applied via Management API.
- Verified: tsc/build/lint green; DB has both tables + 3 functions; dev-login on PROD returns real session cookie (tester@roomora.test), bad token 403, reset works.
- Configured Supabase Auth via Management API: site_url + redirect allowlist (prod + localhost /auth/callback).
- Committed + pushed (main) + deployed to prod via Vercel CLI. Prod env vars pre-loaded (Supabase x3, FAL_KEY, TEST_USER_EMAILS, ROOMORA_DEV_LOGIN_TOKEN).
- Phase 2 tester running against prod (focus: credits persist across reload = server-enforced).
- Dashboard TODO (not blocking): Google OAuth provider not configured (button is placeholder); default Supabase SMTP has rate limits (custom SMTP later for real magic-link volume).

## Session 2 (cont.) — Phase 3 real generation DEPLOYED
- Generation engineer agent built Phase 3: POST /api/generate (server-authoritative credit spend → upload to `rooms` bucket → fal Qwen-Image-Edit → store in `designs` → generations row; refund on failure), real photo-upload UI, real before/after, refine version chains. Migration 0002 (generations) applied; public rooms/designs buckets created.
- Verified locally + DB: real end-to-end test produced a real 1024² PNG, credit 12→11, generations row.
- **Prompt tuning (orchestrator):** v1 output was too timid (barely furnished). Added explicit FURNISH instruction + reworded ARCHITECTURE_LOCK (locks structure, permits furniture). Re-tested on the Paris room → fully furnished Scandinavian living room with window/shelves/chair/proportions preserved. Big quality jump. (`src/lib/prompts.ts`)
- tsc/build/lint green. Committed + pushed (main) + deployed to prod. Phase 3 tester running against prod (upload real photo → furnished same-room restyle → refine → credits).
- Known TODO: anonymous free-trial is client-gated only (server-side hardening commented in /api/generate); radiator-under-window sometimes added (minor, acceptable).

## Session 2 (cont.) — UX fixes from user testing
- **Loosened anon trial to 3 free designs** (counter in store, consumed only on SUCCESS; refine counts too). Pill shows "N free" for anon instead of misleading credits.
- **Fixed large-photo failure** (root cause: 6MB "Test image 2" base64 > Vercel ~4.5MB body limit → /api/generate failed → error screen). `readImageFile` now downscales to ≤1536px JPEG q0.85 client-side (also honors EXIF orientation). Verified: 6MB photo → real Scandinavian restyle, ~21s, no errors, "2 free".
- **Generating screen** now shows the user's actual photo (dimmed + shimmer) with constructive copy ("Designing your {style} room", step labels Layout/Furniture/Lighting/Details, "~10-20s").
- **Landing proof** now interactive: style toggle chips (Scandinavian/Japandi/Bohemian) + one large draggable BeforeAfter slider (was 3 static near-identical tiles).
- Style tiles + landing examples use real generated imagery (flux style tiles in /public/styles, qwen real-room before/afters in /public/examples).
- homedesigns.ai competitor research agent was running (may have completed) — pending review.

## Session 3 — 2026-06-02 — Cycle 2: Save/My Designs + Google sign-in
- **Save + My Designs (real):** reused `generations` table + `saved` column (migration 0003, applied via Management API) + own-row UPDATE RLS. Server route `/api/designs` (POST saves & claims orphaned anon rows; GET lists saved, newest-first). Real `designsService`; `generationId` threaded into store `result`; `doSave` optimistic + rollback; MyDesignsScreen fetches via TanStack Query. Verified locally (save round-trip, DB saved=true). tsc/build/lint green; deployed to prod.
- **Google sign-in:** code wired (`signInWithOAuth` in supabase.ts; onAuthed('google')). **Supabase Google provider CONFIGURED** via Management API (external_google_enabled=true, client_id/secret set; user's Google Cloud OAuth client, redirect URI = .../auth/v1/callback). Needs MANUAL user verification (headless can't complete Google OAuth); consent screen likely in "testing" mode → user must be a Google test user / may see "unverified app" → Advanced → proceed.
- Save/My Designs tester running against prod.
- Deferred next: Share → /share/[id] (RedNote lever, recommended next cycle); real payment; anon server-side hardening; WeChat; desktop parity.

## Session 3 (cont.) — UX polish from user testing
- **Home button**: header logo is now a Link to `/` on every screen; Result has a "Try another room" button; Save button shows persistent "Saved" + filled heart (not just a toast).
- **Em-dashes removed** from ALL UI strings (EN + Chinese ——), replaced with plain punctuation. Code comments + AI prompt left as-is.
- **Delete saved designs**: DELETE /api/designs (sets saved=false, own row) + designsService.unsave + ✕ button on My Designs tiles (TanStack Query invalidate). Verified on prod (2→1).
- **Generating screen**: replaced empty placeholder boxes with a 4-step progress bar (Layout/Furniture/Lighting/Details) over the dimmed user photo; constructive copy.
- **Variations hint**: "Tap to switch" only when >1 version, else "Refine to add more".
- **Landing**: removed redundant 3-icon trust row (interactive before/after carries proof).
- All deployed to prod, tsc/build/lint green each time.

## Session 3 (cont.) — Prompt fidelity fix + Share shipped
- **Prompt fidelity (founding promise):** Industrial (and other styles implying wall materials) were rebuilding the room (brick walls, arched window). FIX: rewrote STYLE_PROMPTS to describe FURNITURE & DECOR only (no brick/concrete/plaster wall instructions) + much stronger ARCHITECTURE_LOCK ("furnish, don't rebuild"; keep exact walls/windows/doors/floor/shape). Validated across ALL 10 styles via montage (spike/fidelity) + live industrial gen on prod — room structure preserved. `src/lib/prompts.ts`. buildRefinePrompt also hardened.
- **Share feature LIVE (task #10):** built in a PARALLEL session (with docs/GTM_PLAN.md + docs/HERO_CREATIVE.md). /api/share (opt-in shared=true), public /share/[id] page (before/after slider + OG tags + "Design your own, free" CTA), ShareModal wired (native share sheet + copy link), migration 0004 (shared column) applied. Verified on prod: share POST 200, /share/[id] renders publicly.
- **PROCESS NOTE:** my `git add -A` accidentally bundled+deployed the parallel Share work untested. It happened to be complete + building + migration applied, so OK — but switched to explicit `git add <paths>` after. Lesson: always `git status` before staging.
- Removed em-dashes from the new Share UI too.

## Session 3 (cont.) — Match-a-photo LIVE + Shop-this-look started
- **Match-a-photo DONE + verified on prod** (task #11): two-step (MiniMax style-only caption → single-image Qwen restyle). Setup "Match a photo" tab enabled (inspiration upload). Live test: Japandi inspiration on the test room kept exact window/shelves/parquet/chair + applied linen sofa, round table, paper-lantern lamp, soft rug. Committed + deployed.
- **Prompt fidelity** confirmed across all 10 styles (furniture-only descriptors + strong lock). buildMatchPrompt added.
- **Shop-this-look (Cycle 3, task #12) building** (background agent): products table + items jsonb migration (0005), sample Awin feed + ingestion, MiniMax `itemizeDesign` + `/api/shop` matcher, "Shop this look" panel on Result. Building against a SAMPLE feed; real Awin feed swaps in via `AWIN_FEED_URL` env on approval. Economics: free to us, retailer pays ~3-8% commission, ~sub-cent itemize cost/view, credits untouched. Plan = Cycle 3 in plan file.
- USER ACTION PENDING: create Awin publisher account + apply to Maisons du Monde & La Redoute → send publisher ID + feed URL.

## Session 3 (cont.) — Shop-this-look LIVE (sample feed)
- **Cycle 3 DONE + verified on prod** (task #12): products table + items jsonb (migration 0005, applied to prod Supabase), sample Awin feed (22 products) ingested, MiniMax `itemizeDesign` + `/api/shop` matcher (search_products SQL fn, OR-tsquery + ts_rank + budget bands), "Shop this look" collapsible panel on ResultScreen with affiliate buy cards + commission disclosure. Live test: /api/shop on a real design → 4 groups (sofa/coffee_table/rug/plant) with sensible matches (e.g. "round wooden coffee table" → Otto Round Walnut €329). Panel renders well.
- Itemization cached on generations.items. Cron route /api/cron/ingest-products gated by CRON_SECRET (returns 503 until set — safe/inert).
- **TO GO LIVE FOR REAL:** user creates Awin account + advertiser approvals → set `AWIN_FEED_URL` + `CRON_SECRET` in Vercel; nightly cron then refreshes real products. Zero code change.

## Session 4 — 2026-06-03 — Awin feed hardening (pre-connection de-risk)
- Reviewed full Awin pipeline ahead of connecting the real feed. Found a latent bug: both the cron parser (`src/lib/shop/feed.ts`) and CLI (`scripts/ingest-awin.mjs`) matched only the sample header `advertiser`, but real Awin Create-a-Feed exports use `merchant_name` (and vary id/image tokens). As written, a real feed would import every product as advertiser "unknown" and possibly imageless — breaking the "zero code change" promise.
- FIX: multi-candidate column resolver in both files (kept in sync). advertiser → [advertiser, merchant_name, advertiser_name]; image → [aw_image_url, merchant_image_url, large_image]; id → [aw_product_id, merchant_product_id, product_id]; price → [search_price, store_price, display_price]; cat → [merchant_category, category_name, merchant_product_category_path]; desc, brand also aliased. Sample feed still parses (22 products, advertiser=SampleHome, all categories normalized).
- Gates green (tsc/lint/build); committed (5a4e6e8) + pushed main + deployed to prod. Cron stays inert until CRON_SECRET set — no behavior change, no tester needed.
- **Still pending USER ACTION (the only blocker):** create Awin publisher account (£5 refundable deposit) → apply to Maisons du Monde + La Redoute → Toolbox/Create-a-Feed (CSV) → send Publisher ID + feed URL + approved advertisers. Then orchestrator sets `AWIN_FEED_URL` + `CRON_SECRET` in Vercel, runs one ingest, verifies real cards + affiliate tracking. RedNote launch owned by a separate agent (out of scope here).

## Open threads
- Engine choice pending spike (MiniMax vs Qwen). Needs MINIMAX_API_KEY + FAL_KEY + 3–5 room photos.
- Supabase project not yet created (Phase 2).
- GitHub remote + Vercel project not yet created (no `gh` CLI on this machine — will push via https remote or user creates repo).
