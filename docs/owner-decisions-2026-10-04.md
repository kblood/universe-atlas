# Owner decisions sheet — 2026-10-04

This is one list of every question that is waiting on the owner. It was assembled from existing documents only. No test, build, capture, Luna or Astra call was made for it, and no number below was re-measured. Every number is quoted from the document named in the Evidence line.

**Rules of this sheet.**
- **OPEN means the owner has not answered.** Nothing in section A is passed, accepted or decided. The "Recommended default" is a proposal. Work may proceed on a default behind a named constant, but doing so does not close the item.
- Section B lists what the owner has already decided, with the date where a source records one.
- Section C lists open items that are not owner questions (missing measurements). They stay OPEN too.
- Paths are relative to `C:/LLM/IWSDK/universe-atlas/` unless they start with `docs/` at the IWSDK root, which is written `IWSDK/docs/`.

## A. Questions waiting on the owner (all OPEN)

| # | Item | Blocks | Recommended default |
|---|---|---|---|
| A1 | Lethuris L6 `name` ceiling 6.9 to 7.0% | merge hygiene | accept 7.0% as a documented exception |
| A2 | Reduced seabed detail | task 12 scope | geometry detail stays by distance to seabed; fix tint, fog and caustics only |
| A3 | Strict post-relief LOD class/colour targets | task 11 and LOD work | keep the shipped-ceiling map as the gate, track the strict target as a goal |
| A4 | Weak range snow (D1) | task 11, task 13 | fix in the renderer (soil multiplier on snow, exposure), classifier unchanged first |
| A5 | Horizon presentation on other worlds (D2) | task 11 | re-pose sun-aware with a picked-range rule, no terrain change |
| A6 | Landing no-summit | task 4 | keep the formula and add a targeted summit rejection |
| A7 | Flooded ground bookmark | task 4 | hover above the saved direction, notice shown |
| A8 | Cloud deck above p99 land | task 11 | do it in task 11, cloud top above p99 land |
| A9 | Shadow `normalBiasM` .30 | none | confirm .30 |
| A10 | WP6 RMSE waiver (`613e292`) | none | confirm the waiver |
| A11 | EC4 proboscis triangle allowance +600 to +800 | DECIDED 2026-10-04 (moved to section B) | n/a |
| A12 | Geophysics g versus catalogue `massKg` | task 9 and later climate | keep option (a) now; reconcile masses only when orbits must match |
| A13 | Project licence | tasks 21 and creature extraction | private and unlicensed for now, `NOASSERTION` stays |
| A14 | Upload and GitHub/Pi migration authorisation | task 21 | not authorised until the owner says so |
| A15 | Biome2 question: harness site and SITE_A (old Q2) | task 2, task 9 | confirm the P6 move |
| A16 | Biome2 question: planet day lengths (old Q4) | task 9 | keep belts fixed this round |
| A17 | Biome2 question: life on air-but-no-ocean planets (old Q5) | tasks 9, 15 | yes, as its own versioned change |
| A18 | Creature extraction Q1 to Q7 | creature-split, task 10 | the seven defaults below |

### Relief round items

#### A1. Lethuris L6 `name` ceiling 6.9 to 7.0%
- **State:** OPEN, owner.
- **Question:** The biome-name disagreement between LOD levels on Lethuris at L6 measures 6.99% on relief terrain. The shipped ceiling was 6.9%. The relief round loosened that one cell to 7.0%. Every other cell tightened or was dropped.
- **Evidence:** `docs/terrain-relief-v1.md` section 8 (ceiling maps, old and new); `docs/relief-round-2026-10-03.md` section 4 item 1 and section 14 item 1; `tests/lod-consistency.test.mjs` (`SHIPPED_CEILINGS`).
- **Options:**
  1. Accept 7.0% as a documented exception.
  2. Reject it: retune the terrain or classifier until L6 `name` is at most 6.9%, which means another terrain version bump and golden re-pin.
  3. Raise the whole Lethuris row to a justified new number after a measurement.
- **Recommended default:** option 1. The carried name on the same tiles improves 8.88 to 8.15%, and the change is 0.09 points.
- **Cost of waiting:** none for work. The test carries the 7.0 value and is not green because of a waiver, so the cell must stay labelled "pending owner".

#### A2. Reduced seabed detail
- **State:** OPEN, owner. The 2 km ocean band itself is decided (section B).
- **Question:** Is the seabed seen from well above the 2 km surface band detailed enough? Luna called the seabed "smooth and featureless" on every world, and said Maithea's "does not clearly read as underwater".
- **Evidence:** `docs/relief-round-2026-10-03.md` section 4 item 2 and section 7; `docs/lod-ladder-contract-v1.md` sections 7 and 7.1; `docs/terrain-relief-v1.md` Seabed (decision 5).
- **Options:**
  1. Keep geometry detail by distance to the seabed (decision 5) and make it read as underwater through tint, fog, caustics and surface fade. No geometry change.
  2. Raise seabed geometry detail for views from above the band. This costs triangles and touches the LOD ladder.
  3. Add a seabed-only texture detail layer, without extra geometry.
- **Recommended default:** option 1, then judge with Luna. Revisit options 2 and 3 only if Luna still fails.
- **Cost of waiting:** task 12 can do underwater tint, fog and caustics either way. Geometry detail stays out of scope until answered.

#### A3. Strict post-relief LOD class/colour targets
- **State:** OPEN. The strict class (0.5%) and colour (12 / 4 RGB) tolerances are still exceeded at L6 and L8, as they were on shipped terrain.
- **Question:** Is the strict target a goal, a gate, or retired?
- **Evidence:** `docs/terrain-relief-v1.md` section 8; `docs/relief-round-2026-10-03.md` section 4 item 3 and section 14 item 2.
- **Options:**
  1. Keep the shipped-ceiling map as the enforced gate and the strict tolerance as a tracked goal.
  2. Make the strict tolerance a gate. This needs a design change in how LOD classes are derived.
  3. Retire it and declare the ceiling map the contract.
- **Recommended default:** option 1.
- **Cost of waiting:** none.
- **Added 2026-10-05 (mountains), still OPEN:** should the class/colour/retention limits measured on the new *massif tile set* (mountain tiles, MTN-6 T6) **block** the mountain merge? Until Kasper answers they are report-only. See `docs/mountains-opus-decisions-2026-10-05.md`, Q6 item 2 and the 2026-10-05 Astra addendum item 2.
- **Added 2026-10-08 (surface-climate-2, R5-ATLAS-CLIMATE-M1):** the climate change re-pinned 20 `SHIPPED_CEILINGS` cells in `tests/lod-consistency.test.mjs` and added a Maithea L6 snow-kept retention limit of 95.2 % (target 98 %). Heights and ocean are unchanged; the cells moved through snow, forest and class (bisect: step 1 PDD snow, step 2 warm-column lapse, step 5 PET moisture). Rows now above a **plan** tolerance that had none before: Maithea L6 forest 1.85 % (plan 0.5), Maithea L8 RGB p99 5.75 (plan 4) and forest 0.69 % (0.5), Lethuris L10 RGB p99 1.28 (plan 1), name 0.94 % (0.5) and carried name 0.92 % (0.5). `LOD_TOLERANCES` is unchanged; option 1 (ceiling map as gate, strict tolerance as goal) is what this applies. Opus-decided on Kasper's instruction, overrulable (climate-m1-decision-2 (b)). Ledger: `docs/surface-climate-v2.md` section 6b.

#### A4. Weak range snow (D1)
- **State:** OPEN. The data says snow (98.7% of the SNOW constant on the sampled range); the render reads pale grey. The Maithea 15-40% snow band was accepted only "as long as ranges have snow", so that condition is not met visually.
- **Evidence:** `docs/terrain-relief-v1.md` section 13 (D1) and section 14 item 3; `test-results/relief-round-2026-10-03/P4-RELIEF/r3/`.
- **Options (each its own version bump):**
  1. A snow branch in `ground-material.ts` that skips the soil multiplier where snow dominates.
  2. A slope or exposure term in the terrain snow colour, which also needs a matching classifier rule.
  3. A tone-mapping or exposure review of sunlit snow against the sky.
- **Recommended default:** option 1 first, then option 3. Option 2 is a model change and comes last.
- **Cost of waiting:** task 11 acceptance on "polar areas read as snow" cannot pass without a renderer change.
- **Follow-up added 2026-10-08 (surface-climate-2; LOD owner + A4 renderer):** under PDD snow and height-dependent moisture the snow and forest edges follow height closely, so coarse and fine tiles disagree more where they meet: Maithea L6->7 RGB p99 15.2 -> 43.0, L6 snow kept 99.0 -> 95.3 %, L6 forest disagreement 0.42 -> 1.85 %; Lethuris L6->7 RGB p99 20.5 -> 58.1, L8->9 15.2 (was 5.2). Options: carry the snow and forest edges across levels (as the coarse retention already does for peaks), or blend colour across levels. No code in M1. Bisect: `test-results/climate-m1/resume/lod-bisect.json`.

#### A5. Horizon presentation on the other worlds (D2)
- **State:** OPEN. Raiva, Selawyn and Lethuris horizon poses use an arbitrary first-range rule and were never re-posed sun-aware. Luna called the horizons "low, hazy" and "washed out" on Maithea, Raiva and Lethuris. Selawyn read best.
- **Evidence:** `docs/terrain-relief-v1.md` section 13 (D2) and section 14 item 4; `docs/relief-round-2026-10-03.md` section 7.
- **Options:**
  1. Re-pose captures with a sun-aware picked-range rule. This is a capture change only.
  2. Also change the terrain so ridges stand out more. This moves the golden terrain digest.
- **Recommended default:** option 1 first.
- **Cost of waiting:** none for tests. Judgement frames stay unrepresentative.

#### A6. Landing no-summit
- **State:** OPEN. Two `todo` tests exist and do not pass.
- **Question:** The landing ceiling is `0.8 x bound.maxM` and was kept by the owner. On relief terrain it is 3.2-5.3 km, above p99 land on every fixture world, so it no longer keeps landing picks off summits. Summit picks at the datum sea, out of 256: Maithea 2, Selawyn 6, Raiva 6, Lethuris 2.
- **Evidence:** `docs/lod-ladder-contract-v1.md` section 7.2; `docs/relief-round-2026-10-03.md` section 4 item 6; `tests/render-bounds.test.mjs`.
- **Options:**
  1. Keep the formula and add a targeted summit rejection in the landing-site pick.
  2. Change the formula (for example, a p99-based ceiling).
  3. Accept summit landings.
- **Recommended default:** option 1 (the owner kept the formula and asked for a targeted no-summit test).
- **Cost of waiting:** none. Task 4 can implement option 1 without a further answer.

#### A7. Flooded ground bookmark
- **State:** OPEN, owner.
- **Question:** A ground bookmark stores a direction, not a height. If that site is now under the sea, `prepareLanding` falls back to `exploreTerrain()` and lands at a different walkable site near the view. The catalogue-date sea is now 0 instead of about -4500 m, so old coastal bookmarks can be flooded.
- **Evidence:** `docs/relief-round-2026-10-03.md` section 3 (Bookmarks), section 4 item 12 and section 8 (Astra P6 finding 1); `src/main.ts` `prepareLanding`.
- **Options:**
  1. Keep the saved direction and hover above the water, with a one-line notice.
  2. Move to the nearest shore along the saved direction.
  3. Keep today's fallback (a different site) and document it.
- **Recommended default:** option 1. The link means "this place", and it is the least surprising. It needs a browser check.
- **Cost of waiting:** task 4 will implement the recommended option behind a named constant until the owner answers.

#### A8. Cloud deck
- **State:** OPEN (deferred).
- **Question:** The cloud-deck part of the P5 plan was removed from the increment. Clouds hide the range in the normal mountain frame, and with clouds hidden Luna still reads only "a subdued ridge".
- **Evidence:** `docs/relief-round-2026-10-03.md` section 4 item 7 and section 7; `docs/lod-ladder-contract-v1.md` section 7.2 (clouds deferred); P5 commit `8241fcb`.
- **Options:**
  1. Put the cloud top above p99 land on every world, done inside task 11.
  2. Make clouds optional or thinner in ground and horizon poses.
  3. Leave clouds as they are and capture with the layer hidden.
- **Recommended default:** option 1.
- **Cost of waiting:** the mountain frames keep failing Luna.

### Elsewhere

#### A9. Shadow `SURFACE_SHADOW.normalBiasM` .30
- **State:** OPEN, owner confirmation outstanding.
- **Evidence:** `docs/biome-climate-increment-1-2026-10.md` (wave 1 fixes, `cccf15a`; render-path list); `src/surface-lighting.ts:8`.
- **Options:** keep .30 (removed shadow-acne banding on snow); go back to .06; pick an intermediate value after a capture.
- **Recommended default:** keep .30.

#### A10. WP6 RMSE waiver (`613e292`)
- **State:** OPEN. The coordinator, not the owner, waived the gate and merged.
- **Question:** The individual-RMSE gate (at least 6% for v0 versus v2, four archetypes) is unmet for low-slung (5.34%) and long-neck (5.77%). The six-pair means are 5.7% for both.
- **Evidence:** `docs/fauna-variation-realism-round-2026-10-02.md` "Gates not met and deferred work" item 1.
- **Options:** confirm the waiver; or revert merge `613e292` and fix-up `d0a9267` (no other package depends on WP6).
- **Recommended default:** confirm the waiver, as the source recommends. Widening the spreads would fit the metric rather than fix it.

#### A11. EC4 proboscis triangle allowance +600 to +800
- **State:** DECIDED by the owner on 2026-10-04 (after this sheet was written): +800 accepted as a dated exception, and EC4 was merged (`f3994e5`). See section B. The text below is kept as it was when the item was open.
- **Question:** The plan allowed the proboscis head group at most legacy +600 triangles. The branch's test relaxes that to +800, as an acceptance change rather than a digest repin. Luna passed all four trunks in 2 of 2 runs at a13, but its verdicts varied between runs earlier (a9 passed once, then failed on identical pixels).
- **Evidence:** `test-results/finish-round-2026-10-04/EC4-astra-readiness/astra-answer.md`; `test-results/eye-round-2026-10-03/EC4-handoff.md`; `docs/fauna-face-eye-round-2026-10-02.md:149`.
- **Options:**
  1. Accept +800 and record it as a dated exception.
  2. Reduce the trunk geometry to fit +600 (this means redoing a Luna-passed shape).
  3. Choose another number after a triangle measurement.
- **Recommended default:** none. The owner has not decided, and the branch stays held. Astra's readiness review asked for the exception to be recorded or the original requirement met.
- **Also open on this branch:** full `npm test` and composer browser suite, and the faceting and seam-line issues.

#### A12. Geophysics g versus catalogue `massKg`
- **State:** OPEN (the interim rule is decided: see section B).
- **Question:** `planetGeophysics` gives surface gravity from density and radius. It disagrees with `G*massKg/R^2`: Selawyn 18.56 versus 11.48, Lethuris 17.66 versus 12.07, Maithea 6.82 versus 6.97, Raiva 2.55 versus 2.69 m/s2. Should the catalogue masses be reconciled?
- **Evidence:** `docs/planet-geophysics-v1.md` "Gravity is for surface physics only"; the biome2 plan question 3 (`biome2-plan.json` `openQuestionsForUser`).
- **Options:**
  1. Keep the split (decided for now). Surface physics uses geophysics g; orbits use catalogue mass.
  2. Change catalogue masses so both agree. This changes moon counts, orbits, old bookmarks and the golden `systems` digest.
- **Recommended default:** option 1, and revisit only if orbits must match.

#### A13. Project licence (DECIDED 2026-10-07: same as the rest = private, `UNLICENSED`; see "Owner answers 2026-10-07")
- **State:** OPEN. No LICENSE file exists anywhere in IWSDK or Atlas.
- **Evidence:** `IWSDK/docs/creature-kit-extraction-plan-2026-10-04.md` question 3; `IWSDK/docs/atlas-backlog-2026-10-04.md` task 21; `README.md` (third-party notice only).
- **Options:** private and unlicensed (`NOASSERTION`); MIT for code and CC0 for generated creatures; another licence.
- **Recommended default:** private and unlicensed for now. Sidecars stay `NOASSERTION`, which is honest. A publishing decision comes later.
- **Consequence:** the provenance gate in task 21 will list `NOASSERTION` assets as an explicit, dated allowlist.

#### A14. Upload and migration authorisation
- **State:** OPEN. Nothing has been authorised.
- **Question:** The GitHub/Pi migration needs the owner's explicit go-ahead before any push, remote change, issue creation or upload of assets. Preparation (ref inventory, largest-files report) can be done without it.
- **Evidence:** `IWSDK/docs/agent-collaboration-proposal-2026-10-03.md`; `IWSDK/docs/atlas-backlog-2026-10-04.md` task 21; `C:/LLM/IWSDK/AGENTS.md` (no upload of private assets or publishing without explicit authorisation).
- **Recommended default:** not authorised.

#### A15 to A17. Biome increment 2 questions
The five questions in `biome2-plan.json` (`openQuestionsForUser`) were written before relief. Their current state:

| Old Q | Subject | State now | Evidence |
|---|---|---|---|
| 1 | "Whiter Maithea" (about 76% snow) | Moot. Relief landed and Maithea snow is 19.6%, inside the accepted 15-40% band. | `docs/terrain-relief-v1.md` snow table |
| 2 | Harness site SITE_A inside the dry belt | A15, OPEN to confirm. P6 moved the harness site (11.64 km) and kept the rule "never retune physics to suit a test". The owner's answer is not recorded. | `docs/relief-round-2026-10-03.md` section 1 and rule 4 |
| 3 | Per-planet gravity for surface physics only, or change catalogue masses | Decided as option (a) for now (section B). Reconciliation is A12. | `docs/planet-geophysics-v1.md` |
| 4 | Planet day lengths (A16) | OPEN | below |
| 5 | Life on air-but-no-ocean planets (A17) | OPEN | below |

- **A16. Day lengths.** The placeholder range is 3 hours to 200 days (Maithea about 159 Earth days), which makes spin unusable for wind belts. Options: keep the dry and wet belts at a fixed 30 degrees from the rain belt this round, then redraw spin over a realistic range (about 10 hours to a few days for rocky planets) as its own versioned change; or redraw now. Recommended default: keep belts fixed this round.
- **A17. Life on dry planets with air.** Dry rocky planets count as airless today and have no life. Options: give them cold or hot desert life, using the physics-based air test built in `planet-geophysics.ts`, as its own version bump; or keep them lifeless. Recommended default: yes, as its own versioned change.

#### A18. Creature extraction (seven questions)
All seven are OPEN. The phases of the plan use the default so that work can proceed, and none of these defaults counts as a decision. Source: `IWSDK/docs/creature-kit-extraction-plan-2026-10-04.md` "Owner questions, with recommended defaults".

| Q | Question | Recommended default |
|---|---|---|
| 1 | Product scope: composer only, or also the legacy genome gallery and the Blender deer template? | Composer only. |
| 2 | Should planet fauna switch to composer creatures, replacing `creature-genome-1`? | Not now; adapter behind a flag in phase 5a. |
| 3 | Licence (code, generated creatures, private or public). | Private and unlicensed for now (same as A13). |
| 4 | Must "same recipe, same mesh" hold across engines? | Identity is cross-engine; mesh bytes are V8 only. The GLB is the engine-neutral artefact. |
| 5 | Which consumers count: three.js only, or engine-agnostic GLB and Quest budgets? | Both (`creature-kit/three` and `creature-kit/gltf`). |
| 6 | Where does it live? | Own repo `C:/LLM/IWSDK/creature-kit`, vendored sha-pinned into Atlas. This conflicts in part with the owner's 2026-10-02 "one committed repo" preference. |
| 7 | Package name and compatibility promise for recipe links. | `creature-kit`, decodes `v1` to `v4` forever. |

### Owner answers 2026-10-07 (in chat to the coordinator)

- **EC4 4b, wing cover on the face in the display pose:** acceptable. Kasper answered "ja" to "may the wings cover a small part of the face in the display pose? (measured 3-4.7 % on seeds 19, 38, 115)". Small nonzero cover is not a defect; no fix required.
- **A18 Q6, where the creature kit lives:** own repo, `C:/LLM/IWSDK/creature-kit`, consumed by Atlas (vendored sha-pinned, per the plan). Kasper: "Ja, det troede jeg allerede jeg havde bedt om at det skulle blive sin egen ting som dette projekt så bruger." This is an explicit exception to the 2026-10-02 one-repo rule, which keeps applying to Atlas itself.
- **O13, shorter fair cost protocol:** signed, both F1 and F2 (see `docs/cost-fair-shorter-protocol-draft-2026-10-07.md` section 6).
- **Decision maker for design questions:** from 2026-10-07 the coordinator asks Opus 5.5, not Fable 5.1, for new decisions and reviews ("brug Opus til de næste opgaver i stedet for fable"). Earlier Fable decisions stand.
- **Strata notch rows (step-8 STOP of strata stage 1):** Kasper chose option 1 (2026-10-07): smooth the bench riser according to render-mesh spacing, as a standalone fix on main's current rock detail, branch `mountains/riser-lod`. Strata stage 1 stays parked until that lands; then it resumes with a same-LOD blind test.
- **A13 licence: DECIDED.** Kasper: "Den licens skal være den samme som resten tænker jeg? Hvorfor skulle den være noget andet?" The owner's projects carry no public licence (private; civilization-lab declares `UNLICENSED`, Atlas is `private` with no licence field), so creature-kit is `UNLICENSED`: private, all rights reserved (creature-kit 3e0d6e8). Follow-up: asset sidecars written by the exporter still say `NOASSERTION`; switching them to the same private licence is a versioned exporter change (made in creature-kit, then synced), not yet done. Publishing under an open licence stays a separate, later owner decision (with A14).

## B. Already decided by the owner

These are listed so that nobody reopens them by accident. "Date" is the date the source records. Where a source says "owner decision" without a date, the date column says so, and the source's own date is the earliest known.

| Decision | Content | Date | Evidence |
|---|---|---|---|
| Seabed always exists (decision 5) | The seabed is solid and collidable at its true depth, up to 16 km, from the same deterministic function. Seabed detail is by distance to the seabed (`seabed-by-distance-1`). | 2026-10-03 | `docs/terrain-relief-v1.md` "Owner decision 5"; `docs/lod-ladder-contract-v1.md` section 7 |
| 2 km ocean-surface band | `OCEAN_SURFACE_DETAIL_M = 2000` is an accepted rendering exception (eye-to-drawn-sea-surface distance). It stays unchanged. | 2026-10-04 | `docs/lod-ladder-contract-v1.md` section 7.1 |
| HUD flip and direct-landing boundary | Fixed 19.5 km (`LOW_FLIGHT_CLEARANCE_M`), no longer tied to the relief bound. | recorded in the 2026-10-04 INT/P6 work; the answer's own date is not in the sources | `docs/lod-ladder-contract-v1.md` section 7.2; `docs/relief-round-2026-10-03.md` section 1 |
| Landing ceiling formula | `landingCeilingM = 0.8 x bound.maxM` is kept. The owner asked for a targeted no-summit test (A6 is still open). | recorded in the 2026-10-04 INT work; date not in the sources | `docs/lod-ladder-contract-v1.md` section 7.2 |
| Maithea snow band (decision 1) | 15-40% is accepted, only "as long as ranges have snow" (A4 is the unmet condition). | 2026-10-03 (terrain-relief document date; the answer's own date is not recorded) | `docs/terrain-relief-v1.md` section 4 and section 13 |
| Gravity for surface physics only (decisions 3 and 4) | Lapse-rate gravity comes from `planetGeophysics(body).surfaceGravityMS2`; catalogue `massKg` stays the orbital mass. | 2026-10-03 (same source) | `docs/planet-geophysics-v1.md`; `docs/terrain-relief-v1.md` |
| One committed repo for Atlas | All work on `main`, worktrees removed after merge. | 2026-10-02 | agent memory "Universe Atlas" entry; see A18 question 6 |
| EC4 proboscis triangle allowance (was A11) | The proboscis head may exceed the legacy triangle count by 800 instead of 600. No other EC4 item was accepted. | 2026-10-04 | `README.md` EC4 entry; `docs/fauna-eye-catalogue-round-2026-10-03.md` |
| Dated sea | The sea is exactly 0 at the catalogue epoch and falls afterwards by lost volume (ocean-volume-1). | 2026-10-03 | `docs/relief-round-2026-10-03.md` section 1 |

## C. Open items that are not owner questions

None of these is passed. Each is a missing measurement or an unfinished check.

| Item | State | Evidence |
|---|---|---|
| Quiet-host performance | NOT MEASURED. Every performance number since relief is from a contended machine. | `docs/relief-round-2026-10-03.md` section 4 item 8; task 20 |
| Headset validation | NOT RUN. The walking and VR suites and all headset checks have not been run. | README "Not run"; task 20 |
| Luna presentation FAILs | OPEN. 6 of 28 frames passed on the final relief sheet. Mountain, seabed, polar, lowland, sand and orbit frames failed. | `README.md` top entry; `test-results/relief-round-2026-10-03/final/luna/summary.md` |
| Fell-colour test uses synthetic columns | OPEN | `docs/terrain-relief-v1.md` section 6 item 5 |
| desktop-perf S4 date and water bucket assertion | Implemented in round 2 (HARNESS-RERUN, merged 2026-10-04); negative cases shown. The S4 stale-patch clear time (4.8-6.4 s against 3 s) is contended data, not acceptance | `test-results/round2-2026-10-04/harness-rerun/` |
| Canopy rebuild on every 25 m sea-bucket change | OPEN performance item (found by HARNESS-RERUN): since relief, land patches pin their water validity to the exact sea level, so canopy is never reused across buckets | `test-results/round2-2026-10-04/harness-rerun/` |
| Rocky-corpus Spearman test | `todo`, not passing | `README.md` top entry |

## D. How this sheet was checked

- Each item was checked against the named source by reading the passage, not by memory. Numbers are quoted unchanged.
- The wording gate: no item in section A is described as passed, accepted or decided. The words "accept" and "passed" appear only as option wording, as a quote of what a source says, in section B, or in the rules above.
- **What the owner should do:** answer A1 to A18, or reply "default" for any item to take the recommended default for work purposes. A reply of "default" closes the item only if it is said explicitly.
- **Not run:** no test, tsc, build, browser, capture, Luna or Astra call. The date of the HUD, landing-formula and snow-band answers could not be found in the sources and is stated as such.
