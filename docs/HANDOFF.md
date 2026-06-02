# Roomora — Handoff / Current State

> **New session: read this first, then `CLAUDE.md`, then `docs/PROJECT_MEMORY.md` (running log) and `docs/DECISIONS.md`.**
> Last updated: 2026-06-02.

## Overarching goal
Roomora is a **mobile-first, bilingual (English + 简体中文) web app**: a user uploads a photo of their **real room**, and AI restyles it into a fully furnished design that **stays recognizably their room** (same walls, windows, doors, proportions), with natural-language refinement ("add a rug", "warmer light"). Credit-based monetization; distribution via **RedNote (小红书) + Instagram/TikTok**; target users are people furnishing apartments in **Paris / France / Europe**.

**Differentiator (validated by Reddit research):** *trustworthy spatial fidelity* — never hallucinate windows/doors, and the user controls exactly what changes. Every competitor fails at this.

## Where it lives
- **Live (production):** https://roomora-gamma.vercel.app
- **Repo:** github.com/paristennisbookingassistant-spec/Roomora (branch `main`)
- **Local:** `C:/Users/glygs/Documents/AI-Projects/Roomora/roomora-app`
- **Design handoff (reference):** `../Roomora/design_handoff_roomora/` (prototype `Roomora.html` = visual source of truth)

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 · Zustand + TanStack Query · Supabase (Postgres + Auth + Storage) · **engine: fal.ai `fal-ai/qwen-image-edit`** (~€0.02/img, ~6–10s). Deployed on Vercel (project `roomora`, team scope `leos-projects-11d290bd`). Bilingual via a lightweight `useT()` → `t(en, zh)` hook over the Zustand `lang`.

## Engine decision (DECISIONS.md D1)
**Qwen-Image-Edit on fal.ai** — preserves room architecture on restyle AND obeys targeted edits. MiniMax was tested and **rejected** (invented new rooms, ignored edit instructions). Prompt = per-style descriptor + an explicit FURNISH instruction + an ARCHITECTURE-LOCK clause (`src/lib/prompts.ts`).

## ✅ Shipped & verified on production
- **Full UI** — 9 screens + Auth/Buy/Share modals + error/toast, "Sauge Doré" design system, Schibsted Grotesk + Noto Sans SC fonts, full EN/中文, real draggable before/after slider.
- **Auth** — real Supabase **email magic-link** sign-in + `/auth/callback`; session via `@supabase/ssr` + middleware.
- **Server-enforced credits** — `profiles` + `credit_transactions` tables; `spend_credits` / `add_credits` RPCs; signup trigger grants **3 credits**. Pill turns danger ≤2.
- **Real generation** — `POST /api/generate`: server-authoritative credit spend → upload to `rooms` bucket → Qwen → store in `designs` bucket → `generations` row; **refine** version chains; failure refunds.
- **Anonymous trial** — **3 free designs** (counter in store, consumed only on success; refine counts too); pill shows "N free".
- **Large-photo fix** — `src/lib/readImageFile.ts` downscales client-side to ≤1536px JPEG (fixes >4.5MB phone photos exceeding Vercel's body limit; also fixes EXIF rotation).
- **Constructive generating screen** — shows the user's own photo dimmed + "Designing your {style} room" + step labels.
- **Interactive landing proof** — style toggle chips + one large draggable before/after.
- **Real style imagery** — 10 Flux-generated style tiles in `public/styles/`; real-room before/afters in `public/examples/`.
- **Test harness** — `/api/dev/login` + `/api/dev/reset` (gated by `TEST_USER_EMAILS` + `ROOMORA_DEV_LOGIN_TOKEN`) let the independent `tester` sub-agent authenticate headlessly and verify on the live URL via gstack `/browse`.

**DB tables:** `profiles`, `credit_transactions`, `generations`. **Storage buckets (public):** `rooms`, `designs`.

## 🔧 In progress — Cycle 2 (approved, NOT yet built)
1. **Save + My Designs (real)** — currently MOCK. Plan: reuse the `generations` table (add `saved boolean` via migration `0003_saved_designs.sql` + own-row UPDATE RLS), a `/api/designs` route (save/list, claim anon rows), real `designsService`, wire `doSave` with the result's `generationId`, and make `MyDesignsScreen` fetch real saved designs. *No external dependency — build first.*
2. **Google one-tap sign-in** — code (`supabase.auth.signInWithOAuth`) + configure Supabase Google provider. **BLOCKED** on the user creating a Google Cloud OAuth Web client (redirect URI `https://wakijejhpprftavrwipd.supabase.co/auth/v1/callback`) and sharing the client ID + secret.

## ⏭️ Left / deferred (priority order)
1. Finish Cycle 2 (Save/My Designs, then Google when creds arrive).
2. **Share → `/share/[id]` public pages** with working RedNote/IG/TikTok/copy-link — the main RedNote growth lever (recommended next cycle).
3. **Real payment** — Stripe (EUR) + WeChat Pay; currently mock (grants credits, no charge). Deferred until after growth features (user's call). Needs a Stripe account + keys.
4. Anonymous-trial **server-side hardening** (TODO in `src/app/api/generate/route.ts` — currently client-only, bypassable by clearing localStorage).
5. WeChat login (placeholder).
6. Desktop parity layouts + edge-state polish + full fidelity pass vs prototype.
7. Per-style **prompt quality tuning** (collect which styles look weak).
8. Custom SMTP for magic-link email volume (Supabase default is rate-limited).
9. Review the homedesigns.ai competitor research (an agent ran it; learnings not yet folded in).

## How to operate (key commands & facts)
- **Secrets:** `roomora-app/.env.local` (gitignored) holds `FAL_KEY`, Supabase URL/anon/service keys, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF=wakijejhpprftavrwipd`, `VERCEL_TOKEN`, `ROOMORA_DEV_LOGIN_TOKEN`, `TEST_USER_EMAILS`. Production env vars already set in Vercel.
- **Deploy:** from `roomora-app/`: `npx vercel --prod --yes --scope leos-projects-11d290bd --token $VERCEL_TOKEN`. (GitHub is `main`; CLI deploy is the reliable path. `vercel.json` pins framework = nextjs.)
- **Migrations:** write SQL in `supabase/migrations/`, apply with `node scripts/apply-migration.mjs <file>` (Supabase Management API via `SUPABASE_ACCESS_TOKEN`). The Management API `…/database/query` endpoint also runs arbitrary SQL for verification.
- **Dev-login (for tester):** `GET /api/dev/login?token=$ROOMORA_DEV_LOGIN_TOKEN&email=tester@roomora.test` → sets a real session. Reset credits: `/api/dev/reset?...&credits=N`.
- **Gates before done:** `npx tsc --noEmit` · `npm run build` · `npm run lint` (all must be clean). This is **Next.js 16** — read `node_modules/next/dist/docs/` before framework changes (cookies() is async; route handlers; Tailwind v4 `@theme`).
- **Three-agent loop:** orchestrator (main session) specs + deploys; developer sub-agents implement; the `tester` sub-agent (zero codebase context) verifies on the live URL. Ship only after the tester passes.

## Spike artifacts (not in repo)
`../spike/` has the engine-comparison scripts and proof images (MiniMax vs Qwen, the furnished restyle, style-tile generators).
