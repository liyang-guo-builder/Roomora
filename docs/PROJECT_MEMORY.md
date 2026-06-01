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

## Open threads
- Engine choice pending spike (MiniMax vs Qwen). Needs MINIMAX_API_KEY + FAL_KEY + 3–5 room photos.
- Supabase project not yet created (Phase 2).
- GitHub remote + Vercel project not yet created (no `gh` CLI on this machine — will push via https remote or user creates repo).
