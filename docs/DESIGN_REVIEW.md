# Roomora design audit

Independent design crit of the live app at https://room-ora.com, reviewed mobile-first at 390x844. Read-only audit plus proposed before/after mockups. No app source was changed. Mockups and screenshots live in `%TEMP%` (`C:\Users\glygs\AppData\Local\Temp\`).

The starting point is good. The palette is genuinely distinctive (warm sage and brass, not the usual SaaS blue-gray), the copy is calm and trust-led, and the spatial-fidelity promise is clear. "Off" is the right word for what is wrong: the bones are right, but the app reads like a competent template rather than a product made by people who design rooms for a living. The fixes below are mostly about motion, hierarchy, and making the one magic moment (the reveal) feel like a moment.

---

## Method and evidence

- Live screenshots captured at phone width via the gstack headless browser:
  - Landing: `design-before-landing.png`
  - Setup top: `design-before-setup-top.png`
  - Setup style grid: `design-before-setup-grid.png`
- Generating and Result screens were assessed by reading the component source (paid generation not triggered):
  - `src/components/screens/GeneratingScreen.tsx`
  - `src/components/screens/ResultScreen.tsx`
  - `src/components/screens/RefineScreen.tsx`
  - `src/components/screens/ErrorScreen.tsx`
  - `src/components/ui/BeforeAfter.tsx`, `StyleTile.tsx`, `Btn.tsx`
- Tokens and intent cross-checked against `roomora-app/CLAUDE.md` and the handoff `design_handoff_roomora/README.md`.

---

## Per-screen findings

### 1. Landing
Live render is clean and the hero copy is strong. Issues:

- **Order of operations buries the magic.** The eye hits the headline, then a large empty dashed dropzone, then a wall of fine print ("1 free try, no signup / sign up for 3 more / then buy credits"), and only at the very bottom does the interactive before/after proof appear (half of it sits under the bottom nav in the capture). For a design app, the proof IS the pitch. It should come before or beside the upload box so a first-time visitor feels the result before being asked to do work.
- **Two stacked credit-explainer lines** under the dropzone are redundant and read as nervous. One line is enough; the pricing ladder can live in the buy-credits sheet.
- **The proof slider gives no signal it is draggable.** No handle pulse, no "drag" affordance on the image itself (the "Drag to compare" label is easy to miss). Best-in-class comparison UIs (Apple product compare, NYT before/after photo essays) animate the handle on first paint so the user learns the gesture without reading.
- **Bottom nav (Home / Designs / Account) shows on the Landing screen.** The handoff specifies bottom nav on Home / My Designs / Account only. On a no-signup marketing landing it adds chrome and competes with the single intended action (upload).

### 2. Setup / style picker
The live grid now uses real style photography (good, this beats the tonal placeholders the prototype shipped with). Issues:

- **The grid is a flat 2-column wall of ten near-identical tiles.** Every tile has equal visual weight, the same dark gradient label bar, and the same proportions, so nothing guides the choice. There is no notion of "popular", "recommended for your room", or any editorial point of view. This is the single most "AI-generated-template" moment in the app.
- **Sticky CTA overlaps content mid-scroll.** In `design-before-setup-grid.png` the "Generate design" button floats over the middle of the tile grid with only a soft paper gradient behind it, so tiles bleed through and the button competes with the imagery. The gradient fade is too short for a grid this dense.
- **Label typography fights the photo.** White text with a drop-shadow over a full-bleed photo plus a second muted line (the other language) is the generic stock-photo-card pattern. It works but it is not crafted.
- **No selected-state confirmation near the action.** When you pick a style, the only feedback is a ring on a tile that may have scrolled off-screen by the time you reach the CTA. The CTA does not name what you selected.

### 3. Generating (read from code)
`GeneratingScreen.tsx` is the weakest screen and the biggest missed opportunity. Current build: the user's photo blurred and dimmed, a generic CSS border-spinner, one rotating reassurance line, a lock line, and four equal-width progress bars labelled Layout / Furniture / Lighting / Details that fill on a fixed `setInterval` timer.

- **The spinner is a generic loading spinner.** A design app should never show the same spinner as a tax form. There is no sense of a designer at work, no spatial scanning, nothing tied to "we are reading YOUR room".
- **Progress is faked on a timer, not the job.** Acceptable as a placeholder, but the four-bar pattern reads as a generic skeleton. The labels are good content trapped in a weak form.
- **Reassurance copy is excellent and under-used.** "Keeping your windows where they are" is exactly the brand promise; it deserves more visual prominence than a single fading subline.

### 4. Result / Reveal (read from code)
This is the emotional payoff and currently it is static. `ResultScreen.tsx` mounts the `BeforeAfter` slider at a fixed `pos = 54` with no entrance animation.

- **No reveal animation.** The single highest-leverage change in the whole app: the after image should animate in (wipe, or the divider sweeping from one edge to settle at ~55%) so the restyle literally reveals itself on arrival. Right now it just appears, pre-split. The "wow" is left on the table.
- **No drag affordance on the hero slider either.** Same issue as Landing: the handle is static. A one-time pulse plus a "Drag to reveal your room" hint teaches the gesture and invites play.
- **Variation strip is functional but plain.** Equal thumbnails with v1/v2 captions; the dashed "more" slot reads as broken rather than inviting. A "+" affordance communicates "generate another" better than the word "variation".
- **Three equal action tiles (Save / Download / Share) compete with the brass Refine CTA.** Refine is the differentiator and the next paid action; it is below three same-weight tiles. Hierarchy is slightly flat.

### 5. Refine (read from code)
Solid. Good reassurance banner ("Everything you don't mention stays exactly the same"), suggestion chips, version history. Minor: chips and the textarea have no selected-count or character feedback, and the screen has no entrance motion. Lower priority than the four above.

### 6. Error (read from code)
Genuinely well done. Warm clay danger color (not alarm red), credit-refund pill, two clear recovery actions. This is the polish level the rest of the app should match. No change needed.

---

## Cross-cutting observations

- **Motion is the consistent weak spot.** Buttons have `active:scale-[.98]` and that is essentially the entire motion vocabulary. There are no screen-entrance transitions, no reveal on the result, no handle hints, no skeleton-to-content crossfade. A design app is judged on feel; static screens read as a prototype. This is the through-line behind the founder's "something is off".
- **Hierarchy is flat in two key places** (style grid, result actions). Everything is the same weight, so nothing leads.
- **Typography and color are on-brand and consistent** across what was reviewed; the EN and 中文 mixing renders correctly. No token drift spotted in the live build versus the system.
- **The trust/fidelity messaging is a real asset** and is used well. Lean into it visually (the lock motif, the "still your room" banner) rather than only in copy.

---

## Prioritized recommendations (impact vs effort)

| # | Recommendation | Screen | Impact | Effort | Before / After |
|---|---|---|---|---|---|
| 1 | Animate the before/after reveal on arrival + add a pulsing handle and "drag to reveal" hint | Result | Very high | Low-Med | `design-before-*` (result via code) / `design-after-result.png` |
| 2 | Replace the generic spinner with a "scanning your room" sequence: sweep band over the user's photo, corner reticles, and a real checklist (Reading room, Mapping layout, Choosing furniture, Matching light) | Generating | High | Med | code / `design-after-generating.png` |
| 3 | Give the style picker hierarchy: a "Popular in Paris" featured row above the full grid, lighter label treatment, selected-style confirmation; fix the sticky CTA so it sits on a solid dock and names the selection | Setup | High | Med | `design-before-setup-grid.png` / `design-after-setup.png` |
| 4 | Reorder Landing so the live proof slider sits high (before the dropzone), collapse the double pricing line to one, add the drag affordance, drop bottom nav from Landing | Landing | Med-High | Low | `design-before-landing.png` / `design-after-landing.png` |
| 5 | Promote Refine above the three action tiles (or make the action tiles secondary/smaller) so the differentiator leads | Result | Med | Low | included in #1 mockup |
| 6 | Add light screen-entrance transitions (fade/slide-up, ~250ms) across all screens for a more crafted feel | All | Med | Low | n/a (motion) |
| 7 | Add a one-time handle pulse to the Landing proof slider so the drag gesture is discoverable | Landing | Low-Med | Low | shown in `design-after-landing.png` |

Highest impact-to-effort: #1 (reveal animation) and #4 (Landing reorder). #1 is the single change most likely to fix "something is off" because it turns the payoff screen from static into a moment.

---

## Before / after image files

All paths are under `C:\Users\glygs\AppData\Local\Temp\`.

Before (live screenshots / current state):
- `design-before-landing.png` (live)
- `design-before-setup-top.png` (live)
- `design-before-setup-grid.png` (live, shows the CTA-overlap issue)
- Generating and Result: current state read from component source, no paid screenshot.

After (proposed mockups, on-brand Sauge Doré, 390px):
- `design-after-result.png` + source `design-after-result.html`
- `design-after-generating.png` + source `design-after-generating.html`
- `design-after-setup.png` + source `design-after-setup.html`
- `design-after-landing.png` + source `design-after-landing.html`

The mockups are static stills; the proposed animations (reveal wipe, handle pulse, scanning sweep) are present as CSS keyframes in the HTML sources and described above. They are illustrative direction, not production code.

---

## What is already good (leave alone)
- Palette and overall warmth; it does not look like every other AI app.
- Error screen handling (warm danger, refund pill, clear recovery).
- Trust and fidelity copy throughout.
- The real Before/After slider component logic (pointer + touch, clamped 3-97%). It just needs entrance motion and a discoverability hint, not a rebuild.
- EN / 中文 bilingual rendering and fit.
