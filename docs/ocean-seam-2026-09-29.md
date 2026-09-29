# Ocean seam: receipt (2026-09-29)

This receipt covers a straight seam in the global ocean surface. The task
came from the
[desktop-realism handoff](opus-5.5-desktop-realism-handoff-2026-09-28.md).
Branch `opus55/ocean-seam-20260929`, based on `31dec53` (stage-c with fauna,
rocks, tree part 1 and the terrain budget merged). Local only: not merged,
pushed or deployed.

Scope: the ocean Gerstner phase (`src/ocean-gerstner.ts`,
`src/ocean-water-material.ts`) and one argument at the ocean-material call
site in `src/planet-renderer.ts`. Rivers and river-fed lakes stay disabled.
No river, terrain-selection, budget or generation code changed. The wave
field itself is unchanged. The fix only makes every patch sample that one
field consistently.

## Commits

| SHA | What |
|---|---|
| `a16c218` | Failing Node test (reproduction) |
| `fb29dc1` | Fix: per-wave phase offsets restore the world phase; test split into near and far fields, plus a pure offset test |
| (receipt commit) | This receipt |

## Symptom

`test-results/terrain-budget/final-date-b.png` (terrain-budget worktree)
shows a straight horizontal edge in the sea at lower right, around y 660 and
x 1000–1440. The waves change pattern and brightness across it. The pose is
the rock receipt's grounded shore pose on Maithea
(`G001/C2128,0,1/0/planet/1`, seed LETHRA-001), at date B
(`434632321869292101021892696`, sea −4,475 m).

## Cause

Each ocean patch places its Gerstner waves in the vertex shader at

    wavePosM = transformed.xz * R + oceanPhaseOriginM.xz

`oceanPhaseOriginM` is `detailOrigin(anchor, R)`, the patch anchor in metres
reduced modulo `DETAIL_PERIOD_M` = 4096 m. The reduction keeps float32
precise. It was introduced in `4275e43` for the normal-atlas ripples only.
Those ripples repeat exactly at 4096 m: the repeats are 16 m, 32 m and 2 m.

The Gerstner port in `75eb074` reused that origin for analytic waves. Their
wavelengths are arbitrary values between 8 m and 42 m, and none of them
divides 4096 m. So two neighbouring patches whose anchors fall in different
4096 m cells, on the x or z axis, see every wave shifted by
`k·dot(dir, 4096·Δcell)` along their shared edge. The result is a straight
seam: wave heights jump by metres, and the slope-driven shading (brightness)
changes. Wherever both anchors share a cell, the edge is seamless, so only
some patch edges show it. At near-shore tile sizes of a few hundred metres,
that is roughly one edge in a view, which matches the single straight line
in the capture.

Hypotheses that were ruled out:

- **Stale per-tile uniforms from the terrain-budget leaf cache.** The per-leaf
  cache reuses local eye, visibility and detail flags on still frames. The
  ocean frame (eye, sun, phase) still runs every frame.
  `tests/terrain-leaf-loop-digest.test.mjs` already proves 1,061 frames are
  output-identical, including `oceanEyeM` and `oceanTime`. The new test also
  checks that every drawn ocean patch's `oceanEyeM` equals
  `(eye − anchor)·R` and that all patches share one `oceanTime`. It checks
  this on settled, moved (3 m), still and clock-advanced frames. All pass.
- **Vertex density, morph or LOD level.** The seam is a phase discontinuity
  of the analytic field itself. It occurs between same-level patches as well
  as 2:1 patches (see the worst pair below).
- **The normal-atlas UVs.** These are periodic in 4096 m by construction.

## Did it exist earlier?

Yes. The ocean shader, `ocean-gerstner.ts`, `ground-material.ts`'s
`detailOrigin` and the call site are byte-identical at `743b3f4`, `9420bdd`
and `31dec53`. The new test was run on `git archive` copies of both earlier
commits, using the current fixture without the budget imports. Both fail the
same way:

| Tree | Near-field edges (2:1) | Across a 4096 m cell | Max height jump | Max slope jump |
|---|---|---|---|---|
| `743b3f4` | 788 (202) | 358 | 2.207 m | 0.543 |
| `9420bdd` | 788 (202) | 358 | 2.207 m | 0.543 |
| `31dec53` | 759 (191) | 355 | 2.207 m | 0.543 |
| `fb29dc1` (fix) | 759 (191) | 355 | **1.7e-4 m** | **7.6e-5** |

At `31dec53` the worst near pair is `2/10/506/336` | `2/10/507/336`, in
cells `-13,410` and `-11,410`: same level, different cell. The terrain-budget
change did not introduce the seam. It only made it visible at this pose,
because before it the sea at date B was never rebuilt (the baseline capture
shows dry sand there).

## Fix

`oceanWavePhaseOffsets(waves, shiftX, shiftZ)` in `ocean-gerstner.ts`
returns, for each wave, `k·dot(dir, exact − wrapped) mod 2π`. It is computed
in float64 from the float32 `k` and `dir` the GPU uses. The shift is a
multiple of 4096 m, so the reduced offset is exact to about 1e-9 rad at
planetary radius.

The GLSL now reads:

    float phase = k*dot(oceanWaveDir[i],posM) + oceanWavePhase[i] + t*oceanWaveSpeed[i];

`createOceanWaterMaterial` takes an optional `waveOriginM`, the unwrapped
anchor in metres. It sets the `oceanWavePhase` uniform from
`waveOriginM − phaseOriginM`. When `waveOriginM` is omitted, the offsets are
zero, which keeps the behaviour for callers whose origin is already
unwrapped. `planet-renderer.ts` passes `waveOriginM: anchor·R`. The per-patch
offsets are static: they depend only on the anchor and the body's wave
field, so they cannot go stale. The wrapped `wavePosM` still drives the atlas
ripples and the footprint fade, which were already continuous.

## Test

`tests/ocean-seam-continuity.test.mjs` is in the `npm test` list and takes
about 14 s. It has two tests.

1. **Real renderer.** The test settles the production `PlanetRenderer` with
   inline workers 40 m above deep open sea on Maithea (sea −4,475 m, no
   frustum). It then evaluates each drawn ocean patch's wave field from its
   own material uniforms, with float32 uniform values, exactly as the vertex
   shader does. The evaluation points are 15 per edge, on every shared edge
   between drawn ocean leaves, same level and 2:1.
   - **Near field** (both tiles level ≥ 9, at most about 20 km across): the
     height jump must be under 1 mm and the slope jump under 1e-3. The test
     also requires more than 100 edges, more than 10 of them 2:1, and more
     than 10 across a 4096 m cell, so it covers the seam case.
   - **Far field** (level 1–8 tiles, up to a cube face across): float32
     anchor-relative positions cannot resolve 8–42 m waves there, so the
     bound is position precision. After the fix the far jump is 3.2 cm, at
     0.085 of that bound. Before the fix it was 2.31 m, at 325× the bound.
   - The test asserts the shader's `wavePosM` and phase expressions
     textually, so the mirror cannot drift from the GLSL.
   - It checks ocean uniform freshness, as described under "Cause".
2. **Pure offsets.** For 64 planetary-scale anchors (R = 5,195 km) and
   several local offsets, the wrapped position plus the offset reproduces the
   world-position wave sum to under 1e-6 m. The material test checks that
   `waveOriginM` produces these offsets and that omitting it produces zeros.

The test fails at `a16c218`, `31dec53`, `9420bdd` and `743b3f4`, and passes
at `fb29dc1`.

## Captures

The captures are in `test-results/opus55-ocean-seam/`, which is gitignored
scratch. They were taken with `seam-capture.mjs` and `run-captures.sh`.

- **Setup:** headless Chromium, `ATLAS_HARDWARE=1` (ANGLE D3D11, RTX 5090),
  1440×1000. `vite preview` served on port 5197, one browser at a time under
  the shared GPU lock (07:42:43–07:43:52Z).
- **Builds:** `dist-before` is `31dec53`, clean. `dist-after` is `fb29dc1`,
  clean.
- **Pose:** the rock receipt's grounded shore pose. The script settles at
  date A (sea −4,500 m) and seeks to date B (sea −4,475 m) with exploration
  paused. It waits until no patch is stale or pending for 2 s, then captures.

| Run | Settle B | Active tiles | Ocean draws | Page errors | Repeat after 1.5 s |
|---|---|---|---|---|---|
| before (`31dec53`) | 7.97 s | 131 | 109 | 0 | sea region identical (0 px differ) |
| after (`fb29dc1`) | 8.12 s | 131 | 109 | 0 | whole frame identical (0 px) |

Both runs drew the same frontier: the active tile lists are equal, and date
and pose match. The time is frozen, so the frames compare directly.

- `before-date-b.png` reproduces the reported seam: a straight line at
  y ≈ 662 across the sea, with a diagonal step near x 1050–1130. The wave
  pattern and brightness change across it.
- In `after-date-b.png` the waves run continuously through that row.
- `seam-strip-before-after.png` shows the 1120×120 strip at y 600–720, with
  before above after.
- `seam-crop-before-after.png` is the reported lower-right region at 2×.

Residual, not part of this fix: a few tan pixels still sit on the same row,
where the pixel count dropped from 33 to 15 in the 1120×400 sea region (a
hue threshold). They are consistent with sub-pixel slivers at a 2:1 ocean
edge. A locked fine-tile mid-edge vertex takes the exact wave height, while
the coarse edge interpolates linearly between its own vertices, which can
differ by up to about 1 m. The ocean grid has no skirts, so the ground below
can show through. Closing that gap needs per-vertex edge-neighbour data,
for example averaging the wave displacement of the two coarse endpoints on
locked odd edge vertices. That is a separate change to tile buffers and
budget accounting, so it is left as a follow-up.

## Full suite and build (`fb29dc1`)

These were run by a Sonnet subagent, serially:
`node --test --test-concurrency=1` over the `package.json` list (128 files).

- **Tests:** 813 tests, 810 pass, 0 fail, 3 skipped, 228.9 s. This includes
  the 2 new tests. The terrain-budget receipt recorded 810 at `e4cbcd8`.
- **Build:** `npm run build` (tsc and vite) exits 0. The only warning is the
  usual chunk-size warning (rapier-physics, 2,853 kB).
- **Logs:** `test-results/opus55-ocean-seam/npm-test-serial.log` and
  `npm-build.log`.

## Not changed / notes

- Rivers and river-fed lakes remain disabled. No river file was touched
  (`tests/inland-rivers-disabled.test.mjs` passes).
- Far tiles (level ≤ 8) sample 8–42 m waves on vertex spacings of
  kilometres or more, so their displacement is aliased on any GPU. That is
  unchanged by this fix and is outside this seam. A distance-based wave fade
  would be the remedy if it ever reads as noise.
