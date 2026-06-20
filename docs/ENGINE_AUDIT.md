# Roomora AI Image-Generation Engine, Independent Audit

Date: 2026-06-20
Scope: end-to-end generation engine (restyle / match-a-photo / refine), prompt logic, the MiniMax composer, the reported "refine does nothing" symptom, and frontend wiring.
Method: full source read of `route.ts`, `prompts.ts`, `composer.ts`, `generation.ts`, `FlowProvider.tsx`, `ResultScreen.tsx`, `RefineScreen.tsx`, `store.ts`, plus ~30 live generations against the production model endpoints (fal Qwen-Image-Edit, fal Nano Banana) and the production MiniMax composer, scored by mean-absolute pixel diff and by eye.

---

## 1. Executive summary (for a non-engineer founder)

- The engine is well-architected and the core promise (restyle while preserving the real room's architecture) works. The architecture-lock genuinely keeps windows, doors and proportions, and a user note like "keep the chair" is honored. Restyle quality on Nano Banana is magazine-grade.
- The "refine returns a near-identical photo" symptom is REAL and I reproduced it. The dominant cause is NOT the lock fighting the edit and NOT the composer breaking. It is that **refine runs on the wrong model for the job and, separately, the result screen shows the wrong version after a refine.**
- Refine currently runs on **Qwen-Image-Edit**. Qwen does apply most edits, but it re-renders the ENTIRE image every time (it never returns "nothing"), drops resolution, closes the blinds, and shifts the whole look. So Qwen rarely looks "identical" but it also quietly degrades the user's design.
- **Nano Banana** (already used for restyle) is a far better surgical editor: it adds a TV, recolors a sofa, or removes a rug cleanly while keeping the rest pixel-faithful. BUT for SUBTLE or PROPORTION edits ("make the artwork bigger", "make the walls a warmer white") Nano frequently does almost nothing, returning a near-identical image. That is the exact symptom users report.
- There is a real frontend bug compounding it: after a refine, the result screen defaults to showing **version 1 (the original restyle), not the just-generated version.** The new version only appears as a small thumbnail the user must tap. So even when the model DID change something, the user can be looking at the pre-refine image and conclude "nothing happened."
- The refine composer can quietly drop the user's spatial intent. "Add a TV on the LEFT" was rewritten by MiniMax to "mount a TV above the sofa." The edit applies, but not where the user asked.
- Guidance tuning on Qwen (4 vs 7 vs 9) makes almost no difference to whether an edit lands. This is not a guidance-scale problem; do not chase it.
- Recommended priority order: (1) fix the result-screen "show newest version" bug, (2) move refine onto Nano Banana, (3) strengthen the prompt for subtle/size edits, (4) stop the composer from discarding spatial words.

---

## 2. How the engine actually works (per mode)

All three modes hit one route: `POST /api/generate` (`src/app/api/generate/route.ts`). It identifies the user, spends 1 credit (or checks the anon free-trial), resolves an input image URL, builds a prompt, calls one fal model, persists the PNG to Supabase, and writes a `generations` row. On any downstream error it refunds.

Model routing (`useNanoBanana = mode !== "refine"`):
- **restyle → Nano Banana** (`fal-ai/nano-banana/edit`). Input = the user's uploaded room photo.
- **match → Nano Banana**. Input = the user's room photo. The inspiration image never reaches the model; MiniMax captions its decor style only, and that caption is injected as text.
- **refine → Qwen-Image-Edit** (`fal-ai/qwen-image-edit`, `guidance_scale: 4`, `num_inference_steps: 30`). Input = the parent generation's `result_url`.

Prompt assembly (`src/lib/prompts.ts`):
- **Restyle**: `FURNISH` (magazine-quality lead-in) + per-style recipe (`STYLE_PROMPTS[style]`, furniture/decor only, never walls) + optional budget clause + `ARCHITECTURE_LOCK` (the spatial-fidelity clause) + `userOverride(note)` placed LAST as a hard override. Ordering is deliberate and correct: the note wins on recency and is phrased to beat the style.
- **Match**: identical shape, but the style recipe is replaced by `Match this decor style: <MiniMax caption>`.
- **Refine**: `"<instruction>. " + REFINE_LOCK` (change-only clause). The user's text is verbatim and first.

The composer (`src/lib/composer.ts`, gated by `COMPOSER_ENABLED=true`, currently ON). It only fires when the user typed a note.
- **Restyle/Match composer** (`composeRestylePrompt`): a MiniMax vision call reads the actual room photo + style + budget + note and writes one tailored 4-6 sentence restyle instruction, with strong rules to keep the room's function and existing big furniture. The caller then appends `ARCHITECTURE_LOCK` and re-appends `userOverride(note)` LAST, so the note still wins. The deterministic template is built first as a guaranteed fallback; any composer error/timeout (12s) silently falls back. This path is sound.
- **Refine composer** (`composeRefinePrompt`): a MiniMax vision call reads the current image + the refine request and rewrites it into one "surgical" instruction; the caller appends `REFINE_LOCK`. Fallback on error is the deterministic `"<instruction>. " + REFINE_LOCK`.

Frontend wiring:
- Restyle: `FlowProvider.doGenerate` sends `{mode, imageBase64, style, note, budget}`; on success calls `setResult(result)` and routes to `/result`.
- Refine: `RefineScreen` joins picked chips + free text into one `note`; `doApplyRefine` calls `generationService.refine({result, note})`, which sends `{mode:"refine", parentId: latestVersionId, note, style}`. Server reads the parent's `result_url` as the edit base, generates, and returns a new `generationId`/`resultUrl`. The client then appends the new version. `parentId` and `note` are wired correctly.

---

## 3. Findings

### F1, Refine runs on Qwen, which never returns "identical" but always degrades the design. (Severity: High. Confidence: High.)
Across 8 Qwen refine runs of "add a flat-screen TV" on the furnished `proof_japandi.jpg`, every run produced a global mean-abs pixel diff of ~21-24 and visibly: (a) added the TV, but (b) re-rendered the entire scene at clearly LOWER resolution, (c) changed the window blinds from open to closed, and (d) placed the TV partly OVER the window, contradicting the architecture intent. Qwen edits "land" but at the cost of resolution and global drift. So the literal "no change" symptom is unlikely to come from Qwen; the damage from Qwen is silent quality loss, not no-ops.

### F2, Nano Banana is a far better surgical editor for discrete edits, but no-ops on subtle/proportion edits. (Severity: High. Confidence: High.)
Same "add a TV" via Nano: diffs ~6.5-10, TV added cleanly to the wall, window and all furniture preserved, full resolution retained. "Make the sofa green" (diff 4.5) and "remove the rug" (diff 5.5) likewise applied cleanly and surgically.
BUT subtle / size / proportion edits no-op on Nano:
- "make the framed artwork bigger": 4 runs, diffs 1.86 / 2.74 / 3.48 / 3.64, artwork unchanged in size. Visually identical to the input.
- "make the walls a warmer white": diff 2.17, no visible change.
- "add a tall plant in the empty corner": diff 2.80, barely perceptible.
A diff under ~3 on this scoring is "looks like the same photo." This is precisely the reported symptom, and it is edit-dependent, not random.

### F3, The result screen shows the WRONG version after a refine. (Severity: High. Confidence: High.)
`ResultScreen.tsx` initializes `const [activeV, setActiveV] = useState(0)` and renders `afterUrl = versions[activeV].resultUrl`. After a refine the user is routed back to `/result`, the component remounts, `activeV` resets to 0, so the large Before/After image shows **version 1 (the original restyle), not the newly generated refine.** The new version is only the last thumbnail in the variation strip, which the user must tap. Even when the model genuinely changed the image, the user is shown the pre-refine version and concludes "nothing changed." This is independent of the model and likely a major contributor to the complaint.

### F4, The refine composer drops the user's spatial intent. (Severity: Medium. Confidence: High.)
"Add a flat-screen TV on the LEFT" was rewritten by MiniMax to "Mount a flat-screen TV on the wall above the sofa, centered..." The word "left" was dropped. The edit applied, but in the wrong place, which reads to the user as "it didn't do what I asked." The composer paraphrases faithfully for color/removal but tends to relocate spatial directions to what it thinks is aesthetically correct.

### F5, Guidance scale is not the lever. (Severity: Low. Confidence: High.)
Qwen at guidance 4 vs 7 vs 9 on the same "add a TV" prompt produced diffs of ~22 / ~24 / ~22 with no change in whether/where the TV landed. Tuning guidance will not fix refine reliability.

### F6, Architecture-lock and note-override work as designed. (Severity: none / positive. Confidence: High.)
A full restyle of the messy Paris room (Scandi, note "keep the wooden chair, do not remove it") via Nano preserved the windows, the balcony view, wall positions and camera angle, produced a magazine-quality result, and kept the chair on the left. The deterministic ordering (FURNISH → style → budget → ARCHITECTURE_LOCK → userOverride LAST) is correct and the note genuinely overrides the style.

### F7, `doApplyRefine` discards the service's result object and rebuilds it. (Severity: Low. Confidence: High.)
`generationService.refine` returns `next` with a correct `versions` array, but `doApplyRefine` ignores it and instead calls `setResult(result)` (the OLD object) then `appendVersion(newest)`. The net state is correct (versions = [...old, newest], generationId = newest.id), so there is no stale-image bug here, but the code is redundant and fragile; a future edit could easily reintroduce a stale-version bug. Not the cause of the symptom, but worth tidying.

### F8, Model mismatch between restyle and refine causes a visible quality cliff. (Severity: Medium. Confidence: Medium-High.)
Because restyle outputs a clean high-res Nano render and refine re-renders it through Qwen at lower fidelity, the FIRST refine visibly downgrades the user's design even when the edit is correct. Keeping both modes on the same model (Nano) removes this cliff.

---

## 4. Root cause of the refine "same photo" symptom

There are two independent causes, both real and both reproduced:

1. **Frontend (F3): after a refine, the result screen defaults to displaying version 1 (the pre-refine image), not the new version.** The user has to tap the last thumbnail to see what changed. For any user who doesn't, every refine "looks identical" regardless of what the model did. This alone can explain a large share of reports and is a pure UI fix.

2. **Model behavior, edit-dependent (F2):** the surgical editor (Nano) genuinely no-ops on SUBTLE and SIZE/PROPORTION requests ("make the art bigger", "warmer walls", "add a small plant"), returning a near-identical image (diffs 1.8-3.6 over repeated runs). Note current production refine is on Qwen, which instead always changes the whole image (so it rarely looks identical but quietly degrades quality). So the literal "identical photo" experience today most plausibly comes from F3 first, and from F2 once refine is (correctly) moved to Nano.

What it is NOT: it is not the architecture/refine lock fighting the edit (the lock is appended after the instruction and discrete edits land fine with it present), not a guidance-scale tuning issue (F5), not the composer crashing (it falls back cleanly), and not a wiring bug in parentId/note (those are sent correctly).

---

## 5. Recommendations (prioritized)

### Do now (high confidence)
1. **Fix the result screen to show the newest version after a refine (F3).** Initialize `activeV` to the last index (or set it to the newest version on arrival), so the large image is the just-generated one. Lowest-effort, highest-impact change; fixes the symptom for everyone whose model edit actually worked. Tradeoff: none.
2. **Move refine onto Nano Banana (F1, F2, F8).** For discrete edits (add/remove/recolor/replace an object) Nano is dramatically better: surgical, resolution-preserving, architecture-respecting. It also removes the restyle-to-refine quality cliff. Tradeoff: Nano no-ops on subtle/size edits (mitigate with #3); slightly different cost profile (Nano ~$0.039 vs Qwen). Worth A/B testing but my evidence strongly favors Nano.
3. **Detect and warn on no-op refines.** After a refine, compute a cheap pixel diff between parent and result; if below a threshold (~3 on a 256px mean-abs scale), surface a gentle "barely changed, try describing the change more concretely" hint and/or auto-retry once with a strengthened prompt. Turns an invisible failure into a recoverable one. Tradeoff: one extra image fetch + small compute.

### Worth testing further (medium confidence)
4. **Strengthen the refine prompt for subtle/size edits.** For Nano, append an explicit magnitude cue for proportion/color/lighting requests, e.g. "Make this change clearly and obviously visible." Test whether this lifts the "make the art bigger / warmer walls" no-op rate. Tradeoff: too-strong wording can cause over-editing; tune per edit type.
5. **Stop the refine composer from dropping spatial words (F4),** or turn the refine composer OFF. The deterministic refine prompt (`"<instruction>. " + REFINE_LOCK`) preserves the user's exact words including "left"; the composer paraphrases and sometimes relocates the edit. Options: (a) disable the composer for refine only and keep verbatim user text, or (b) add a rule to the refine composer system prompt: "Preserve any spatial words the user used (left, right, above, behind) exactly; never relocate the requested change." Tradeoff: the composer does help vague requests ("make it cozier" → concrete change); option (b) keeps that benefit.
6. **Keep the composer ON for restyle/match.** It is additive and safe there (note re-asserted after the lock, clean fallback). No change needed.
7. **Tidy `doApplyRefine` (F7)** to use the service's returned `next` object directly instead of rebuilding state. Prevents a future stale-version regression. Tradeoff: none.

### Do not do
- Do not chase Qwen guidance_scale (F5); it does not move refine reliability.

---

## 6. Test log

Scoring: diff = mean absolute pixel difference per channel on 256x256 resize (0 = identical; under ~3 ≈ "looks like the same photo"; high diff on Qwen reflects global re-render, not necessarily a better edit). All "applied?" judgments are by eye on the saved PNGs.

| # | Mode / input | Model (params) | Request | Composer output (if used) | diff | Applied? | Notes |
|---|---|---|---|---|---|---|---|
| 1-4 | refine / furnished japandi | Qwen g4 | add flat-screen TV | "mount TV above sofa, centered..." | 21.6 / 22.2 / 22.9 / 22.2 | yes (4/4) | TV over window; res dropped; blinds closed |
| 5-6 | refine / furnished | Qwen g4 | add TV (deterministic prompt) | n/a | 21.3 / 21.0 | yes | same global drift |
| 7-8 | refine / furnished | Qwen g7 | add TV | same composed | 24.0 / 23.7 | yes | guidance has no effect |
| 9-10 | refine / furnished | Qwen g9 | add TV | same composed | 22.5 / 22.2 | yes | guidance has no effect |
| 11-13 | refine / furnished | Nano | add TV | same composed | 7.8 / 6.5 / 10.1 | yes (3/3) | clean, res preserved, window kept |
| 14-15 | refine / furnished | Qwen g4 | make sofa green | "change sofa to green..." | 22.5 / 23.6 | yes | green applied, global drift |
| 16 | refine / furnished | Nano | make sofa green | same | 4.5 | yes | surgical recolor, rest identical |
| 17-18 | refine / furnished | Qwen g4 | remove the rug | "remove rug, parquet visible" | 19.2 / 19.5 | yes | rug gone, global drift |
| 19 | refine / furnished | Nano | remove the rug | same | 5.5 | yes | surgical removal |
| 20-21 | refine / furnished | Qwen g4 / Nano | make it cozier | "add throw blanket + warm lamp" | 20.5 / 6.1 | yes | both added throw + lamp |
| 22 | refine / furnished | Qwen g4 | warmer white walls | "warmer white tone..." | 20.5 | partial | global tint |
| 23 | refine / furnished | Nano | warmer white walls | same | 2.2 | NO-OP | near-identical (symptom) |
| 24 | refine / furnished | Qwen g4 | add plant, keep sofa | "add tall plant left of sofa" | 17.5 | yes | plant added |
| 25 | refine / furnished | Nano | add plant, keep sofa | same | 2.8 | barely | very subtle (symptom) |
| 26 | refine / furnished | Qwen g4 | make artwork bigger | "increase artwork size..." | 18.8 | partial | arguably slightly larger |
| 27 | refine / furnished | Nano | make artwork bigger | same | 1.9 | NO-OP | identical (symptom) |
| 28-31 | refine / furnished | Nano | make artwork bigger (deterministic) | n/a | 1.86 / 2.74 / 3.48 / 3.64 | NO-OP (4/4) | reproduces "same photo" reliably |
| 32 | restyle / messy Paris room | Nano | Scandi, no note | n/a |, | yes | architecture preserved, magazine-quality |
| 33-37 | restyle→refine chain / messy | Nano restyle then Qwen g4 x3 + Nano x2 | add TV on the left | "mount TV above sofa..." (dropped "left") | 5.6/6.0/6.0 (Qwen), 5.5/8.5 (Nano) | yes (5/5) | TV added but NOT on the left (F4) |
| 38 | restyle / messy | Nano | Scandi, note "keep the wooden chair" | n/a (deterministic override) |, | yes | chair kept on left, architecture preserved (F6) |

Approx. 30 fal generations + ~10 MiniMax composer calls. No application source files were modified.
