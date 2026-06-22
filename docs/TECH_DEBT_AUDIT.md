# Roomora — Technical Debt & Architecture Audit

Independent pre-feature audit, conducted before building "Shop this look" (live product search).
Scope: `roomora-app/src`, `roomora-app/supabase`, root config. Excludes `gtm-assets`, `spike`, design handoff, `node_modules`.

Date of audit: 2026-06-22. Auditor: independent senior staff engineer (read-only).

---

## 1. Executive summary (for a non-engineer founder)

These are the things that will cost you real money, real trust, or real engineering time if left alone. Each names the risk and what it costs to ignore it.

1. **Anyone with an account can mint themselves unlimited free credits.** The database function that adds credits (`add_credits`) is exposed directly to every logged-in user. A user can open their browser console and grant themselves 9,999 credits, bypassing Stripe entirely. Cost of ignoring: direct revenue leakage the moment a savvy user notices, and you would not see it in Stripe. This is the single most important fix and it is small. (Critical, fix before anything else.)

2. **The shopping itemizer is wired up in a way that is known to fail.** It sends the AI vision model a Supabase image link, but that model needs the image data inlined (base64), exactly the bug you already flagged. The working code elsewhere in the app (the "match a photo" captioner and the prompt composer) proves the base64 path works. Cost of ignoring: the new shopping feature returns zero items on day one and you debug it live. (High, fix before the shopping feature.)

3. **There are zero automated tests.** No test runner, no test files, no CI. The most dangerous untested logic is the credit ledger (spend, refund, anon free-trial) and the Stripe webhook idempotency. Cost of ignoring: every future change to money-touching code is a coin flip, and the shopping feature adds new money/rate-limit accounting on top. (High, partially address before the shopping feature.)

4. **The shopping API endpoint is not behind the feature flag.** The "coming soon" gate (`NEXT_PUBLIC_SHOP_LIVE`) only hides the UI. Anyone can still POST to `/api/shop` and trigger a paid MiniMax vision call. Cost of ignoring: surprise AI bills and an unmetered abuse surface as soon as the endpoint is discoverable. (High, fix before the shopping feature.)

5. **Credit accounting is split between the browser and the server, and the browser can drift.** The Zustand store keeps its own credit count and "optimistically" spends/refunds, then tries to re-sync from the server. Under double-clicks or network errors the displayed balance can disagree with the truth. Cost of ignoring: support tickets ("my credits are wrong"), and a fragile base to bolt shopping-related accounting onto. (Medium, schedule.)

6. **The product-search backend assumes a local `products` table that the new plan abandons.** The current `/api/shop` route, the `products` table, the nightly Awin cron, and `ingest-awin.mjs` are all built around ingesting an affiliate feed into Postgres and full-text searching it. The new plan is live Google Shopping search via SearchApi. These are two different architectures. Cost of ignoring: confusion about which path is real, dead code that looks live, and a half-rewrite mid-feature. Decide explicitly: extend the existing route, or replace it. (Medium, decide before the shopping feature.)

7. **Business logic lives inside a React component.** `FlowProvider.tsx` (412 lines) owns credit spend/refund, anon-trial handling, error routing, downloads, and more. There is no service layer between the UI and the network for the generate/refine flows. Cost of ignoring: the shopping flow will pile more logic into the same component, and it is already hard to test (and untestable without a browser). (Medium, schedule.)

8. **i18n is hand-inlined everywhere as `t("English","中文")`.** No catalog, no missing-key detection, no way to audit coverage. Cost of ignoring: the new shopping UI adds dozens more inline strings; the day you want a third language or a copy review, you are grepping the whole codebase. (Low-Medium, schedule.)

9. **One hardcoded dev password sits in source.** `/api/dev/login` ships a fixed password string. It is inert unless a dev token is set, so the exposure is limited, but it is in git history. Cost of ignoring: low today, but it is a credential in a public-ish repo. (Low, schedule.)

Bottom line: the codebase is clean, type-checks with zero errors, lints clean, and the database layer is genuinely well designed (good RLS, idempotent webhook, locked-down `add_credits_for`). The debt is concentrated in a few specific, fixable places, and most of them sit right where the shopping feature will land.

---

## 2. Health snapshot

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **Pass** (exit 0, zero errors). `strict: true` is on. |
| `npm run lint` (`eslint .`) | **Pass** (exit 0, zero warnings). |
| `npm run build` | Not run (would require a real build env + secrets); not configured to ignore errors — `next.config.ts` does **not** set `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds`, so a broken type or lint would fail the Vercel build. Good. |
| Test script | **None.** `package.json` has only `dev`, `build`, `start`, `lint`. No `test` script, no runner (Vitest/Jest/Playwright) in deps, no `__tests__`, no `.github` CI. |
| `any` / unchecked `as` | No `: any` in app code. Casts are mostly `as <Type>` on Supabase row results (untyped client). No `@ts-ignore` / `@ts-expect-error`. |
| `console.log` | None. One `TODO` (Stripe async, already handled). `eslint-disable` lines are all legitimate `no-img-element`. |
| `dangerouslySetInnerHTML` | None. |
| Secrets hygiene | No `NEXT_PUBLIC_` on any secret. Only `NEXT_PUBLIC_SHOP_LIVE` and `NEXT_PUBLIC_APP_URL` reach the client, both non-secret. Good. |

### Rough module map

```
src/app/api/            HTTP routes (server-authoritative)
  generate/             ★ core: restyle/match/refine, credit spend+refund, anon gating, fal call (500 lines)
  shop/                 product matching against local products table (NOT the new live-search plan)
  cron/ingest-products/ nightly Awin feed ingest (secured by CRON_SECRET) — route DOES exist
  checkout/             Stripe Checkout session creation
  webhooks/stripe/      idempotent credit grant on payment
  designs/              save / list / unsave (claims anon rows)
  share/                public share opt-in
  dev/{login,reset}/    test-only, inert without ROOMORA_DEV_LOGIN_TOKEN
src/lib/
  prompts.ts            deterministic prompt templates + ARCHITECTURE_LOCK (good)
  composer.ts           optional MiniMax-vision prompt composer (behind COMPOSER_ENABLED)
  shop/                 itemizer.ts, feed.ts, categories.ts (shop scaffolding, products-table era)
  services/             typed service layer: supabase.ts (real), mock.ts, generation.ts, designs.ts, shop.ts
  supabase/             server.ts (anon+cookie), admin.ts (service role), middleware.ts, client.ts
  store.ts              Zustand global store (lang, credits, photos, flow state) + localStorage persist
  stripe.ts             lazy server-only Stripe client
src/components/
  flow/FlowProvider.tsx ★ orchestrator: holds most business logic (412 lines)
  screens/              SetupScreen, ResultScreen, RefineScreen, AccountScreen, ShopThisLook, ...
  modals/               Auth, Buy, Share, Sheet
supabase/migrations/    0001-0008, clean and well-commented
```

### Debt rating by area

| Area | Rating | One-line reason |
|---|---|---|
| Database / RLS / migrations | **Low** | Well structured, idempotent webhook, locked-down `add_credits_for`. One grant slip (`add_credits`). |
| Secrets / config hygiene | **Low** | Correct `NEXT_PUBLIC_` discipline, security headers set, lazy Stripe. |
| Type safety | **Low-Medium** | Clean tsc; casts are confined to untyped Supabase rows. No generated DB types. |
| Credit ledger (end to end) | **Medium-High** | Server logic is sound; the `add_credits` grant is exploitable; client/server split can drift. |
| Architecture / layering | **Medium** | Logic leaks into `FlowProvider`; services layer exists but is bypassed for generate/refine. |
| Shop scaffolding | **High** | Built for a products-table architecture the new plan replaces; itemizer URL bug; unguarded endpoint. |
| Testing | **High** | None at all. |
| i18n | **Medium** | Hand-inlined, no catalog, no coverage tooling. |

---

## 3. Findings

### F1 — `add_credits` RPC is callable by any authenticated user (credit minting)
- **Location:** `supabase/migrations/0001_auth_credits.sql:44-53` (function + `grant execute ... to authenticated`); consumed server-side at `src/app/api/generate/route.ts:260` and `src/lib/services/supabase.ts:127-143`.
- **What it is:** `add_credits(p_amount, p_reason)` is `SECURITY DEFINER`, operates on `auth.uid()`, and is granted to the `authenticated` role. It is never revoked (unlike `add_credits_for`, which migration `0006` correctly revokes from everyone except `service_role`).
- **Why it is a risk:** Any logged-in user can call `supabase.rpc('add_credits', { p_amount: 9999, p_reason: 'refund' })` directly from the browser and mint unlimited credits, bypassing Stripe. It is not visible in Stripe, so revenue leakage would be silent. The server-side refund path only needs this RPC reachable by the service role; the `authenticated` grant is the entire vulnerability.
- **Severity:** Critical.
- **Effort:** S. Add a migration: `revoke execute on function public.add_credits(int,text) from authenticated, anon, public;` then route the server refund through an `add_credits_for(auth_user_id, ...)`-style call (or a new `refund_credits` that the service role owns). The client `creditsService.refund/grant` (`supabase.ts:125-143`) must stop calling it directly.
- **Threatens shopping feature?** Indirectly. The shopping feature is also credit/rate sensitive; shipping more monetized surface on top of a mintable ledger compounds the exposure.

### F2 — Itemizer sends a Supabase URL to MiniMax instead of base64 (known failure)
- **Location:** `src/lib/shop/itemizer.ts:52-77` (`{ type: "image_url", image_url: { url: imageUrl } }`), called from `src/app/api/shop/route.ts:113` with `resultUrl` = `gen.result_url` (a Supabase public URL).
- **What it is:** The itemizer passes a remote Supabase URL to the MiniMax `chatcompletion_v2` endpoint. The two working MiniMax call sites prove the contract: `captionInspiration` (`generate/route.ts:95-139`) passes a **base64 data URI** and the prompt composer (`composer.ts:44-103`) prefers the base64 data URI (`imageRef = body.imageBase64 ?? inputImageUrl`). Only the itemizer feeds a bare remote URL.
- **Why it is a risk:** This is precisely the reported failure — MiniMax does not reliably fetch Supabase URLs, so itemization returns nothing or errors, and the whole shopping flow yields zero items. Note also both itemizer and composer use model id `"MiniMax-Text-01"`; if vision requires a different model id, that is a second latent issue to confirm against current MiniMax docs.
- **Severity:** High.
- **Effort:** S. Before the MiniMax call, fetch `result_url` to bytes and inline as `data:image/png;base64,...` (the exact pattern already at `generate/route.ts:333-334`). Add a tiny helper so all three call sites share one "to data URI" path.
- **Threatens shopping feature?** Yes, directly. This is the first thing the shopping feature will hit.

### F3 — No automated tests anywhere
- **Location:** repo-wide. `package.json` (no `test` script, no runner in deps); no `*.test.*`/`*.spec.*`, no `__tests__`, no `.github` CI. `.env.test.example` exists only for the live-URL tester sub-agent.
- **What it is:** Zero unit/integration coverage. The only "testing" is a manual headless QA sub-agent against the live URL.
- **Why it is a risk:** The most error-prone logic in the app is money- and abuse-related (credit spend/refund symmetry, anon-trial counting, webhook idempotency, prompt assembly order). All of it is verified only by hand. The shopping feature adds budget allocation, per-item search, a vision "judge," and result caching — all branch-heavy and all currently untestable without a browser.
- **Severity:** High.
- **Effort:** M to stand up Vitest + a few targeted unit tests on pure functions (see Section 4). L to reach meaningful route/integration coverage.
- **Threatens shopping feature?** Yes. New branchy logic with no safety net.

### F4 — `/api/shop` is not gated by the feature flag (unmetered paid endpoint)
- **Location:** `src/app/api/shop/route.ts:67` (no flag check); UI gate at `src/components/screens/ShopThisLook.tsx` (`enabled: SHOP_LIVE`, `if (!SHOP_LIVE) return teaser`).
- **What it is:** `NEXT_PUBLIC_SHOP_LIVE` only disables the client query and shows "coming soon." The route itself will itemize (paid MiniMax call) and search for anyone who POSTs a valid `generationId`.
- **Why it is a risk:** Discoverable, unauthenticated (anon-friendly by design), unmetered endpoint that costs money per call. With the live-search plan it will also spend SearchApi quota and (per plan) credits. No per-user/IP rate limit exists on this route.
- **Severity:** High.
- **Effort:** S to add a server-side enable check + reuse the anon device/IP gating already written in `generate/route.ts`. M to add proper rate/credit accounting for live search.
- **Threatens shopping feature?** Yes, directly — this is the endpoint the feature is built on.

### F5 — Shop backend is built for a `products` table, not live search
- **Location:** `src/app/api/shop/route.ts` (queries `search_products` RPC), `supabase/migrations/0005_shop_products.sql` (products table + FTS + RPC), `src/lib/shop/feed.ts`, `scripts/ingest-awin.mjs`, `src/app/api/cron/ingest-products/route.ts`, `vercel.json` cron.
- **What it is:** A complete affiliate-feed-into-Postgres-and-full-text-search architecture: nightly cron ingests an Awin CSV into `public.products`, and `/api/shop` matches itemized queries against it via the `search_products` SECURITY DEFINER function. The new plan (live Google Shopping via SearchApi + a vision judge + budget allocation) is a different architecture.
- **Why it is a risk:** Two parallel designs for the same feature. The cron/feed path looks live (it is scheduled in `vercel.json` and the route is real) but will be dead weight if you go live-search. Mid-feature you risk half-rewriting `/api/shop` while the old products plumbing still runs nightly. The itemization-caching shape (`generations.items` jsonb) is reusable; the product-matching half is not.
- **Severity:** Medium (architectural clarity, not a runtime bug).
- **Effort:** M. Decide explicitly: (a) replace the product-matching half of `/api/shop` with SearchApi calls and keep the itemize-and-cache half, and (b) either retire or repurpose the cron, `products` table, `feed.ts`, and `ingest-awin.mjs`. Update `.env.local.example` (which still describes the feed/products plan) to the new plan.
- **Threatens shopping feature?** Yes — it is the shopping feature's foundation and currently points the wrong way.

### F6 — Caching shape for shop results is partly validated, writes are silently swallowed
- **Location:** `src/app/api/shop/route.ts:97-127`.
- **What it is:** `gen.items` is read as `gen.items as DesignItem[] | null` (unchecked cast, line 99) then defensively re-mapped (lines 101-106). The cache write uses `.then(() => {})` (line 126), swallowing any DB error with no log.
- **Why it is a risk:** The defensive re-map is good, but the plan caches *product results* on the generation too. The current cache only stores *items*, so live product results (which the plan wants cached on the generation) have no column or shape yet. A failed cache write is invisible, so a transient outage silently degrades to re-itemizing (re-paying) every request.
- **Severity:** Medium.
- **Effort:** S-M. Add a typed `shop_results jsonb` column (or reuse a structured `items` shape), validate on read, and at least log cache-write failures.
- **Threatens shopping feature?** Yes — caching results on the generation is explicitly in the plan.

### F7 — Business logic concentrated in `FlowProvider.tsx`
- **Location:** `src/components/flow/FlowProvider.tsx` (412 lines), esp. `doGenerate` (~101-178), `doApplyRefine` (~272-310), `doDownload` (~214-248).
- **What it is:** The component owns credit spend/refund decisions, anon-trial error handling, server-error-to-screen routing, optimistic save rollback, and download/share fallbacks. The `services/generation.ts` layer exists but `FlowProvider` calls the route and interprets balances itself.
- **Why it is a risk:** Cannot be unit-tested without a DOM. The shopping flow (kick off itemize, poll, render groups, handle budget) will add more of the same here. Credit logic interleaved with UI is exactly where the client/server drift in F8 lives.
- **Severity:** Medium.
- **Effort:** M. Extract generate/refine/shop orchestration into the service layer; let the component call typed services and render state.
- **Threatens shopping feature?** Yes — the new flow will be added here and inherit the same untestability.

### F8 — Credit balance split between client store and server, with optimistic mutation
- **Location:** `src/lib/store.ts:91-93` (`spend`/`refund`/`grant` mutate local count), `FlowProvider.tsx` (sets `setCredits(result.balance)` on success, falls back to `refund(1)` on error if the balance refetch fails), `useAuthSync.ts` (mirrors server balance on auth events, no try/catch around the balance fetch).
- **What it is:** The browser keeps its own credit number and adjusts it optimistically, then reconciles from the server response. On error it guesses (`refund(1)` if it cannot refetch).
- **Why it is a risk:** Rapid double-submits or a failed balance refetch can leave the displayed balance disagreeing with `profiles.credits`. The server is authoritative so money is safe, but the UX and support cost are real, and it makes the shopping feature's "spend on search" accounting harder to reason about.
- **Severity:** Medium.
- **Effort:** M. Treat the server response as the single source of truth (drop optimistic local arithmetic, or make it a display hint only), and wrap `useAuthSync` balance loads in try/catch.
- **Threatens shopping feature?** Indirectly, if shopping spends credits per the plan.

### F9 — Anon free-trial enforcement is best-effort and has a non-atomic count-then-insert
- **Location:** `src/app/api/generate/route.ts:224-254` (count device+IP), `:477-479` (insert on success); `supabase/migrations/0007_anon_trials.sql`.
- **What it is:** For anonymous users the route counts prior `anon_trials` rows, then later inserts one on success. The count and the insert are not in a transaction, and the device id is a client-presented `ra_did` cookie.
- **Why it is a risk:** Two concurrent anon requests can both pass the count before either inserts, so a determined user gets 2 free generations instead of 1. The design explicitly accepts this ("best-effort anti-abuse"), so the risk is bounded, but the same gate is what the shopping feature should reuse for rate-limiting, and reusing a racy gate for a paid SearchApi call is worth a second look.
- **Severity:** Low-Medium (by design, but relevant to shopping rate-limits).
- **Effort:** M to make it atomic (unique constraint + insert-first, or an RPC). S to simply reuse as-is for shopping with eyes open.
- **Threatens shopping feature?** Indirectly — if shopping reuses this gate for abuse control.

### F10 — Duplicated feed-parsing logic (TS module vs CLI script)
- **Location:** `src/lib/shop/feed.ts` (`parseCSV`, `normalizeCategory`, `refineCategory`) and `scripts/ingest-awin.mjs` (identical untyped copies). `feed.ts` even comments that it "mirrors" the script.
- **What it is:** The same CSV/category logic exists twice, one typed, one not, kept in sync by hand.
- **Why it is a risk:** Category rules drift between cron and CLI. Low impact today; becomes moot if F5 retires the feed path.
- **Severity:** Low.
- **Effort:** S (extract a shared module) — but only worth doing if you keep the feed path. If F5 goes live-search, delete instead.
- **Threatens shopping feature?** No (it is the path the feature likely abandons).

### F11 — `search_products` RPC contract is implicit; route casts results unchecked
- **Location:** `src/app/api/shop/route.ts:136-156` (`admin.rpc("search_products", ...)`, `rows = exact.data as ProductRow[]`); function in `0005_shop_products.sql`.
- **What it is:** The route assumes the RPC's parameter names and return shape; `exact.data` is cast to `ProductRow[]` with no runtime check. (The RPC itself is correctly locked down — revoked from anon/authenticated.)
- **Why it is a risk:** If the function shape changes, the cast lies and the failure surfaces as a runtime crash. Same caveat as F5: this path may be replaced.
- **Severity:** Low-Medium.
- **Effort:** S. Moot if F5 replaces the products path.
- **Threatens shopping feature?** Only if you keep the products-table path.

### F12 — Hardcoded dev password in source
- **Location:** `src/app/api/dev/login/route.ts:16` (`const DEV_PASSWORD = "Roomora-dev-pw-7f3a9c2e5b!"`).
- **What it is:** A fixed password for the seeded test account, in the repo (and git history). The route is correctly inert unless `ROOMORA_DEV_LOGIN_TOKEN` is set and the email is whitelisted.
- **Why it is a risk:** Limited (the route 404s in prod without the token), but it is a real credential committed to source. If a test account with that password is reused anywhere, exposure grows.
- **Severity:** Low.
- **Effort:** S. Move to an env var; never reuse this account for anything privileged.
- **Threatens shopping feature?** No.

### F13 — i18n hand-inlined as `t("en","zh")` with no catalog
- **Location:** every screen/modal; hook at `src/lib/i18n.ts`.
- **What it is:** Bilingual strings inlined at each call site. No central catalog, no missing-key detection, no `lang` validation (anything not `"zh"` falls through to English).
- **Why it is a risk:** No way to audit coverage or review copy in one place; the shopping UI will add many more inline pairs. Migration to a catalog later is a large mechanical change.
- **Severity:** Low-Medium.
- **Effort:** L to migrate to a catalog. S to at least validate `lang`.
- **Threatens shopping feature?** No, but it grows the debt.

### F14 — Minor robustness nits (batch)
- **Location / items:**
  - `src/components/screens/AccountScreen.tsx` — post-purchase balance polling every 2s for 30s; `user?.email.split("@")[0]` would throw if `email` is null (the optional chain stops at `email`, not the `.split`).
  - `src/components/flow/AppShell.tsx` — `pathname.startsWith(r)` route matching can match unintended prefixes (e.g. `/shareXYZ` matches `/share`).
  - `src/lib/readImageFile.ts` — silent fallback to full-resolution raw read on any downscale error, no size ceiling (large file can ship a huge upload).
  - `src/components/modals/AuthModal.tsx` — error mapping by regex on server message strings (`/already|registered|exists/i`); brittle if Supabase changes wording.
- **Severity:** Low each.
- **Effort:** S each.
- **Threatens shopping feature?** No.

---

## 4. Test-coverage gaps (ranked by likelihood of reintroducing bugs)

There is no test harness at all, so everything below is currently unverified except by hand. Ranked by how likely a future change (especially the shopping feature) is to silently break it:

1. **Credit ledger symmetry — spend then refund.** `spend_credits` / `add_credits` (migrations 0001, 0008) and the route refund path (`generate/route.ts:213-264`). A pure-logic test that spending then refunding nets zero, that `unlimited` accounts never decrement, and that the `authenticated` grant on `add_credits` is removed (F1) would lock down the highest-value invariant. **Highest priority.**
2. **Stripe webhook idempotency.** `webhooks/stripe/route.ts:83-123`. The unique-session insert + `23505` short-circuit is the only thing preventing double-credits on Stripe retries. A test that a replayed event credits exactly once, and that `payment_status !== 'paid'` never credits, protects revenue integrity.
3. **Anon free-trial gating.** `generate/route.ts:224-254`. Device-cap of 1 and IP-cap of 3 in 24h, trial recorded only on success, cookie set on the 402 and on errors. Easy to break when the shopping feature reuses this gate. Includes the count-then-insert race (F9).
4. **Prompt assembly order.** `prompts.ts` (`buildRestylePrompt`/`buildMatchPrompt`/`buildRefinePrompt`) and `composer.ts`. The whole product promise (architecture fidelity, user-note-wins-last) rides on `ARCHITECTURE_LOCK` and `userOverride(note)` being appended in the right order. These are pure functions — the cheapest, highest-leverage tests in the codebase. A snapshot test per mode would catch any accidental reordering.
5. **Itemizer JSON extraction.** `itemizer.ts:extractJsonArray` and the item-coercion loop. The vision model returns messy text; the fence-stripping and `[`...`]` slicing are exactly the kind of parser that breaks on an edge case. Pure function, trivial to test, and central to the shopping feature.
6. **Generate route happy/refund paths.** Hard to unit-test as written (F7), which is itself the finding. At minimum, extract the credit/refund decision into a testable function.
7. **Budget → price cap mapping.** `shop/route.ts:budgetCap`. Pure, trivial, and the shopping feature's budget allocation depends on it.

Recommended minimum before shopping: stand up Vitest and cover items 1, 4, 5, 7 (all pure functions, a few hours of work). Items 2 and 3 want a Supabase test instance and are larger.

---

## 5. Prioritized remediation plan

### Do BEFORE the "Shop this look" feature (small, high-leverage, or directly in the blast radius)

| # | Item | Finding | Impact | Effort |
|---|---|---|---|---|
| 1 | Revoke `add_credits` from `authenticated`/`anon`/`public`; route server refund through a service-role-only path | F1 | Stops silent credit minting / revenue leak | S |
| 2 | Fix itemizer to inline image as base64 (reuse the existing data-URI pattern); confirm the MiniMax vision model id | F2 | The shopping feature works on day one instead of returning nothing | S |
| 3 | Gate `/api/shop` server-side on the live flag + reuse anon device/IP rate gate | F4 | Closes an unmetered paid endpoint before it is built upon | S |
| 4 | Decide the shop architecture explicitly: extend `/api/shop` for SearchApi vs keep products table; retire or repurpose the cron/feed/`products` accordingly; update `.env.local.example` | F5 | Prevents a mid-feature half-rewrite and dead-code confusion | M (mostly a decision) |
| 5 | Stand up Vitest; test prompt assembly order, itemizer JSON extraction, budget cap, credit spend/refund symmetry | F3, F4 (items 1,4,5,7) | A safety net under exactly the logic shopping touches | M |
| 6 | Define the cached-shop-results shape on the generation (typed column/shape) and log cache-write failures | F6 | The plan caches results on the generation; do it once, correctly | S-M |

### Schedule for LATER (real debt, but not blocking the feature)

| # | Item | Finding | Impact | Effort |
|---|---|---|---|---|
| 7 | Make credit balance server-authoritative in the UI (drop optimistic local arithmetic; wrap `useAuthSync` balance load in try/catch) | F8 | Fewer "wrong credits" tickets; cleaner accounting | M |
| 8 | Extract generate/refine/shop orchestration out of `FlowProvider` into the service layer | F7 | Testability; stops the component from growing unbounded | M |
| 9 | Make the anon-trial count atomic (unique constraint / RPC) | F9 | Closes the 1-vs-2 free-trial race | M |
| 10 | Move the dev password to an env var | F12 | Removes a committed credential | S |
| 11 | Validate `lang`; consider an i18n catalog migration | F13 | Maintainability as copy grows | S / L |
| 12 | Robustness nits: email-split null guard, exact route matching, image size ceiling, resilient auth error mapping | F14 | Polish; fewer edge-case crashes | S each |

### Explicitly NOT worth doing now (avoid over-engineering)

- **De-duplicating `feed.ts` / `ingest-awin.mjs` (F10) and hardening the `search_products` cast (F11)** — only worth it if you keep the products-table path. If F5 lands on live search, delete that code instead of polishing it.
- **A full i18n catalog migration** before the feature — large mechanical change with no feature value right now; the `lang` validation alone is enough for now.
- **Generated Supabase types** — nice-to-have; the current `as <Type>` casts on row results are localized and tsc is clean. Not blocking.

---

## Appendix: things that are genuinely good (do not "fix")

- Database layer: idempotent Stripe webhook (unique session id + `23505` handling), `add_credits_for` correctly revoked to `service_role` only, RLS on every table, SECURITY DEFINER with `set search_path`, `unlimited` accounts handled cleanly.
- Secrets discipline: no `NEXT_PUBLIC_` on any secret; lazy/deploy-inert Stripe client; security headers in `next.config.ts`.
- Prompt design: deterministic fallback always computed first, composer is strictly additive and never breaks a generation, architecture lock and user-override ordering are deliberate and well-commented.
- The cron route exists and is properly secured by `CRON_SECRET` (an earlier worry that the route was missing is unfounded — it is at `src/app/api/cron/ingest-products/route.ts`).
- Clean tsc + lint, build not configured to ignore errors.
