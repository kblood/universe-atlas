# Universe Atlas

## Test result classes and GitHub pack — 2026-10-04 (local, not deployed)

**Owner decision:** Luna's appearance verdicts are their own result class,
VISUAL-ADVISORY. They are recorded but never fail a gate by themselves. HARD
checks (tests, tsc, digests, goldens) and CONTRACT checks (pinned LOD /
lod-consistency targets, which only the owner may change) still block a
merge. Visual work goes ELEMENT-FIRST: each element gets a deterministic
metric test and a render check on its own, and then a hand-off gets at most
ONE assembled Luna sheet. Rules: `docs/test-policy.md`.

- `scripts/luna-vote.mjs` asks Luna N >= 3 times per image. It reports
  PASS / FAIL / UNSTABLE with the vote counts. For every result that is not a
  PASS it asks for a diagnosis: the reason, which element failed, what was
  expected and how sure Luna is. It sums these up (the most common element,
  plus flags for disagreement or an ambiguous question). `--controls`
  checks a question against good and bad control images and marks it
  CALIBRATED / UNCALIBRATED / INSENSITIVE. It exits 0 for every advisory
  result and 2 only if Luna is unavailable. `luna-eyes.mjs` is unchanged.
- `tests/luna-vote.test.mjs` (registered) tests the vote logic with a fake
  judge.
- **Not done:** no `tests/visual-controls/*.json` manifest exists yet. No
  question is calibrated, so no Luna FAIL can be cited yet. luna-vote has not
  been run against real Luna.
- **GitHub pack merged** (`docs/github/`, `.github/` templates,
  `scripts/github/post-issues.mjs`; nothing was posted to GitHub). Astra
  re-reviewed the 14 earlier fixes: 13 fixed, 1 partly fixed. The rest of
  that fix and a YAML error in `bug.yml` were fixed before the merge.

## Round 2 merged — 2026-10-04 (local, not deployed)

**Merged into `main` (10 of 11 round-2 branches, `--no-ff`):** OWNER-DECISIONS,
MIGRATION-PREP, BIOME2-REPLAN, BIOME2-GRID, CREATURE-EXPORT, GOLDEN-EXT,
LANDING-FIXES, HARNESS-RERUN, BIOME2-ECO and OCEAN-PRESENT.

**Not merged: RELIEF-PRESENT** (`round2/relief-present`, worktree kept). Its
terrain change breaks 12 pinned LOD-consistency checks (Maithea L6 RGB p99
33.33 against 26.3, Lethuris 54.18 against 39.2, Maithea L6 peak retention
80.18 % against 85 %, plus 9 more). Fixing them needs either the OPEN owner
decision on strict post-relief LOD targets or a different relief design. Its
mountain acceptance still fails, and it moves SITE_A off its site rule. The
SITE_A replacement it found (index 624) is kept on the branch as a patch.

What the merged work adds:

- **Landing:** the app picks a dry site below the 99th-percentile land
  height. If none exists, it cancels with a message and no longer flies toward
  an unchecked place. A flooded ground bookmark hovers 40 m above the water.
  The two former landing "todo" tests now test this cap and pass. The
  owner decisions on the cap and the hover (A6, A7) are **still OPEN**: the
  code uses the recommended defaults.
- **Ocean:** skirts close the gaps between ocean tiles, proven on the drawn
  geometry (a real gap of up to 5 m at 4:1 edges was found and fixed). Waves
  fade with distance, and there is an underwater medium. Luna's "reads as
  underwater" check **still FAILS (3 of 12)**, and its cause is unresolved.
- **Biomes:** 7 new eco-class lab biomes (tundra, alpine meadow, boreal
  taiga, savanna, rainforest, hot desert, ice margin), with plant shapes that
  match their queryable footprint. There is also a climate grid with rain
  shadows (not yet used by the planet) and a re-baselined biome plan v2.
- **Creatures:** composer creatures export from Node to GLB with a
  provenance sidecar (`scripts/export-creature.mjs`).
- **Golden:** 9 new platform sections are pinned. The runner guards its
  output files and reports a tolerated mismatch honestly.
- **Docs and gates:** an owner-decision sheet, migration prep, and an asset
  provenance gate (9 NOASSERTION assets on a dated allowlist).

**Merger changes on `main`:**

- `BUILD_VERSION` went from `atlas-client-2026-10-relief-1` to
  `atlas-client-2026-10-round2-1`, and the terrain shader cache key from
  `planet-patch-ground-bed-v11` to `v12`. `MODEL_MANIFEST_ID`,
  `TERRAIN_VERSION` and the terrain golden are unchanged.
- 9 test files were registered. `tests/biome-lab.mjs` now expects the 16
  presets.
- The leaf-loop digest reference now counts the ocean skirt bytes.
- `golden.json` was re-pinned once. Every old key is unchanged and the 9
  section digests were added; the values are in
  [docs/relief-round-2026-10-03.md](docs/relief-round-2026-10-03.md) section 9.

**New findings, OPEN:**

- **Four engines are not all equal.** WebKit 26.5 differs on
  `faunaKnownUnstable`: a midline insect eye sits on the head's mirror seam,
  and two ray hits tie exactly there. The gate result is
  PASS-WITH-KNOWN-MISMATCH, not PASS. The fix belongs in
  `src/fauna-composer-mesh.ts`, and a trial patch exists.
- **The trunked-centipede skin record moves under a 1-ULP nudge.** This
  appeared after EC4 met the new perturbation test. All three browsers still
  match Node, but the cause is not traced.
- **Canopy rebuilds on every 25 m sea-level step.** It has done so since
  relief.
- **The climate grid's cold build** takes 8.27 ms against a 5 ms target.
- **The 25 ns eco-class cost target** still needs a quiet host and is
  skipped, not passed.
- **The SITE_A 60 km ring check** remains a todo.

**Checks on main (merge commits, clean tree):**

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0, no output |
| `npm run test:full` (at `e4b7afd`) | raw node exit 0; 1366 tests, 1359 pass, 0 fail, 5 skipped, 2 todo; NEW 0, known 0, stale 0 |
| `tests/golden/node-run.mjs` | exit 0; digests equal `golden.json` |
| Cross-engine golden (`--port 5292`) | exit 0, **PASS-WITH-KNOWN-MISMATCH**: Chromium 149 and Firefox 151 MATCH, WebKit 26.5 differs only on `faunaKnownUnstable` |
| `tests/biome-lab.mjs` (hardware, GPU lock) | exit 0; 16 presets, 0 geometry failures, 0 page errors |
| `npm run build` | exit 0 (chunk-size warning only) |

The 2 todos are the rocky-corpus Spearman check and the SITE_A 60 km ring;
both are OPEN. Not run at merge: `test:perf`, golden `--strict`, other browser
ladders, new captures or Luna verdicts, quiet-host performance and the
headset. Evidence: `test-results/round2-2026-10-04/merge/`.

## Eye round EC4 merged — 2026-10-04 (local, not deployed)

**Merged:** `eye-round/EC4` (merge `f3994e5`). The proboscis head is polished:
the trunk base is as wide as the face, the taper is gentler, the tip is a plain
swelling with nostrils, and the ears are lofted flaps
(`fauna-composer-face-geometry-2`). Arms and wings are kept off the face
(`fauna-composer-graph-4`). The round doc is
[docs/fauna-eye-catalogue-round-2026-10-03.md](docs/fauna-eye-catalogue-round-2026-10-03.md).

Astra had held EC4 (fix-required) for two reasons: no test run tied to an
identified tree, and the triangle allowance. Both were closed and Astra's
re-review answered **"VERDICT: approve"** with no blockers.

- **Owner-accepted (2026-10-04):** the proboscis head may exceed the legacy
  triangle count by 800 instead of the planned 600, because the head is more
  detailed after EC4. No other EC4 item was accepted.
- **Still OPEN, not passed:** a dotted light line at part seams, trunk
  faceting, the capped centipede trunk tip, the giraffe trunk tip clipped in
  the review panels, small wing cover on winged wild bipeds (seeds 19/38/115,
  pinned under 6 %), and the headset check.

**Checks:**

| Check | Result |
|---|---|
| Branch `0ebc88e`, clean tree: `tsc --noEmit` | exit 0, no output |
| Branch: creature-core boundary test | exit 0, 3/3 (export snapshot regenerated for EC4's new composer exports) |
| Branch: `npm run test:affected -- --base main` (whole suite) | exit 0; 1296 tests, 0 fail |
| Branch: `tests/fauna-composer.browser.mjs` | exit 0; ok, 0 failures, 31 screenshots; software renderer (SwiftShader) |
| Main `f3994e5`: `tsc --noEmit` | exit 0 |
| Main `f3994e5`: `npm run test:full` | raw node exit 0; 1296 tests, 1289 pass, 0 fail, 4 skipped, 3 todo; NEW 0, known 0, stale 0 |

The 3 todos are the same OPEN items as in the relief round below. Not run at
merge: `npm run build`, `test:perf`, golden, other browser ladders, a new
capture or Luna judgment (no geometry changed after the EC4 AFTER sheets), and
the headset. Receipt: `test-results/eye-round-2026-10-03/EC4-receipt.md`;
main checks: `test-results/finish-round-2026-10-04/EC4-merge/`.

## Relief round merged — 2026-10-04 (local, not deployed)

**Merged:** `relief-round/INT` (merge `36dd833`). It brings terrain-1.8.0-relief,
ocean-volume-1, render-bounds-1, place-query-1 and the P6 harness re-pin. The
round summary is [docs/relief-round-2026-10-03.md](docs/relief-round-2026-10-03.md).
Before merging, two cheap documentation blockers from Astra's P6 review were
fixed on the branch (`327fcd0`):

- the full old and new re-pin values are now in `docs/terrain-relief-v1.md`;
- the 2 km ocean band is described correctly. It is measured by the eye's
  distance to the drawn sea surface, not by water depth.

Mountains are lower, seas are shallower, and the seabed is real, solid ground
at its true depth. A game can ask any place for its ground height, water depth,
pressure, biome, climate and gravity on a given date (`src/place-query.ts`).
The HUD flip and direct-landing boundary stay at a fixed 19.5 km.

**Checks on main `36dd833` (clean tree, every browser log stamped with that commit):**

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run test:full` | raw node exit 0; 1286 tests, 1279 pass, 0 fail, 4 skipped, 3 todo; NEW 0, known 0, stale 0 |
| terrain-leaf-loop and life-cpu digests, climate agreement, LOD contract (lod-consistency, render-bounds) | pass inside the full run |
| `npm run build` | exit 0 |
| Golden cross-engine (Node, Chromium, Firefox, WebKit vs `golden.json`) | PASS, all four MATCH |
| Maithea land p50 / p90 / p99 / max | 426 / 2690 / 4358 / 5910 m; snow 19.6% (owner band 15-40%) |
| Corpus snow share (132 habitable water planets) | median 11%, 16 planets above 90%, 65 below 10% |

The 3 todos are OPEN, not passed: the rocky-corpus Spearman test and the two
landing no-summit tests. Evidence is in
`test-results/relief-round-2026-10-03/final/`.

**Visual review is not passed.** GPT Luna 6 judged the standard sheet: orbit,
equatorial lowland, mid-latitude forest, mountain, beach, polar and seabed
approach. It covered Maithea and the heavy (Lethuris), light (Raiva) and
Selawyn worlds, and passed 6 of 28 frames. Its FAILs, quoted:

- **Seabed (every world):** "the seabed reads like dry ground".
- **Mountain (every world; 8 frames, 3 independent asks each, all FAIL):**
  "the expected range is obscured, and the terrain barely reads as
  mountainous". Clouds hide the range in the normal frame. With the cloud
  layer hidden it shows "only a subdued ridge".
- **Sand and plains (Maithea, Raiva, Lethuris):** "scattered black marks on
  the sand look broken".
- **Polar:** "does not clearly read as snowy". On Selawyn, "the green, densely
  vegetated terrain does not read as a polar view".
- **Lowlands:** "flat and featureless"; Raiva's forest has "grid-like spacing".
- **Orbit (Maithea, Selawyn):** "heavily patchy".

All of this is recorded as OPEN in `final/luna/summary.md`.

**OPEN for the owner (none of these is passed):**

- the Lethuris L6 LOD exception (6.9 -> 7.0%);
- reduced seabed detail;
- strict post-relief LOD class/colour targets;
- weak range snow;
- horizon presentation on the other worlds;
- landing no-summit;
- a flooded ground bookmark lands at a different site;
- the cloud deck;
- the Luna FAILs above.

**Not run:**

- the P6 browser harnesses whose fixtures moved (rock-acceptance,
  canopy-water-date-seek, desktop-perf, render-probe, surface.mjs);
- `test:perf`;
- the walking and VR suites;
- quiet-host performance;
- headset checks.

The sheet's browser batches took about 90 s each, not the 30 s the policy
asks for.

Removed after the merge: the merged worktrees and branches
`relief-round/INT`, `P4-RELIEF` and `P5-RENDER-BOUNDS`. `eye-round/EC4` is
still held (see below).

## Finish round, step 1: test infrastructure merged — 2026-10-04 (local, not deployed)

**Merged:** `work/test-infra`. Astra (gpt-6-astra) built it and Opus reviewed it.
Policy is in [docs/test-policy.md](docs/test-policy.md). It adds:

- a machine-wide test slot, so only one full suite runs at a time;
- `npm run test:pkg`, `test:affected` (import-graph selection), `test:full`
  (reports only failures not listed in `tests/known-failures.json`),
  `test:perf` (CPU timing caps moved out of `npm test`, run under a quiet-CPU
  gate), `test:smoke` and `test:life-guard`.

No `src/` code changed. One post-merge fix:
`tests/test-runner.test.mjs` failed on this checkout, because `test-results`
here is a junction to another drive. The test now resolves its temp directory's
real path.

**Checks on main 911a160 (clean tree):**

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run test:full` | raw node exit 1; 1257 tests, 1250 pass, 2 fail, 4 skipped, 1 todo; NEW 0 |
| Golden `node tests/golden/node-run.mjs` vs `golden.json` | identical |

The 2 failures are the known stale SURFACE_VERSION pins in `version-compat`
and `inland-rivers-disabled`. Evidence is in
`test-results/finish-round-2026-10-04/coordinator-step1/`.

**Not merged:** `eye-round/EC4`. Astra's readiness review returned
**fix-required** with two blockers:

1. Its tsc, composer browser suite and full suite results are not tied to an
   identified tree.
2. The proboscis triangle allowance was raised from +600 to +800, and the owner
   has not accepted that change.

The relief branches P4 and P5 are not part of this step.

**OPEN, not passed:**

- the stale version pins;
- the rocky-corpus Spearman todo;
- `test:perf` strict variants (not run);
- EC4's open visual items: seam line, trunk faceting, centipede tip, giraffe
  framing and winged-seed display cover;
- the cross-engine golden browser run, which was not run (only the Node digest
  was compared);
- headset checks.

## Fauna face and eye round — 2026-10-03 (local, not deployed)

Creature Lab's **composer** now builds the face it shows. The trunk is a face
type: **Proboscis** grows a jointed trunk out of the muzzle, and the separate
Trunk control is gone. Eyes have **types** (round, horizontal and vertical-slit
pupils, compound eyes on mandibles, eyespots on worm-like heads) with an iris,
a shaped pupil, a lid and a wet highlight.
Headgear now follows the face: beaks grow a casque instead of horns, primate
and blunt faces carry none, and horns root on the brow beside the ears. Planet
**padded** animals no longer grow forehead horns.

Old links still open. A choice the face cannot build shows a "Not built: …"
note instead of being dropped silently. Three hybrid presets were redesigned
so that what they show is built: shelled-giraffe-bird has a casque,
winged-ape-rhino has no nose horn, and trunked-centipede has a proboscis face.
The redesign is reversible, see the
[round report](docs/fauna-face-eye-round-2026-10-02.md). Before/after
close-ups are in
`test-results/fauna-face-round-2026-10-02/final/contact-sheet-faces*.png`.

**Visual review is not passed.** GPT Luna 6 judged the final sheets on commit
9c647ac (`final/luna/`). It passed the planet padded heads. It failed the
preset, wild-seed and eye-type sheets. Eyes are faint or unreadable on dark
coats (ostrich, rhinoceros, giraffe). Compound eyes on mandible heads read as a
plain brown lump. The worm and blunt eye macros are pure black. Folded
membrane wings cover the face of wild seed 40 and cross each other there. A
follow-up check on single images confirmed the redesigned presets: the
shelled-giraffe-bird has a casque, and the winged-ape-rhino has no nose horn.
Full `npm test` gave 1156 pass and 2 fail. Both failures are CPU timing caps
in `fauna-appearance-v2`, and they also fail on the earlier gate commit
78602e3 on this machine today. The file passes in isolation.
These are desktop renders. Nothing here is validated on GPU hardware or in a
headset, and the deployed preview below is unchanged.

## Biome/climate increment 1 — 2026-10-03 (local, not deployed)

Snow, dry belts, treelines and forest now come from **one annual climate
field**, so the orbit colour, the ground classification and the trees agree.
Temperature follows insolation, which depends on the drawn axial tilt, so
high-tilt worlds have warm poles. Each planet cools with height at a lapse
rate set by its own surface gravity. Snow share therefore varies by planet:
median 61% of land, from 0% on light Raiva to 90% on heavy Lethuris. Maithea
went from 35% to 69% snow.

Forest thins continuously toward the treeline and dry edges. The
climate-weighted tree species mix (C2) is held for a follow-up. Old bookmarks
show the one-time "predates the current model" notice. Gates, the per-planet
snow-share distribution, before/after verdicts, the fauna habitat interface
and the deferred items are in the
[increment handoff](docs/biome-climate-increment-1-2026-10.md).

## Fauna variation and realism round — 2026-10-02 (local, not deployed)

Creature Lab's **composer** now draws individuals of a species: seed, sex, age
and condition, with correlated proportion, gait and coat differences. It also
offers coat controls, Random plausible species, herds of 6, 9 or 12, and a
planet-noon lighting option. The default lighting is still studio.
**Planet** fauna gain lineage coats, sexual dimorphism and neonatal juveniles
with fawn spots. Each planet now shows a median of 11 coat schemes (was 4), and
individuals differ by 5.3–8.8% RMSE (was 3.0–4.1%).

Inspect with `creature-lab.html?mode=composer` and `?mode=skin`. Measured
before/after numbers, evidence and the unmet gates are in the
[round report](docs/fauna-variation-realism-round-2026-10-02.md). The unmet
gates include a coordinator-waived planet RMSE gate that needs your
confirmation. The deployed preview below is unchanged, and old links open with
documented visual drift.

## Modular Creature Lab preview — 2026-10-02

[Open the deployed creature composer](https://dionysus.dk/webxr/IWSDK/universe-atlas/fauna-preview-20261002-01/creature-lab.html?mode=composer).
Start with nine animal-inspired presets or three hybrids, then independently
change body layout, limbs, feet, head, neck, wings, shell, tail and trunk.
Compare two animals and copy a link that preserves both recipes and the pose.

This is an experimental desktop preview with stylised procedural geometry.
Realistic surfaces, flight and headset qualification remain open. See the
[deployment record and usage guide](docs/fauna-modular-preview-2026-10-02.md)
for the verified build, tests and current limitations.

## Structural fauna variation — 2026-10-02

Creature Lab's **Planet skin** now supports six body families: ungulate,
cursorial, padded, long-neck, proboscidean and a speculative grounded winged
quadruped. Coherent proportion changes, paws/hooves/pads, trunks, folded wings,
individual coats and distinct juvenile growth are described in the
[structural variation milestone](docs/fauna-structural-variation-2026-10-02.md).
Compare two specimens at the same metre scale and copy a link to the exact
specimen, family, life stage and inspection pose. Trunk and wing articulation,
flight, seamless distant representations and full visual realism remain open.

## Fauna generation increment — 2026-10-02

The [realistic fauna work plan](docs/fauna-realism-next-2026-10-02.md) starts
with projected facial anatomy and shaped ears on the existing connected
planetary skin. Creature Lab's **Planet skin** mode inspects the same geometry,
material, skeleton and dated pose used by nearby animals in the game. It includes
adult/juvenile selection, face framing, a neutral material and skeleton overlay.
The other lab modes retain the earlier articulated anatomy prototype. These are
procedural animal prototypes; full visual realism and near/far continuity remain
open work.

The [realism and variation plan](docs/fauna-variation-plan-2026-10-02.md) orders
the next work: coherent anatomy, species and individual differences, growth,
coats and movement, with a fixed 96-specimen review corpus.

## Current direction — 2026-09-28

The [desktop realism and procedural life implementation plan](docs/desktop-realism-implementation-plan-2026-09-27.md) is the current planetary graphics roadmap. Desktop quality comes first: deterministic species recipes, cached structural variants, per-instance appearance, continuous canopy, shared lighting and genome-compatible animals. Canonical canopy streaming and bounded instance uploads are implemented; richer assets and their runtime integration remain in development.

The deployed runtime is stage `8c03f41`; the live `build-info.json` stamp and
ordinary served-site probe match that revision. Luna's full production UI
acceptance also passed: the normal Trees control showed 759 detailed instances,
date replay returned 753 matching identities, one deliberate 503 recovered by
Retry, planet revisit reused the package with 20 total requests, and there were
no unexpected page or WebGL errors. These checks verify the deployed flow, not
realistic tree appearance. Canopy matching and visual acceptance remain open.
See [normal forest loading](docs/forest-asset-loading-2026-09-28.md),
[family canopy status](docs/family-canopy-2026-09-28.md),
[compact family slots](docs/compact-tree-families-2026-09-28.md) and the
[retained forest work list](docs/forest-worklist-2026-09-28.md).

The remaining goal includes realistic species dimensions and structural
variants, foliage and material response, ground/rock/terrain breadth, fauna,
midrange performance qualification and full desktop visual acceptance. Quest
remains a later, separately measured profile.

[Desktop surface lighting](docs/surface-lighting-2026-09-28.md) adds atmospheric
sky fill and bounded local sun shadows through the normal planet panel. This
source checkpoint passes focused CPU checks and its production build; in-game
visual/performance acceptance and deployment are pending.

A deterministic Three.js universe explorer, deployed at
https://dionysus.dk/webxr/IWSDK/universe-atlas/.
This README describes the current repository source; the deployed build can
lag local changes.
The [formation and life integration record](docs/formation-and-life-integration-2026-09-23.md)
summarizes the current end-to-end planet timeline, local life rendering and
review evidence.
The [cosmic history simulation plan](docs/cosmic-history-simulation-plan-2026-09-23.md)
sets out the early-universe timescale, its connection to planets and life, and
the scenario-based far future.
The [deterministic temporal universe design](docs/deterministic-temporal-universe-design-2026-09-23.md)
combines those eras with Atlas's existing dated galaxies, planets, species and
local animals into one query and implementation sequence.
The [temporal universe implementation status](docs/temporal-universe-implementation-2026-09-23.md)
records the current integrated baseline and the scientific and ecological
limits that remain.

An earlier published canopy build included runtime through `98556a7`: stable
census patches, individual near/far ownership, 5,500 m altitude prefetch,
3,500 m altitude rendering, water-aware patch reuse, and retained terrain
refresh on date changes. RTX 5090 preview evidence covers repeatable date replay with 6,301 patches and
156,309 trees retained and over 321 m of flight and 323 m of walking. It does
not establish midrange performance or a general 60 FPS result. The current
forest still uses legacy faceted proxy trees rather than realistic authored
assets. See the [integration and acceptance record](docs/canopy-runtime-integration-2026-09-28.md),
[release 580936f deployment receipt](docs/deployment-580936f-2026-09-28.md),
[immutable preview evidence](test-results/acceptance-98556a7/README.md),
[water/date fix](docs/terrain-water-refresh-2026-09-28.md), and [Opus implementation review](docs/opus-5.5-canopy-integration-review-2026-09-28.md).

The [v7 tree checkpoint](docs/tree-authoring-v7-2026-09-28.md) preserves geometry, alpha and normal data while correcting colour encoding; browser checks pass, but back-lit foliage remains dark and visual acceptance is open. An isolated [distance-capture experiment](docs/authored-tree-capture-2026-09-28.md) passes repeatability and technical audit checks for its 16 m capture, while its 22 m / 32-pixel capture loses all leaf classification and intermediate-view silhouette error remains high. Browser checks exercise all 81 capture directions without WebGL errors, but exact-axis matching does not generalize to intermediate views. The development lab has no forest instancing, wind, shadow casting or mesh handoff, and is not integrated into the game. Authored trees remain unaccepted; the live forest still uses legacy faceted shapes.

A separate [pinned EZ-Tree reference comparison](docs/tree-ez-reference-2026-09-28.md) generates fixed-seed oak geometry and reduced-wood/upstream-LOD variants for a local browser review. The 16 m Oak has 13,806 full-detail triangles; the wood-reduced control retains its leaf mesh at 12,014. Its RTX 5090 fixture records six 60-frame samples and shows a fuller, less tiered crown, but the trees differ in geometry and leaf coverage, so these are not general performance results or visual acceptance. The reference is not in the game.

Adapter candidate F turns that reference into an Atlas-material GLB pair: 13,806-triangle LOD0 and 4,866-triangle LOD1, retaining 1.2 m cards, pivots and wind data. It began as a separate browser lab; later local source can load the package into opt-in detailed batches and derive distant family profiles. Appearance and the near/far transition remain unaccepted and the local checkpoint is not deployed. See the [candidate F status](docs/tree-ez-family-2026-09-28.md).

The [instance streaming record](docs/tree-instance-streaming-2026-09-28.md) documents the partial-upload logic and separate bark/leaf tints. That earlier snapshot preceded local near/far family integration; current details are in the family canopy record above.

The current [Three.ez impostor comparison](docs/tree-three-ez-impostor-2026-09-28.md) isolates an upstream texture-atlas colour defect and measures distant coverage against a converged mesh reference. The existing proxy and Three.js alpha hashing retain substantially more coverage than the experimental mesh's default alpha mask. Lighting, view continuity and game adoption remain open. The [foliage minification comparison](docs/tree-foliage-minification-2026-09-28.md) records current coverage studies. An opt-in [leaf diffuse-transmission prototype](docs/leaf-diffuse-transmission-2026-09-28.md) passed synthetic calibration and a corrected tree-lab check, but remains off by default and is not connected to planetary rendering.

A separate [MASK/HASH temporal browser check](test-results/tree-foliage-temporal/README.md) verified fixed-camera date replay and alpha-mode propagation to the foliage shadow materials for both LODs. Its four 192-tree GPU/CPU profiles are isolated lab measurements. A [corrected isolated coverage probe](test-results/tree-foliage-temporal/isolated-final/README.md) found better small-footprint agreement with a downsampled reference for HASH, with greater coverage variation during yaw and wind changes. The reference is not proven ground truth; moving-view acceptability remains open. Failed zero-footprint and load-race probes remain labelled as failures.

The [tree authoring v4 candidate](docs/tree-authoring-v4-2026-09-28.md) passes
physical export, repeat-generation and Blender/GLB render checks after the
[Opus authoring review fixes](docs/tree-authoring-review-assessment-2026-09-28.md).
Its crown and materials still need visual work; it is not a runtime forest asset.

The [Biosphere Lab](biosphere-lab.html) inspects generated plant/animal morphology,
planet-specific habitat ranges and dated lineages. Its [implementation record](docs/biosphere-lab-implementation-spec.md)
separates the lab fixtures from full planetary ecology. The main app now gates
nearby life by the formation and biosphere date.

The [Creature Lab](creature-lab.html) adds four generated quadruped lineages,
an articulated anatomy inspector, a walk/run arena and an ancestry display
showing each species beside its actual predecessors. Read the
[implementation and validation](docs/creature-lab-implementation-spec.md) and
[research with sources](docs/creature-diversity-and-motion-plan-2026-09-14.md).
Movement is a kinematic rigid-part prototype. The main Atlas now uses its
quadruped archetypes for nearby herds on suitable living planets. Smooth skin
deformation and animal behavior remain future work.

The [Biome Lab](biome-lab.html) compares deterministic plant and rock communities
on controlled terrain. Its [specification and validation](docs/biome-lab-spec.md)
distinguish this test bench from the main Atlas's bounded near-ground life layer.
Full planet-wide ecosystem integration remains future work.
The [broader validation plan](docs/planet-validation-labs-2026-09-14.md) links
the terrain, vegetation and species research.

The [procedural biospheres plan](docs/procedural-biospheres-next-plan-2026-09-14.md)
records the path from lab fixtures to generated species and communities. The
main Atlas now queries dated biospheres and renders local vegetation and herds
while landing or walking. Planet-wide populations and ecological simulation
remain proposed work.

The [walkable worlds and traversable history roadmap](docs/living-worlds-and-time-roadmap.md)
guided the current walking and dated-world work. Its later ecosystem,
civilization and terrain milestones remain proposals.
See also [Fable 5.1's independent review](docs/fable-5.1-plan-review.md) and
[the checked follow-up](docs/fable-review-assessment.md).
The first implementation is documented in [Walking and shared time](docs/walking-and-time.md).
The [ground materials and named surface destinations](docs/surface-materials-and-survey.md)
increment records its implementation, validation and sources.
Inland rivers, the drainage atlas and the regional lakes built with rivers are
currently withdrawn; see [inland rivers withdrawn](docs/inland-rivers-withdrawn-2026-09-28.md).
The river documents below describe the archived feature.
The [drainage atlas and atmospheric flight](docs/drainage-and-atmospheric-flight.md) add connected catchment analysis and gentle planetary horizon alignment.
The [physical river pilot and ground environment](docs/physical-rivers-and-ground-detail.md)
add a visitable river, tributary and lake region, carved banks, and initial local
forest and ground-cover detail. See its [design specification](docs/physical-river-pilot-spec.md).
The [ground realism correction](docs/ground-realism.md) improves lake-bank continuity,
walking terrain refinement, vegetation lighting and density, and fine water detail.
It includes the [implementation specification](docs/ground-realism-spec.md), sources and validation.
The follow-up [planet terrain research](docs/terrain-research-2026-09-13.md)
examines the remaining flicker and proposes a terrain redesign, with a
[stable-shore implementation brief](docs/terrain-v2-first-slice-spec.md).
The [planet realism milestone and continuing plan](docs/planet-realism-goal.md)
document shared river geometry, reflective lake water, regional valley relief,
instanced ground cover and textured trees, with sources and measured validation.

The first slice is described in [physical ground and stable shores](docs/stable-shores.md):
separate ground beds and water, local shader coordinates, and measured tile-edge
skirts. The larger erosion and terrain-renderer redesign remains planned work.

## Run and validate

Requires Node.js 22.18+ (the catalogue tests use native TypeScript stripping).

```powershell
npm ci
npm test
npm run build
npm run preview
# In a second terminal, with the preview running:
npm run test:browser
npm run test:continuous
npm run test:travel
npm run test:planet
npm run test:exploration
npm run test:walking
npm run test:surface
npm run test:drainage
npm run test:atmosphere
npm run test:rivers
npm run test:vr
npm run test:biomes
npm run test:biosphere
```

Playwright needs its Chromium browser installed (`npx playwright install chromium`).
The automated browser test uses SwiftShader for reliable headless WebGL on this
machine. Its frame timings are software-rendering measurements, not a hardware
performance guarantee. Desktop and mobile viewport layouts are exercised;
headset and physical mobile-device performance have not been validated.
Set `ATLAS_HARDWARE=1` to request GPU rendering (D3D11 on Windows). The walking
report records the actual adapter and settled-ground frame timings; the latest
RTX 5090 measurements are in the implementation record.
The VR suite injects IWER 2.4.0 with a stereo Meta Quest 3 profile through
Playwright only. It exercises controller rays, the in-world catalogue, thumbstick
rotation/zoom, orbital approach, relief controls, session exit and re-entry.
The emulator is a development dependency and is not shipped in the live app.

## Explore

Start with seed `LETHRA-001`. Select a galaxy, then select any mapped star.
**Approach selected star** flies to that exact catalogue position within the same
galaxy scene. **Visit this system** opens its stars, planets, moons and orbital
parameters directly. Scroll over stars to zoom; drag to rotate and right-drag to
pan. Returning to the galaxy pulls back through the same geometry.

**Fly freely** works at universe, galaxy, system and planetary scales. Drag to
look, use WASD to move and Q/E to descend/ascend. Speed adjusts automatically:
intergalactic travel uses Mpc/s, galactic travel uses ly/s, and systems use AU/s
or km/s. The wheel adjusts a speed multiplier; Shift boosts it; Escape stops
flight. **Fly to selection** steers to a chosen galaxy, star or planet.
**Fly outward** departs the current system or galaxy. Touch users can hold Fly
forward and drag to steer.

Free flight uses a centred reticle. Select a star, align it and hold W; gentle
alignment assistance helps reach that exact system. Releasing the look drag does
not release a held movement key. Galaxy silhouettes stay readable from the initial
universe view, and unresolved system bodies have small navigation beacons at their
actual centres until their meshes become visible. Physical positions and sizes
remain unchanged.

Crossing a galaxy or system boundary converts position and heading between
coordinate frames, without moving the camera to a preset inspection viewpoint.
Entry and exit thresholds differ to prevent repeated switching at a boundary.
A small bounded cache prepares approaching galaxies and systems. If a worker is
still preparing the next scale, the current scene stays visible and movement
pauses until it is ready; there is no loading screen. Travel speeds are game
controls, not a relativistic or propulsion simulation.

Nearby stars stream around the camera. Internal 32-ly chunk boundaries update
the nearby catalogue without replacing the galaxy scene. Surface clearance limits
keep ordinary flight outside solid bodies. **Land and walk** prepares nearby
terrain and descends onto solid planets and moons.

Inland rivers and their regional lakes are currently unavailable. Dated oceans
remain, and ocean water blocks walking; individual tree and stone collision is
pending. An older link containing `river=` opens the ordinary world with a short
notice. Nearby generated plants and simple herds can appear on suitable worlds;
planet-wide ecosystems, cities and people remain future work.

The help button lists controls. Seed tools provide direct addresses, bookmarks,
catalogue exports and a repeatability check. URLs restore the selected destination.
Walking locations and the exact shared date are saved in the URL. Continuous
free-flight positions themselves are not yet saved.

Galaxy-to-local navigation uses an uninterrupted logarithmic camera move and
retains the same galaxy point buffer. Planetary focus retains the system scene.
Explicit navigation between other scales blends between prepared views; flight
boundary crossings retain the physical camera pose. Reduced-motion preferences disable animated travel. VR presents
stationary spatial models; selection changes model focus/scale without moving the
headset viewpoint. Free-flight keyboard controls are for desktop/touch only.

The system view defaults to a spaced orbital overview. **Physical scale** shows
true relative distances and radii. Orbit angles, time, object identities and
physical catalogue records are the same in both views. Starting flight or focusing
a world switches to physical scale. The orbital helper moves the camera toward
the actual planet while retaining all system bodies, moons, rings and orbits.
**Approach low orbit** flies to 30–100 km above the selected planet or moon.
**Descend to 10 km** approaches the surface while preserving at least 3 km over
mountains. **Hold orbit** follows a great circle at your current altitude and
carries the camera smoothly across both poles. Drag to look around; movement
keys release assistance. The wheel also adjusts assisted orbit speed.
The HUD shows altitude, terrain clearance and latitude. **Terrain relief ×12**
exaggerates elevation for stationary inspection; flight restores physical heights.
**Fly over terrain**, at the top of a solid world's inspector, approaches land
and starts a 600 m terrain-following flight. The terrain now includes local hills
and gullies, with atmospheric haze where appropriate. The wheel adjusts speed;
movement keys release assistance. Free flight reaches physical ground contact
with the same 1.64 m eye clearance as walking. Metre rendering starts below
20 km and uses a nearby floating origin. **Land and walk** descends to ground contact: WASD walks, Shift runs,
Space jumps and dragging looks around. **Return to flight** rises to a 160 m
hover. Landings over water find a dry site; oceans and gas giants have no walking
surface. Walking currently uses desktop keyboard/mouse controls, outside VR.

**Universal date** accepts years since the Big Bang and
applies across every view. URLs and exports retain exact integer nanoseconds.
Star size, colour and lighting follow lifecycle stages. The system view shows
an accretion proxy before a planet forms, a molten world before cooling, and
the solid planet afterward. Ocean level and nearby life respond to the date.
A time seek from the ground returns to observation hover; continents do not yet
change. Formation and biosphere dates are procedural scenarios. Select a planet
or moon to open **Formation & life** and jump to its history milestones.
On a planet, **Follow from formation** selects that planet through its molten,
solid, life and possible engulfment stages. Use **Next milestone** or Play to
move forward. The target remains selected in the system view before it forms
and after it ends. Some planets have no modeled destruction date.
At **First stars**, select a living star marker or an entry in the explorer to
visit its illustrative close view. In a formed galaxy, dated stellar population
points can be selected and visited; they have no resolved planetary systems.
If a galaxy has no active dated star, **Go to next stellar birth** advances to
one. Surviving galaxies remain selectable in the far future as dim map proxies.
On a world with living vegetation, **Find living habitat** flies toward a
vegetated dry region. Herds are sparse and may be absent from a particular
walking area even when animal species exist on the planet.

Ordinary exploration advances the authoritative date at one physical second
per second. Pause time freezes wildlife and weather; seeking a date remains
paused until resumed. Near and far populations share canonical spatial cells.
The [population implementation](docs/population-continuity-implementation-2026-09-27.md)
records identity, precision, streaming and animation changes and their limits.
The [cloud research](docs/realistic-clouds-research-2026-09-27.md) explains the
volumetric cloud renderer and its approximations. The
[cloud comparison lab](tests/cloud-comparison.html) keeps the old sheet and new
volume available under matching views for visual regression checks.
See [validation results and limits](docs/planet-rendering-validation-2026-09-27.md)
for the measured checks and hardware coverage.

The implementation, controls, cube-face mathematics, budgets, known limitations,
test procedure and research sources for the latest stage are documented in
[Walking and shared time](docs/walking-and-time.md). The preceding release is in
[Connected exploration corrections](docs/exploration-corrections.md).
Measured acceptance results are in
[Connected exploration corrections](docs/exploration-corrections.md).
The original orbital design and validation remain linked there as historical records.

On a headset browser, choose **Enter VR**. The atlas becomes a stationary spatial
model with a floating explorer panel. Controller triggers select objects; use
Explore selection to descend. The left stick zooms/pans, the right stick rotates,
and holding a grip lets you move the model. Back, Fit model and Exit VR are on
the panel. The design manipulates the model without artificial head motion.

## Architecture and limits

- `src/catalog.ts`: pure generation, version `atlas-1.1.0`. FNV-1a 64-bit path
  hashes initialize PCG32 streams independently for names, structures and
  textures. Stable IDs encode the hierarchy, independent of exploration order.
- Galaxy origins use Mpc, galaxy-local cells use light-years, and body records
  use SI units. Rendering applies a local scale at each hierarchy level, keeping
  GPU coordinates small. System orbits use analytical Kepler positions, with
  barycentric binary stars. The spaced system overview uses separate orbit scales
  with disjoint radial envelopes, accounting for eccentricity and ring extents.
  Physical-scale mode uses one common scale for positions and body radii.
- Thirty-two galaxies span four morphologies. `src/galaxy-field.ts` integrates
  their catalogue density, with fine vertical bins for thin disks. These density
  tracers guide the distribution of real map stars. Universe-scale galaxy glyphs
  still represent unresolved populations.
- `src/star-map.ts` resolves density tracers to existing catalogue systems near
  each tracer. It never invents a star at the tracer coordinate. The focused
  galaxy map uses up to 10,000 candidate anchors, with unique stable addresses;
  every selectable point opens exactly that system. Successive map detail levels
  preserve their earlier anchors. Four worker-side maps are cached. This is a
  representative subset, not an enumeration of every star in the galaxy.
- `src/galaxy-space.ts` keeps a single galaxy scene through zooming and flight.
  Distant mapped stars occupy actual 3D positions and exhibit positional parallax.
  The camera uses a floating origin near resolved stars. Twenty-seven nearby
  32-ly chunks stream through one worker request at a time; up to 64 chunks stay
  cached. Each chunk resolves at most 512 representative systems, reporting its
  true count. A single batched near-star cloud draws at most 13,824 points.
  Mapped anchors are excluded from that cloud to prevent duplicates. Local stars
  fade in as generated and fade with distance between 24 and 32 ly, before chunk
  boundaries become visible. Large travel steps request the latest neighbourhood
  without applying an old result to a new position.
- Map positions, names and system records come from the unchanged `atlas-1.1.0`
  catalogue. Map lighting emphasises young spiral-arm populations; close stars
  use catalogue colours. Point brightness is illustrative, not photometry. The
  small representative sample does not describe all the unresolved diffuse light,
  extinction, or naked-eye visibility of a physical galaxy.
- `src/worker.ts` also generates planetary textures and transfers typed buffers.
  The renderer caps pixel ratio, disposes abandoned view resources, and rejects
  stale navigation results. `src/view-transition.ts` keeps at most one outgoing
  scene for explicit changes to universe or system scales. Galaxy/local zooms and
  planet focus do not allocate a second scene or render target. Flight uses a
  bounded three-entry preparation cache.
- Neighbouring galaxies remain visible in catalogue-derived directions. Their
  silhouettes are enlarged for legibility. System skies use the same real map
  anchors projected from the system's physical position, plus actual local and
  adjacent catalogue stars. Galactic previews follow camera translation only at
  system scale, where AU travel has negligible light-year parallax. In VR, distant
  galaxy points are depth-compressed along their true viewing rays to fit the
  stereo camera's far plane. Location maps show your place in the hierarchy.
- `src/travel.ts` supplies proximity-based flight speeds, system entry extents
  and nearest-body clearance. The renderer uses logarithmic depth and a floating
  origin in metres near planetary bodies. Camera position and heading cross
  Mpc/galaxy-local ly/system-local metre frames at boundaries; close planetary
  movement never depends on adding metre offsets to a global Mpc position.
- Planet focus refines the resident body mesh in place. Previously focused bodies
  return to their small preview when another body receives high detail, bounding
  the number of detailed worlds. Moons use 64-pixel previews until focused;
  planets use 256-pixel previews. Focus tokens prevent a late terrain result from
  being applied to a different body. Moons' orbital paths follow their moving
  parent during playback. Very distant system context still uses directional sky
  markers, with negligible AU-scale parallax for most stars.
- `src/terrain.ts`, version `terrain-1.3.0`, preserves the existing seeded
  continents, coastlines and ocean level, adding local relief at 6,500 m, 1,400 m
  and 260 m wavelengths. `src/planet-tiles.ts` samples
  that field over a cube-sphere, including matching face edges and pole centres.
  `src/planet-renderer.ts` streams patches through a dedicated worker, retains
  parents until children are ready, morphs new geometry, and uses edge skirts.
  The ordinary cache plus pending work is capped at 256 tiles, with two jobs in flight and at most two
  resource installations per frame. Desktop selects at most 150 leaves, XR 102.
  Horizon and camera-frustum culling reduce hidden work. Ground-proximity priority
  permits refinement to level 16 in flight; walking uses a 768-tile cache,
  up to 512 leaves and radius-dependent contact levels 14–20. Level 8+ textures have
  128x128 interiors. Focused 1024-pixel
  globes remain fallback previews; solid worlds no longer upscale a whole globe
  to 2048 pixels for close inspection. The terrain sampler, not the fallback map,
  supplies streamed detail. Ground collision uses the settled contact triangles.
  Nearby vegetation and simple herds render on suitable worlds. Complete
  planet-wide populations, weather and full atmospheric scattering remain
  future work. See the walking record for resource accounting and measurements.
- `src/planet-flight.ts` uses quaternion free look and great-circle transport
  without a geographic-north singularity. `src/travel.ts` samples actual terrain
  for clearance. Ocean planets receive a lightweight atmosphere shell; it is a
  visual approximation rather than a complete scattering or climate simulation.
  Terrain materials also receive height-dependent aerial haze. The new
  `src/navigation-markers.ts` batches unresolved system-body beacons into one draw.
- `src/vr.ts` uses the installed Three.js WebXR runtime with a 0.85 framebuffer
  scale and foveation, a single reusable panel texture, bounded paginated lists
  and two controller rays. Particle sizing accounts for the model's world scale.
  Reference: [Three.js VR guide](https://threejs.org/manual/en/how-to-create-vr-content.html).
  Validation approach: [Meta IWER](https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html).
- Moon records have parent-relative physical orbits and individual previews.
  They are visible at physical system scale and remain present during planet focus;
  the spaced overview omits their markers to avoid clutter. Belts
  and rings are lightweight descriptors/visuals. Planetary demographics,
  climate and long-term orbital stability are simplified models, not an
  astrophysical simulation. Shared names can recur; canonical IDs are unique.
- Determinism tests cover random reference vectors, generation order, signed
  sector boundaries, direct-address reconstruction and orbital relationships.
  Saved worlds depend on the generator version. The continuous browser test selects a visible map star by its projected screen
  position, verifies its exact system identity, flies across several chunk boundaries,
  and checks geometry identity, rebasing and cache limits. Cross-engine, bit-for-bit
  compatibility requires additional browser fixtures before it can be promised.

The travel acceptance test flies from one galaxy into a chosen system, focuses a
planet while asserting every resident body keeps its identity, then departs into
another galaxy. It verifies five automatic scale crossings and adaptive speed.
The planet acceptance test uses actual UI flight to low orbit, crosses both
poles under orbit assistance, descends, visits a moon, and checks tile-cache
bounds and resource disposal. It produces inspectable screenshots and a report.
The exploration regression adds actual drag/W entry into a selected system,
rendered-pixel visibility checks, star-only clipping, land-site approach,
low-altitude terrain following, and keyboard/mouse interaction checks.

All visual geometry and textures are generated by this application's code.
There are no downloaded art assets or external runtime services. Three.js is
provided by the pinned `super-three` package; its MIT notice ships as
`public/three-LICENSE.txt`. Dependency versions are recorded in package-lock.json.

## Deployment

### Atlas guide

The game links to the HTML guide at `guide/index.html` from its action bar and
help dialog. Nine linked chapters describe the current universe, determinism,
time, spatial hierarchy, terrain, water/atmosphere, life, travel and publishing.
The time explorer imports the game's era checkpoints and bookmark encoder.

Guide sources are `guide/*.html`, `guide/theme.css` and
`guide/time-explorer.ts`. Vite builds these entry points into `dist/guide/`
alongside the game and labs. Publish them with the ordinary project release
below; `release-site.ps1 -IndexOnly` only updates the shared landing page.
The guide's implementation-record links use the documents explicitly emitted
by `vite.config.ts`. Keep those links and the build's document list aligned.

After building, run `node tests/guide.mjs` for the guide's nested-path link,
responsive layout, exact-era bookmark, no-JavaScript and in-game-link checks.
It writes review screenshots under `test-results/guide/`.

This project has its own repository at
`caldor@192.168.50.17:/srv/git/repositories/universe-atlas.git`.
The shared scripts and research live in the sibling IWSDK repository.

From `C:\LLM\IWSDK`:

```powershell
.\release.ps1 universe-atlas
.\release-site.ps1 -IndexOnly
```

The index source is `deploy/iwsdk-index.html`. The release scripts upload static
build output through staging and retain a backup of the previous site index.
This project's `deploy/site-index-entry.html` preserves its current landing-page
card. To restore that card, replace the `href="universe-atlas/"` feature in the
shared index with the fragment, preserving the other applications' entries.
Run `tests/browser.mjs` with `ATLAS_URL` set to the live URL and `ATLAS_RESULTS`
set to a separate report directory for post-deployment verification.

Research and the broader roadmap are in the parent `docs` directory:
`procedural-universe-research-2026-09-12.md`,
`procedural-universe-build-prompts-2026-09-12.md`, and
`universe-atlas-v1-spec.md`.

Current local tree integration now has [compact branching/spire batches](docs/compact-tree-families-2026-09-28.md) and atomic family replacement, with CPU and actual-game submission/date-return evidence. The [normal Trees control and package](docs/forest-asset-loading-2026-09-28.md) are implemented locally with 11 focused source, lifecycle and package checks. The [offline foliage loader](docs/offline-foliage-mips-2026-09-28.md) has 34 focused CPU checks plus a local GPU upload/readback check; matched medium-distance review is underway. Earlier single-family milestones remain historical; normal-control browser acceptance, Pine appearance and near/far matching are still pending.
