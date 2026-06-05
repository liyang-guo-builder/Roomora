# Roomora, Session Handoff

> Read this first, then `docs/PROJECT_MEMORY.md` (full chronological session log, the detail lives there) and `CLAUDE.md` (rules + Sauge Doré tokens + Next 16 gotchas). Owner: **Liyang Guo** (INSEAD MBA, ex-Deloitte; non-engineer, explain in plain language, **no em-dashes** anywhere user-facing or in chat).

## Goal
Mobile-first, bilingual (EN + 简体中文) web app that restyles a photo of the user's **real** room while keeping it recognizably their room (same walls/windows/doors/proportions). Credit-based; distribution via **RedNote** (小红书) + IG/TikTok; users = people furnishing apartments in Paris/Europe (and Chinese audience via RedNote). Promise: **"Redesign your real room. It stays your room."**

## Status: LAUNCH-READY on the core. Live at **https://room-ora.com**
(Custom domain, registered + DNS + cert all managed by Vercel. `roomora-gamma.vercel.app` also still works.)

## Where things are
- **Code**: `C:\Users\glygs\Documents\AI-Projects\Roomora\roomora-app\` (git root, branch `main`). Stack: **Next.js 16 (App Router), React 19, Tailwind v4, TypeScript, Supabase, Stripe, Vercel.** Next 16 has real breaking changes, consult `node_modules/next/dist/docs/` before framework work.
- **Secrets**: `.env.local` (gitignored). FAL_KEY, MINIMAX_API_KEY/BASE_URL, Supabase x3, SUPABASE_ACCESS_TOKEN, VERCEL_TOKEN, ROOMORA_DEV_LOGIN_TOKEN, **STRIPE_SECRET_KEY (TEST), STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_APP_URL**. Never commit values.
- **Infra IDs**: GitHub `paristennisbookingassistant-spec/Roomora` (`main`); Vercel project `roomora`, scope `leos-projects-11d290bd`; Supabase ref `wakijejhpprftavrwipd`. Stripe account = **TEST mode** (activated: details_submitted + charges_enabled). Gmail SMTP sender = `paristennis.booking.assistant@gmail.com` (reused from the tennis app), display name "Roomora".
- **Brand/GTM assets (do NOT edit casually)**: `..\gtm-assets\`, `logo-3green.svg` (master 3-green mark), `app-icons/`, `references/` (curated interior `descriptors.md` + `Images/` per style + `_experiments/` bake-off renders). A separate session owns RedNote GTM.

## What's built & live (verified on prod)
- **Core loop**: upload → restyle → refine → save/My Designs → share → "shop this look" (coming-soon) → match-a-photo.
- **Engine (changed this session): restyle + match = `fal-ai/nano-banana/edit`** (Google/Gemini image, ~$0.039/image flat, clearly more beautiful in a bake-off). **Refine = `fal-ai/qwen-image-edit`** (tighter control). Prompts in `src/lib/prompts.ts`: rich per-style descriptors (from the curated `references/descriptors.md`) + a **balanced `ARCHITECTURE_LOCK`** (firm on window panels/recessed-bay/proportions, ends with a positive "now fully furnish" line, do NOT over-tighten or Nano Banana goes sparse/flat).
- **Auth (overhauled): email + password** (signUp / signInWithPassword), **Google** one-tap, **password reset** (`/auth/reset`). WeChat login **removed**. Supabase `mailer_autoconfirm=true` (instant signup, no email needed); **Gmail SMTP** wired for reset emails. One-time 3-credit signup grant (handle_new_user trigger).
- **Free trial + paywall (server-enforced this session)**: anon = **1 free generation**, gated server-side via `anon_trials` table + httpOnly `ra_did` device cookie (1/device) + IP cap (3/24h). 2nd anon attempt → **402 `anon_trial_used`** → opens signup sheet. Signed-in: `spend_credits` → 402 `insufficient_credits` → Buy modal. Entry points (Add a photo / Try another room / Refine) prompt signup immediately when out of trial. Copy everywhere = "1 free try, no signup · sign up for 3 more · then buy credits".
- **Payments: Stripe Checkout (EUR), LIVE IN TEST MODE.** Methods = **Card + WeChat Pay + Alipay** (Adaptive Pricing disabled, set explicit `payment_method_types`). Webhook `/api/webhooks/stripe` credits via service-role `add_credits_for` RPC, idempotent (unique session id), `payment_status='paid'` guard + `async_payment_succeeded` handler. Verified test purchase. **NOT yet on live keys.**
- **Shop this look = parked "coming soon"** behind `NEXT_PUBLIC_SHOP_LIVE` (off). Full pipeline built (products table, MiniMax itemize, /api/shop, nightly cron) but Awin **rejected** the publisher app (new site/no traffic). Feed parser hardened for real Awin column names.
- **Legal**: `/terms` + `/privacy` (GDPR-aware) live + linked. Contact `hello@/privacy@room-ora.com` (forwarding NOT set up yet).
- **PWA**: home-screen icon = the real **3-green colorful mark** (served at clean `/apple-touch-icon.png`); InstallHint banner; manifest standalone. Desktop = app framed as a centered "device" on a gradient. Photo picker fixed (removed `capture` → library access). **Download** saves to Photos (phone, via Web Share) / Downloads (desktop).

## Key commands (PATH is flaky in bash, always prefix)
```bash
export PATH="/c/Program Files/nodejs:/usr/bin:/bin:$PATH"
cd "C:/Users/glygs/Documents/AI-Projects/Roomora/roomora-app"
# gates: npx tsc --noEmit && npm run lint && npm run build
set -a; source .env.local; set +a   # load secrets for deploy/scripts
npx --yes vercel --prod --yes --scope leos-projects-11d290bd --token "$VERCEL_TOKEN"
# migration: node scripts/apply-migration.mjs supabase/migrations/000X_*.sql
# prod SQL: POST https://api.supabase.com/v1/projects/wakijejhpprftavrwipd/database/query (Bearer SUPABASE_ACCESS_TOKEN)
# Supabase Auth config: PATCH/GET .../v1/projects/wakijejhpprftavrwipd/config/auth (Bearer SUPABASE_ACCESS_TOKEN)
# headless browse (gstack): B=~/.claude/skills/gstack/browse/dist/browse
```
**Dev login** (real session for testing): `https://room-ora.com/api/dev/login?token=<ROOMORA_DEV_LOGIN_TOKEN>&email=tester@roomora.test` · reset: `/api/dev/reset?...&credits=12`. Token value is `roomora-dev-7f3a9c2e5b`. **Stripe test card: 4242 4242 4242 4242, 12/34, 123, FR, 75001.**

## Operating model
Orchestrator (main session: specs/decisions/deploy) → spawns **dev sub-agents** for big chunks → verifies. Independent `tester` subagent works but **stalled once** this session (0-byte output >1h), for QA, driving `/browse` inline is more reliable. Each change: edit → tsc/lint/build → commit (stage explicitly, never `git add -A`) → deploy → verify on prod → log in PROJECT_MEMORY.

## What worked
- **Engine bake-off on the fal key** (no new keys): Nano Banana >> Qwen on beauty, fidelity holds with a good lock. Cost ~$0.039/img flat (size-independent).
- **Balanced architecture-lock**: be specific+brief about what to preserve, then positively tell it to furnish richly. Verify fidelity on the real test room each prompt change (`public/examples/room-before.jpg` = 3-panel window + left shelf niche + parquet).
- **Stripe**: one integration gives Card + WeChat Pay + Alipay; disable Adaptive Pricing or it hides the alt methods + shows a currency chooser. Webhook needs raw body + signature verify + idempotency + a credit-for-arbitrary-user RPC (auth.uid() not available server-to-server).
- **Gmail SMTP** as Supabase custom SMTP (host smtp.gmail.com:587 + App Password) lifts the 2-emails/hour built-in cap.
- Reference collection via the user's **real Chrome** (clean IP), not headless (RedNote trips anti-bot 300012).

## What did NOT work (don't repeat)
- Over-strict architecture-lock → Nano Banana renders sparse/flat. Balance it.
- Stripe **Adaptive Pricing** on → hides WeChat/Alipay + adds an SGD/EUR chooser. Keep it OFF.
- **RedNote web automation** for collection → IP anti-bot block (安全限制 300012). Use the phone app or real-Chrome debugger.
- **Awin** rejects new/no-traffic sites. Reapply after RedNote traffic (+ now we have a real domain).
- iOS caches the home-screen icon hard, code is correct; the user must remove + re-add to Home Screen to see a new icon.
- The dedicated `tester` subagent stalled, prefer inline `/browse` for QA.

## Known issues / caveats
- **China / restrictive networks (IMPORTANT for RedNote)**: app images are served from `wakijejhpprftavrwipd.supabase.co` (AWS) and the app from Vercel. On some networks (e.g. mainland China, filtered WiFi) these get TLS/cert warnings or are blocked → **images show blank** even though generation succeeded. Engine + image are fine (verified by fetching from a clean network). Future fix: proxy generated images through `room-ora.com` and/or a China-edge CDN.
- Email forwarding for `hello@/privacy@room-ora.com` not set up.
- Google OAuth may show an "unverified app" warning until Google verification (needs the privacy-policy URL, which now exists).
- "Billing history" on Account shows "None yet" (cosmetic, not wired).
- Nano Banana is slightly more liberal than Qwen, watch fidelity across varied real rooms (we only have one test room).

## Next steps (priority order)
1. **Flip Stripe to LIVE keys (top item, the only blocker to real revenue).** Liyang switches the Stripe dashboard to live, sends `pk_live_…` + `sk_live_…`. Then: set them in Vercel env + `.env.local`; create a NEW prod webhook endpoint (`https://room-ora.com/api/webhooks/stripe`) via the Stripe API → store its `whsec_…`; confirm WeChat Pay + Alipay capabilities are **active in live mode** (may need a short Stripe review); redeploy; do one small real test purchase + confirm the credit lands. Also: set up email forwarding for `hello@/privacy@room-ora.com`; consider submitting Google OAuth for verification.
2. **China image robustness** (only if RedNote users hit the blank-image issue): proxy images through `room-ora.com`.
3. **Multi-room fidelity check**: get 3-5 varied real room photos from Liyang; run them through restyle to confirm Nano Banana holds architecture across window types/layouts.
4. **Reactivate shopping**: reapply to Awin (or Effiliation = Maisons du Monde / Affilae = La Redoute) once RedNote traffic exists; on approval set `AWIN_FEED_URL` + `CRON_SECRET`, run an ingest, set `NEXT_PUBLIC_SHOP_LIVE=true`.
5. Minor: brand the reset email + a dedicated Roomora email sender; billing-history UI.
