# climate-grid-1

Round 2 (2026-10-04), backlog task 5 BIOME2-GRID. Module: `src/climate-grid.ts`. Test: `tests/climate-grid.test.mjs` (not yet registered; the merger appends it to `npm test`).

## What it is

A per-body, static climate grid with two fields that the surface climate can read per sample:

- `oceanness` in [0, 1]: maritime influence, `exp(-distKm / 1500)` of the great-circle distance to the nearest ocean cell (1 on the ocean).
- `precipMul` in [0.15, 1.6): a precipitation multiplier from a moisture bucket carried by the prevailing wind, which gives continentality (drier inland) and plateau-scale rain shadow (drier in the lee of high ground). 1 on the ocean.

It is **pure and unwired**. Nothing in `src/` imports it yet, so no digest, golden or version moves. Wiring is step M2 of task 9 (BIOME2-CLIMATE).

Determinism: it imports only `catalog.ts` (`macroHeightCode`) and `det-math.ts` (`detAtan2`, `detExp`, `sine`, `detCos`). It uses no `Math.pow`, `**`, `Math.sin/cos/...` or `localeCompare`; a source-grep test enforces this and the import boundary. Two builds from the same parameters are byte-identical (tested).

## API

```ts
CLIMATE_GRID_VERSION = 'climate-grid-1'
buildClimateGrid(p: ClimateGridParams): ClimateGrid
sampleClimateGrid(g, d, out): out          // writes out.precipMul, out.oceanness01; no allocation
createClimateGridSample(): ClimateGridSample
landProxyHeightM(a0, radiusM, profile): number
buildClimateGridFromMask(p, mask)          // TEST ONLY: synthetic ocean/height mask, same code path
```

`ClimateGridParams`: `moistureSeed` (terrain's macro code, `hash64(seed+'/macro-v1')`), `water`, `radiusM`, `obliquityRad` (carried for the cache key; the ITCZ is already folded into the next field), `itczSinLat` (|sin| of the ITCZ latitude), `hadleyEdgeDeg`, `zonalAnnualK` (65 datum annual means over x = |sin lat| = k/64, the surface-climate table layout) and the optional `land` profile.

The grid stores both fields as `Float32Array`s at the vertices of a 6 x 33 x 33 gnomonic cube map: 52,272 bytes per body. Shared edge and corner vertices are the same direction, so the field is continuous across faces. The sampler picks the dominant axis, uses rational face coordinates (no `atan`/`asin`) and interpolates bilinearly. It accepts any non-zero finite direction; normalisation is not needed.

## Model

1. **Mask.** A 128 x 64 equirect grid of cell centres. Ocean where `macroHeightCode(moistureSeed, d) < 0.37 + 0.22 * water` (terrain's `sea`). Dry worlds (`water <= 0`) return oceanness 0 and precipMul 1 everywhere. An all-ocean mask returns exactly 1 and 1.
2. **Land height proxy.** `a0 = (macro - sea) * 47000`, then the profile, clamped to [0, 18000] m and scaled by `min(1, radiusM / 2e6)`:
   - `{kind:'relief', tau, hc, hup, b1, b2, hhi, b3, b4}`: `a0/(1 + a0/hc) + tau*(hup*ss(b1,b2,a0) + hhi*ss(b3,b4,a0))`, which is the terrain-1.8.0-relief water-world land floor without ridges and the fine term (tested against `RELIEF_CALIBRATION`).
   - `{kind:'linear', metresPerUnit}`: the pre-relief proxy. It is the default when `land` is absent, for backward compatibility only.

   Ridges, the fine term and the coast perturbation are below the grid resolution (2.8 deg cells, about 310 km on an Earth-sized body) and are omitted on purpose. The grid models continentality and plateau-scale shadow, not single ranges.
3. **Ocean distance.** Two fixed forward/backward raster sweep pairs propagate the nearest ocean cell (compared by chord length, converted to arc length), with longitude wrap and the cross-pole neighbour. The cost does not depend on geography. Worst error against brute-force great-circle distance is 1.9% over seven test oceans (a wrapped patch, a long thin meridian, a wrap-seam-only strip, single polar and equatorial cells, a long thin equatorial strip).
4. **Wind march.** Per latitude row, the direction comes from the angular distance to the ITCZ latitude: trades (toward -lon) within `hadleyEdgeDeg`, westerlies (toward +lon) out to 60 deg from the ITCZ, polar easterlies beyond. The ITCZ latitude is mirrored into both hemispheres. Two revolutions per row make the result independent of the start column.
   - Over ocean the bucket refills to `Wsat = exp(0.07 * (T_row - 288))` (about 7%/K, Clausius-Clapeyron).
   - Over land the rainout fraction is `min(0.9, base + 0.35 * rise / 1500 m)`, with `base = 1 - exp(-cellKm / 2500 km)` per kilometre (independent of resolution and radius) and `rise` the proxy height gain from the upwind cell.
   - `precipMul = rainout / (Wsat * base)`, so a flat coast with a full bucket reads 1. Clamped to [0.15, 1.6). A row with no ocean cell has an empty bucket and reads the 0.15 floor.
5. **Resample** bilinearly (longitude wrap; the half-cell polar caps blend to the row mean) at each cube vertex.

Calibration (chosen to pass the acceptance below, not fitted to any world): L = 2500 km gives 0.449 retention after 2000 km of flat land; the orographic coefficient 0.35 per 1500 m adds 70% rainout on a 3 km ascent before the 0.9 cap.

## Acceptance (task 5 / biome2 plan P2)

| Criterion | State | Evidence |
|---|---|---|
| Aquaplanet gives precipMul 1 and oceanness 1 everywhere | pass | test 1, all vertices plus 1000 samples, exact equality (all-ocean mask; catalogue water is never 1) |
| Water 0 gives oceanness 0 | pass | test 1 |
| Leeward of a 3 km ridge <= 0.6x windward | pass | test 2: a synthetic continent with a 2-cell 3000 m ridge, rows at 43.6 deg N and S, samples one flat cell outside each ridge edge. Ridge lee/windward is 0.398. A **flat-ground control** at the same positions gives 0.636 and is asserted to stay above 0.6, so continental drying alone cannot pass. The ridge lee must also be <= 0.7x the flat lee (measured 0.638). Mutation check: with the ridge replaced by flat ground, the test fails |
| 2000 km inland downwind <= 0.6x the coast | pass | test 2, on the flat control so the ridge cannot help |
| Wind-zone reversal mirrors the shadow | pass | test 2 (`hadleyEdgeDeg` 30 vs 60, both hemispheres). Test 7 holds the Hadley edge at 30 and moves only the ITCZ: 0 and 10 deg stay westerly (east dry), 20 deg crosses the edge into the trades (west dry), in both hemispheres. Mutation check: with the ITCZ ignored by the wind rule, the test fails |
| Face-edge seams <= 1e-3 | pass | test 3, 10,000 edge and corner pairs; a corrupted face fails the same check |
| Builds bit-identical | pass | test 4, byte compare; a different seed differs |
| No raw `Math.*` transcendentals; imports catalog.ts and det-math.ts only | pass | test 9 |
| Grid <= 64 KB | pass | 52,272 B (test 4) |
| Build mean <= 2 ms | pass, contended host | 1.966 ms mean over 24 distinct catalogue bodies |
| Build cold <= 5 ms | **OPEN / fail** (contended host) | median 8.27 ms over 7 fresh processes. This excludes a further 5.86 ms of module import plus geometry init, paid once per process. Runner probe: 8.0-15.3 ms with the noise already JIT-warm. Breakdown in "Open". Needs a quiet-host measurement (task 20) and the re-baselined acceptance (task 2) before any verdict |
| Sample <= 30 ns, zero allocation | pass, contended host | 10.7 ns/call over 2e6 calls; GC-bracketed heap delta -488 B |
| `npm test` and golden unchanged | **deferred** | The full suite (`npm test` / `test:full`) and golden are merger-only and were not run |
| Affected tests (separate evidence, not the row above) | pass for the selected set | nothing imports the module; `test:affected -- --base main` passes 36/36 (fix round, 2026-10-04), and life-guard reports LIFE_FILES untouched |
| Re-baselined targets from task 2 (BIOME2-REPLAN) | **open-owner** | task 2 has not landed. This table is the original P2 acceptance; see "Open" |

Bench script: `test-results/round2-2026-10-04/biome2-grid/bench-climate-grid.mjs` (results in `bench-results.json` beside it).

## Open

- **Cold build.** The cold first build in a fresh process is about 4x the warm build. Instrumented cold stages: macro noise 3.4 ms, distance 2.9 ms, wetness 0.5 ms, wind 1.2 ms, resample 1.6 ms. Module import plus geometry init is a further 5.9 ms (geometry 4.2 ms), once per process. Every number here was measured while other agents ran. A quiet-host measurement belongs to task 20 (PERF-QUIET-HEADSET). Do not label the cold budget passed before then.
- **Re-baseline.** Task 2 (BIOME2-REPLAN) has not landed. The acceptance above is the original P2 list, which does not depend on world calibration. The relief land profile replaces the plan's linear `(macro - sea) * 47000` proxy, because relief compresses water-world land plateaus to at most about 1.7 km at tau 1 (about 4.1 km at tau 2.6, before ridges), where the linear proxy gives up to about 15 km.
- **Timing gates** are not in the registered test (test policy: wall-clock caps go to `tests/perf/`). A `tests/perf/climate-grid.perf.test.mjs` is a merger decision.

## Wiring notes for task 9, step M2

- Pass `land: {kind:'relief', tau: tectonicReliefOf(body), hc: RC.HC, hup: RC.HUP, b1: RC.B1, b2: RC.B2, hhi: RC.HHI, b3: RC.B3, b4: RC.B4}`. `surface-climate.ts` may not import `terrain.ts`, so decide where this profile is built. A `RELIEF_CALIBRATION` change then also changes the grid, and the climate cache key must follow it.
- `radiusM` must be in the forcing key and in the `forcingForBody` parity check (the duplicate-key trap in the biome2 plan, step 8).
- The mask uses the **datum** sea (`0.37 + 0.22 * water`), not the dated sea level. The grid is static per body, so climate seek-independence holds. A dated-sea grid would need the date in the cache key.
- `itczSinLat` and `hadleyEdgeDeg` come from the climate v2 forcing (task 9 step 6). Until then a caller can pass 0 and 30.
