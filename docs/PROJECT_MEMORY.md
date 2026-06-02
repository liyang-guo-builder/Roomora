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

## Open threads
- Engine choice pending spike (MiniMax vs Qwen). Needs MINIMAX_API_KEY + FAL_KEY + 3–5 room photos.
- Supabase project not yet created (Phase 2).
- GitHub remote + Vercel project not yet created (no `gh` CLI on this machine — will push via https remote or user creates repo).
