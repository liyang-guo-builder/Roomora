@AGENTS.md

# Roomora — project guide for Claude

## What this is
Roomora: a mobile-first, bilingual (English + 简体中文) web app that turns a photo of a user's **real room** into a realistic restyled version that **stays recognizably their room** (same walls, windows, doors, proportions), with natural-language refinement. Credit-based. Distribution: RedNote + Instagram/TikTok. Users: people furnishing apartments in Paris/France/Europe.

Core promise: **"Redesign your real room. It stays your room. You control what changes."** The differentiator (validated by user research) is *trustworthy spatial fidelity* — never hallucinate windows/doors; only change what the user asks.

## Design source of truth
The Claude Design handoff lives at `../Roomora/design_handoff_roomora/`:
- `README.md` — full spec: tokens, every screen, modals, edge states, interactions, state model, build order, parity checklist. **Authoritative.**
- `Roomora.html` — runnable prototype = the **visual source of truth**.
- `roomora/*.jsx` — prototype component source (React + Tailwind via in-browser Babel). **Reference, not code to copy** — recreate as real ES modules. Do NOT carry over `window`-globals / CDN / Babel.

Port rule: components carry the prototype's **exact `className` strings**; tokens resolve to the exact hex/px below; both EN + 中文 must fit every screen.

## Stack (locked)
- **Next.js 16 (App Router) + TypeScript**, full-stack on Vercel. React 19.
- **Tailwind v4** (CSS-based config — NO `tailwind.config.js`).
- **Zustand** global store (`lang`, `credits`, `saved`); **TanStack Query** for the async generation job.
- **Supabase** (Postgres + Auth + Storage) for backend (Phase 2+).
- Engine (Phase 3): decided by spike — MiniMax Image-01 vs Qwen-Image-Edit (fal). Keys are server-side only.

## ⚠️ Next.js 16 / Tailwind v4 gotchas (this is NOT the Next you may know)
Before writing framework code, consult `node_modules/next/dist/docs/01-app/...`. Key points already confirmed:
- **Tailwind v4**: globals.css uses `@import "tailwindcss";` and an `@theme { ... }` block for tokens. There is no `tailwind.config.js`. Define every Sauge Doré color as `--color-<name>` inside `@theme` so utilities like `bg-sage`, `text-ink-2`, `border-line` work. Custom radii/shadows/font tokens also go in `@theme`.
- **Server vs Client Components**: pages/layouts are Server Components by default. Any file using `useState`/`useEffect`/`onClick`/`localStorage`/context MUST start with `'use client'`. Mark the interactive leaves, not the whole tree. Context providers (Zustand provider, React Query provider) must be `'use client'` and wrap `{children}` in the root layout.
- **Fonts**: use `next/font/google` for **Schibsted Grotesk** (latin) and **Noto Sans SC** (CJK). Expose as CSS variables and reference in `@theme` so the stack is `'Schibsted Grotesk','Noto Sans SC',system-ui,sans-serif` for correct per-glyph mixed EN/中文 rendering. Replace the starter Geist fonts.
- **Route handlers** (API): `src/app/api/<name>/route.ts` exporting `GET`/`POST`. `params` is a Promise in v16 — `await params`.
- **Server secrets**: only `NEXT_PUBLIC_`-prefixed env vars reach the client. Model/API keys must NEVER be `NEXT_PUBLIC_`.

## Design tokens — palette "Sauge Doré" (put these in `@theme`)
| Token | Hex | Use |
|---|---|---|
| `sage` | `#7C8866` | Primary accent, CTAs, active states, links |
| `sage-deep` | `#69755A` | Primary hover/pressed |
| `sage-tint` | `#E7EBDF` | Soft sage bg (info banners, chip bg) |
| `brass` | `#B79A5E` | Secondary accent (refine CTA, credit hex) |
| `brass-deep` | `#9E8348` | Brass hover |
| `brass-tint` | `#F1EBDA` | Soft brass bg |
| `paper` | `#F6F3EA` | App background |
| `surface` | `#FDFBF6` | Cards / inputs / raised surfaces |
| `surface-sunk` | `#EDE8DA` | Sunken (tab track, segmented control bg) |
| `line` | `#E6E0D0` | Borders / dividers |
| `ink` | `#3C3B30` | Primary text |
| `ink-2` | `#6E6B59` | Secondary text |
| `ink-3` | `#9C9885` | Tertiary/muted text, placeholders |
| `danger` | `#B5654A` | Errors, low-credit, sign-out (warm clay) |
| `danger-tint` | `#F3E4DB` | Soft danger bg |

Radius: button `14px`, card `20px`, input `12–14px`, style tile `16px`, pill `full`, bottom sheet top `26px`, phone screen `42px`.
Shadows (warm, low contrast): `shadow-card` = `0 1px 2px rgba(60,59,48,.04), 0 6px 20px -10px rgba(60,59,48,.12)`; `shadow-soft` = `0 8px 30px -8px rgba(60,59,48,.18)`; primary-button glow = `0 8px 22px -8px rgba(124,136,102,.7)`.

## i18n approach (decided)
The prototype uses inline `t('English','中文')`. To port faithfully and fast, replicate that exact signature: a lightweight `useT()` client hook that reads `lang` from the Zustand store and returns `t(en, zh)`. (Pragmatic deviation from the handoff's react-i18next/JSON suggestion — keeps porting near-mechanical and parity exact. Can migrate to message catalogs later if needed.)

## Operating mode: three-agent loop
Per `~/Documents/Obsidian Vault/_claude/reference/claude-code-build-playbook.md`:
- **Orchestrator** (main session): specs, decisions, docs, spawns devs + tester.
- **Developer** (this session or a sub-agent): implements per spec; always type-check + build + lint before declaring done.
- **Tester** (`tester` subagent_type, ZERO codebase context): verifies observable behavior + visual parity against the prototype, on the live URL, via gstack `/browse`. Report-only.
Ship a user-facing feature only after the tester passes. Max 3 fail iterations, then escalate.

## What NOT to do
- Don't expose model/API keys to the client (no `NEXT_PUBLIC_` on secrets).
- Don't invent final assets — keep tonal-placeholder imagery and monogram auth/pay buttons as clearly-marked placeholders (real images come from generation; official SDK buttons come later).
- Don't ship shadcn/library default styling — restyle to the prototype's exact classes.
- Don't enforce credits on the client only — the ledger is server-enforced (Phase 2+). Phase 1 uses typed mock services.
- Payment (Stripe/WeChat Pay), "Match a photo" engine flow, and WeChat login are **deferred** — keep them as designed placeholders.

## Validation before "done"
`npx tsc --noEmit` clean · `npm run build` succeeds · `npm run lint` passes · dev server renders the flow · both languages fit every screen.
