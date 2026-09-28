# Fauna continuity and close presentation — receipt (2026-09-28)

Task 1 of `docs/opus-5.5-desktop-realism-handoff-2026-09-28.md`. Branch
`opus55/fauna-continuity-20260928`, based on `743b3f4`.

## Finding: the individual never left

`tests/fauna-near-body-visual-followup.browser.mjs` "lost"
`G001/C2128,0,1/0/planet/1:fauna:562ff898` after an in-page 1.75 s seek at
date `435084631200000040194500000`. `__atlas.faunaTrace(ids)` (new, diagnostic
only) follows one id through census, terrain stencil, dated position, range,
camera/shadow frusta, instance budget, near rig and lighting.

- **The seek path.** An in-page `seek` from the ground triggers the documented
  grounded-seek policy (`docs/walking-and-time.md`, contract §3.3). The walker
  is released and the camera hovers 160 m up. The old fixture then read
  `travel.walking.position` from a null walker. At every offset from 0 to 10 s
  the target stays resident, `groundReady`, 159.35 m away, idle, at the same
  position, and drawn as a shadow caster (camera heading unchanged, so the
  animal is below the frustum).
- **The grounded path.** Exact-date cold restore of the saved walk address at
  each offset, aimed at the animal, with trees on:

| offset s | stage | distance m | gait | stateS | canonical pose (x, z) |
|---|---|---|---|---|---|
| 0 | near-rig | 8.039 | idle | 3.111 | −9.5912, −4.7894 |
| 0.25 | near-rig | 8.039 | idle | 3.361 | same |
| 0.5 | near-rig | 8.039 | idle | 3.611 | same |
| 1 | near-rig | 8.039 | idle | 4.111 | same |
| 1.75 | near-rig | 8.039 | idle | 4.861 | same |
| 3 | near-rig | 8.039 | idle | 6.111 | same |
| 5 | near-rig | 8.039 | idle | 8.111 | same |
| 10 | near-rig | 8.039 | idle | 13.111 | same |
| 20 | near-rig | 11.731 | walk | 7.176 | −13.228, −3.420 |
| 30 | near-rig | 15.110 | walk | 17.176 | −15.308, 1.474 |

`gaitPeriodS` is 15.93 s, so the idle window ends at +12.82 s. Zero displacement
for 0–10 s is the seeded schedule, not a freeze. By +20 s it is walking.

## Real defects found on the way

1. **Instance budget cut in view.** At this ground pose, 224 animals are
   camera-visible and about 65 more cast shadows inside 600 m. The instanced
   field held 128: 161 budget drops, 96 of them in view, chosen by distance
   rank. So whether a distant animal was drawn depended on how many nearer
   ones the camera faced, which pops animals in view.
   - Fix: `FAUNA_FIELD_CAPACITY` 512. Eyes are drawn only within 60 m, a fixed
     distance rule.
   - After, same pose: 289 drawn, 0 drops (+20 s: 294 drawn, 0 drops).
2. **Near-black shaded surfaces.** The hemisphere light's ground term is the
   irradiance on downward-facing surfaces. It was the bare ground albedo,
   about a fifth of the reflected sunlight at midday, and this affected fauna,
   tree trunks and conifer undersides alike.
   - Fix: it is now `albedo × (sun·cosθ·I_sun/I_sky + sky)` per frame.
   - sRGB samples at the same pose, before and after:

| surface | before | after |
|---|---|---|
| fauna rump | 5.3% | 15.1% |
| leg | 2.0% | 6.3% |
| trunk | 14.7% | 20.6% |
| conifer needles (green) | 26.6% | 31.6% |
| sunlit ground | 37.5% | 37.7% |

## Fixture and tests

- The follow-up fixture observes the shifted date from a grounded exact-date
  restore, and asserts the hover policy explicitly (not grounded, 150–170 m
  clearance). It proves the canonical position is identical (< 1e-6) across
  hover, shifted and returned observers, and that in-view handoff samples are
  drawn. No original assertion was removed.
- `tests/fauna-continuity.test.mjs` (in `npm test`) replays
  `tests/fixtures/fauna-continuity-562ff898.json`. The fixture is exported from
  the app by `tests/fauna-continuity-fixture.browser.mjs`. The test checks:
  - identity is a pure function of seed, body, canonical cell and species, and
    visit order doesn't change it;
  - every observed dated pose, and that seek order doesn't matter;
  - the idle window with no teleport at its end;
  - hover residency and range;
  - budget capacity versus the measured population.
- `tests/surface-lighting.test.mjs` checks the ground-bounce formula, how it
  scales with sun elevation, and the reset on disable.

## Evidence

All under `test-results/opus55-fauna/` (git-ignored):

- `before-grounded-{0,1.75,20}s.png` and `after-grounded-{0,1.75,20}s.png`:
  same seed, date, pose and lighting.
- `compare-grounded-{0,20}s-closeup.png`.
- `before-seek-hover-plus-1.75s.png`.
- `trace/trace.json` (before, both phases) and `after/trace.json`.
- `fixture-export.log` and `followup/`.

## Test results

- `npm test`: 803 tests, 800 pass, 0 fail, 3 skipped (the baseline was 797/794/0/3; 6 tests were added).
- `npm run build`: passes. Only the existing chunk-size warning remains.
- The follow-up browser fixture (hardware GPU, port 5191) reports `ok: true`
  with no page errors. The measurements:
  - `rootDisplacementM`, `hoverVsGroundedM` and `returnPositionErrorM` are all 0;
  - the gait is idle to idle;
  - the handoff samples are near-rig at 8.0 m, then instanced and
    camera-visible at 80.4 m and at 100.85 m.
- `tests/fauna-closeup.browser.mjs` (port 5191) exits 0:
  - 292 animals drawn in both frames;
  - stable ids and positions;
  - no errors.

## Open items

- A URL `heading` restore faces about π from the encoded view, so the fixtures
  aim with a look-drag. Not investigated.
- The budget can still saturate at densities above 512 animals within 600 m.
  Priority there remains visible-first.
- The ground-bounce change is global. Tree and rock shade presentation should
  be re-checked when stage branches are integrated.
- Whether a grounded seek should keep the observer on the ground is a product
  decision. The policy is documented and unchanged here.
- Frame timings were not measured as acceptance evidence, because the GPU was
  shared.
