# Opus 5.5 handoff: Atlas desktop realism

Date: 2026-09-28
Integration checkout: `C:\LLM\IWSDK\universe-atlas-rendering`
Branch: `desktop-rendering-stage-c`
Current candidate: `770d807` (`Draw dated tree species at recipe height, crown and trunk dimensions`)

This handoff records the remaining work for the accepted goal in
[`desktop-realism-implementation-plan-2026-09-27.md`](desktop-realism-implementation-plan-2026-09-27.md).
The user will route the main implementation tasks to Opus 5.5. Astra may take
specific implementation slices if requested. Luna can coordinate integrations,
run acceptance and deployment checks, and write receipts.

## Goal

Make ordinary desktop exploration feel like one continuous, deterministic
world: approach from orbit, pass through the atmosphere and cloud layer, fly
over detailed terrain, and land without waiting for important forest, plant,
rock, or wildlife detail to appear. Physical scale, identities, habitat,
appearance and movement must remain coherent as the renderer changes
representations. Aim toward the plan's proposed 1440p/60 FPS on a representative
midrange gaming PC; the hardware floor and per-system budgets still need to be
made explicit and measured.

Preserve exact-date replay and seed/body/species/individual identity. Rendering,
cache state, visit order, camera pose and task timing must not change canonical
content. Inland rivers and river-fed regional lakes remain disabled. Dated
global oceans and ordinary terrain stay enabled.

## Current state

- The production website remains at `4796b1a`, the rivers-off release. Candidate
  `770d807` is local and has not been deployed.
- The runtime candidate is committed at `770d807`; this handoff commit only
  updates documentation. The candidate includes Astra's
  fauna material handoff fix, Opus's canonical ordinary surface rocks and
  bounded rock traversal/accounting, and Opus's dated tree allometry.
- Main implementation commits in this stage: Astra fauna material
  `b95c4a4`; Opus rocks `bced8f0` plus bounded accounting `bc0e559`; Opus tree
  allometry `770d807`. The commit log retains these as separate reviewable
  stages.
- Full serial `npm test`: 797 tests, 794 passed, 0 failed, 3 skipped. The three
  skips are retained GLB checks requiring `ATLAS_TREE_CANDIDATE`. A parallel
  run had one canopy watchdog timing failure; that file passed alone and in the
  serial full run, so retain it as a scheduling-sensitive check.
- `npm run build` passes. The Vite preview reports commit `770d807` and
  `dirty: false`.
- Hardware browser checks on an RTX 5090 passed for ordinary near-ground
  rendering, fauna flight/date replay/contact, and the retired-river route.
  These runs had no browser or WebGL console errors.
- One close-fauna follow-up is unresolved: its selected individual disappears
  from `faunaDrawn` after a 1.75-second exact-date seek with a stationary
  observer. The script then fails by reading the absent position. This does
  not yet establish whether the cause is movement out of range, population
  selection, culling or a representation handoff.

## Ordered work for Opus 5.5

### 1. Resolve fauna continuity and readable close presentation

Inspect `src/fauna-runtime.ts`, `src/fauna-field-renderer.ts`,
`src/fauna-near-rig.ts`, and `src/fauna-material.ts`.

The failing fixture is `tests/fauna-near-body-visual-followup.browser.mjs`.
It uses body `G001/C2128,0,1/0/planet/1`, date
`435084631200000040194500000`, and individual
`G001/C2128,0,1/0/planet/1:fauna:562ff898`. At the initial aimed frame the
individual was present and a near rig was active. After a seek of 1.75 seconds,
the settled draw list no longer contained it; the script failed at line 72.
There were no page errors. The captured 8 m image showed the animal, but its
body was very dark and nearby conifer branches partly dominated the frame.

Trace the same canonical ID through the dated population census, world-space
position, terrain readiness, visibility/frustum tests, far representation,
near-rig membership and lighting at offsets 0, 0.25, 0.5, 1, 1.75, 3, 5 and 10
seconds. Distinguish valid locomotion out of view from a renderer/selection gap.
Do not hide the failure by weakening the existing assertion or by keeping an
individual visible after it has left the valid habitat/visibility range.

**Acceptance:** exact seeks reproduce the same IDs and positions; ordinary
time advances motion; observer movement preserves nearby canonical fauna;
near/far representation transitions do not pop while the animal remains in
view; no terrain/rig starvation or duplicate draws; and a close, well-lit
animal is recognizable against the ground and plants. Add a deterministic
regression test for the diagnosed cause and capture before/after images at the
same seed, date, pose and lighting.

### 2. Make recipe-sized tree families read correctly at every distance

Inspect `src/tree-allometry.ts`, `src/tree-asset-source.ts`,
`src/forest-tree-family-library.ts`, `src/forest-presentation.ts`,
`src/forest-far-atlas.ts`, and the integration record
[`tree-species-allometry-2026-09-28.md`](tree-species-allometry-2026-09-28.md).

The shared recipe dimensions now drive near, mid, far, legacy, culling and
shadow dimensions without changing canonical IDs or placements. The report
measured 1,328 of 1,333 Pine family draws at the minimum crown-width clamp:
the packaged Pine skeleton plus 1.3 m metric cards cannot produce the narrower
recipe crown. Also, 343 of 2,688 bindings (12.8%) are below the detailed-family
8 m envelope and use the simpler legacy tree. Detailed loading is opt-in; the
close visual run manually enabled it and loaded 25.9 MB of Oak/Pine source.

Resolve the Pine recipe/asset mismatch using a suitable family geometry or
leaf-card design and preserve the versioned allometry contract. Review the
under-8 m species path and decide whether their fallback meets the product
target. Compare the same individuals in detailed, middle, far-atlas and legacy
views, including date changes, turning, approach and retreat. Do not claim
visual acceptance from CPU bounds/codec tests.

**Acceptance:** recipe heights/crowns/trunks are represented within documented
tolerances; no broad clamp dominates a species; species and canonical positions
stay stable; near/far silhouettes and brightness match during handoff; and a
coherent forest is reachable through normal desktop controls. Include a matched
wide view, 8–100 m views, and a warmed stationary/turning capture.

### 3. Visually and operationally accept ordinary rocks

Inspect `src/rock-field.ts`, `src/rock-geometry.ts`, `src/planet-rocks.ts`,
`PlanetRenderer.diagnostics().rocks`, and
[`ordinary-rocks-2026-09-28.md`](ordinary-rocks-2026-09-28.md).

Canonical rocks/boulders, geology families, instanced LODs, surface gating,
bounded draw traversal and combined memory accounting are integrated. CPU
fixture tests cover placement, order independence, culling, near retention,
resource release and accounting. The test fixture is not a browser/GPU result;
the current desktop browser report does not include the rock diagnostics.
The configured per-frame draw-work target is 1.5 ms. Saturated Node fixture
measurements show bounded jobs of 5–7 frames, with occasional maxima above the
target; this does not yet establish the in-game cost.

**Acceptance:** prove rocks render in ordinary barren and living terrain,
including close scale/readability and broad landscape distribution; show that
wet surfaces and terrain/date changes gate them correctly; report browser CPU
work, instance counts and combined owned/shared bytes; and record explicitly
that rocks are visual-only unless a separate collision task is approved.

### 4. Reduce and bound the combined desktop frame cost

On the current candidate, the 1440×1000 RTX 5090 ordinary near-ground browser
run measured 29.4 ms p95 frame interval, 28.2 ms p95 CPU frame work, 10.38 ms
p95 sum of instrumented GPU passes, and 1,136,801 triangles. It showed 705
visible forest trees, 1,624 flora placements and 128 submitted animals. This
is a single current-build measurement, not a controlled comparison or a
midrange-PC result.

Profile the combined system with forest detail, understory, fauna, clouds,
rocks and terrain enabled. Separate CPU and GPU bottlenecks; inspect cold load,
settled stationary view, camera movement, date seeking and tree/animal handoff.
Use equal seed/date/pose/view and build settings for comparisons. Optimize the
measured hotspot while keeping representation and identity correctness. Record
the exact GPU, resolution, browser, commit, p50/p95/max and all active quality
settings. Keep Quest as a separate measured profile.

**Acceptance:** agree on and state the desktop hardware floor and budgets; meet
those budgets on the named hardware; bound memory and streaming backlog; and
show that detail remains visible during continuous flight/landing. Do not infer
60 FPS from the RTX 5090 run or from Node microbenchmarks.

### 5. Integrate, document and publish only after acceptance

Keep implementation and validation in staged commits with a short receipt per
stage. Run focused and full tests, clean production build, then hardware browser
acceptance against the exact committed preview. Keep rivers disabled. Include
forest/far transition, animal continuity, rock diagnostics and free-flight to
ground contact in the final acceptance set. Verify the generated build stamp
and live site after publishing; record the published commit and URL. Do not
publish `770d807` or later candidate changes until the gates above pass.

## Evidence from this integration

Reports and screenshots are local, ignored test artifacts under
`test-results/desktop-realism-770d807/`:

- `desktop-rendering/report.json` and `near-ground-warmed.png` — forest/flora/fauna,
  cloud allocation, hardware profile and frame timing; pass, but no rock field
  record.
- `population-flight/report.json`, `01-contact.png`, `02-fauna-low-flight.png`
  — 128 animals, 20.98 m movement with retained ID, exact-date replay, motion
  during realtime, and grounded contact at 1.63 m; pass.
- `rivers-off/report.json` — old river URL resolves to the ordinary body with a
  compatibility notice, no river controls or diagnostics, dated ocean active,
  and flight/landing working; pass.
- `fauna-visual/01-fauna-framed.png` and `fauna-visual/failure.json` — close
  animal/tree image plus the unresolved missing-ID date transition.
- `fauna-visual/diagnose.mjs` is a local diagnostic prototype for the exact
  date/pose; it has not been run or reviewed and is not a passing test.
