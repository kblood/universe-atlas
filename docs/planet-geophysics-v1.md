# planet-geophysics-1

Relief round 2026-10-03, package P1-GEO-FLOOR. Module: `src/planet-geophysics.ts`. Tests: `tests/planet-geophysics.test.mjs`.

## What it is

Per-planet surface physics, as queryable derived data:

- density
- surface gravity
- escape velocity
- tectonic vigour
- the relief scale `tectonicRelief`
- air retention (`hasAir`, `airClass`)
- a heuristic surface pressure
- the ocean fluid density

The world layer and games built on it read these values. Whether a place is survivable is a game-layer rule, not a world-layer rule.

`planetGeophysics(body)` is a pure function of `(seed, kind, type, radiusM, temperatureK, water)`, cached FIFO under exactly that key (1024 entries).

- It never reads `massKg`.
- It never reads simulated time or the planet's age.
- It imports only `catalog.ts`.
- Its arithmetic is `+ - * / Math.sqrt Math.min Math.max` plus constants. A source-grep test enforces this, so every value can feed a height, an ocean flag or a class and stay bit-identical across engines.

### Gravity is for surface physics only (owner decision 4)

The catalogue `massKg` stays the orbital mass, so orbits, moons, bookmarks and the golden `systems` digest do not move. This module's `surfaceGravityMS2` comes from density and radius, and it can disagree with `G*massKg/R^2`. Examples:

| Planet | Catalogue g (m/s2) | Geophysics g (m/s2) |
|---|---|---|
| Selawyn | 11.48 | 18.56 |
| Lethuris | 12.07 | 17.66 |
| Maithea | 6.97 | 6.82 |
| Raiva | 2.69 | 2.55 |

The masses are to be reconciled later.

## Model

The seeded lanes come from `hash64(seed + '/geophysics-1')` as three 16-bit lanes `u1`, `u2` and `u3`, each in [0, 1].

| Field | Definition |
|---|---|
| `coreFraction` | 0.10 + 0.50·(u1+u2)/2 (core MASS fraction, triangular, mean 0.35) |
| `densityKgM3` | 1/((1-cf)/3300 + cf/8000) · (1 + 0.35·x²), x = R/6.371e6 (self-compression) |
| `surfaceGravityMS2` | 4/3·π·G·ρ·R |
| `escapeVelocityMS` | √(2gR) |
| `tectonicVigour01` | (0.35 + 0.65·u3) · min(1, R/6.4e6) |
| `tectonicClass` | u3 tertiles: quiet / moderate / active (a label of the static draw, not an age) |
| `tectonicRelief` | clamp(9.81/g, 0.6, 2.6) · vigour / 0.7; 0 for gas giants and stars |
| `airRetentionRatio` | v_esc / v_rms(N2, T), v_rms = √(3kT/m), m = 4.65e-26 kg |
| `hasAir` | water world, OR v_esc > 8 · v_rms(N2, T) |
| `airClass` | none; earthlike (water world); thick (dry, T ≥ 300 K); thin (dry, T < 300 K) |
| `surfacePressurePa` | none 0; thin 600·g/3.7; earthlike 101325·g/9.81; thick 9.2e6·g/8.87 (provenance `heuristic`) |
| `fluidDensityKgM3` | 1025 (sea water) on water worlds, else 0 |

The helper `pressureAtDepthPa(geo, depthM)` returns P_surface + ρ_fluid·g·depth. The seabed always exists at its true depth (owner decision 5). Pressure there is data only.

### Gas giants and stars

- **Gas giants:** `solidSurface: false` and `tectonicRelief: 0`. Density is a heuristic 1300 kg/m3 (Jupiter 1326, Saturn 687), so Saturn-like planets come out about 2x too heavy. The reported surface pressure is the conventional 1 bar level (`convention-1bar`).
- **Stars:** density is the mean solar density, 1410 kg/m3. There is no air and no relief.

## Deviations from the plan, with reasons

1. **The air-retention factor is 8, not 6.** The catalogue temperature is an equilibrium value, 278/√a (catalog.ts:847). With a factor of 6 at that temperature, a Mercury analogue (447 K, ratio 6.69) would keep an atmosphere, which contradicts the acceptance criterion. The literature's factor of 6 applies at the hotter exospheric temperature. The six analogues' ratios are:

   | Analogue | Ratio | Air? |
   |---|---|---|
   | Moon | 4.83 | no |
   | Mercury | 6.69 | no |
   | Mars | 11.29 | yes |
   | Titan | 13.09 | yes |
   | Venus | 19.25 | yes |
   | Earth | 22.42 | yes |

   A factor of 8 separates the two groups with more than 15% margin on each side. On the 460-planet rocky corpus, 450 planets keep air at a factor of 8 and 458 at a factor of 6.

2. **The 0.7 normaliser of `tectonicRelief` is kept as the prototype has it.** With it, an Earth twin at the reference vigour of 0.7 gets 1.004. At the seed-median draw (u3 = 0.5, vigour 0.672) the result is **0.964**, not 1.00. Changing the normaliser to 0.672 would raise every planet's relief by 4.2% and move the tau distribution that the relief calibration (R-CAL-1, Maithea tau 0.79) was measured on. The test asserts both values.

## Measurements (test-results/relief-round-2026-10-03/P1-GEO-FLOOR/)

### Analogues

Each analogue uses its real radius, a core fraction chosen per analogue, and the catalogue-convention temperature.

| Analogue | R (km) | cf | T (K) | ρ model | ρ real | g model | g real | v_esc model (m/s) | Air | Pressure model |
|---|---|---|---|---|---|---|---|---|---|---|
| Earth | 6371 | 0.32 | 278 | 5486 | 5514 (verified, NASA fact sheet) | 9.77 | 9.8 (verified) | 11159 | earthlike | 100.9 kPa (real 1 bar, verified) |
| Venus | 6051.8 | 0.30 | 327 | 5271 | 5243 (verified) | 8.92 | 8.9 (verified) | 10390 | thick | 9.25 MPa (real 92 bar, verified) |
| Mars | 3389.5 | 0.15 | 225 | 3977 | 3934 (verified) | 3.77 | 3.7 (verified) | 5055 | thin | 611 Pa (real 0.01 bar, verified; ~610 Pa from memory) |
| Mercury | 2439.7 | 0.60 | 447 | 5358 | 5429 (verified) | 3.65 | 3.7 (verified) | 4223 | none | 0 (real 0, verified) |
| Moon | 1737.4 | 0.02 | 278 | 3426 | 3340 (verified) | 1.66 | 1.6 (verified) | 2405 | none | 0 (real 0, verified) |
| Titan | 2574.7 | 0.10 | 90 | 3706 | 1880 (verified, NASA Saturnian satellite fact sheet) | 2.67 | 1.35 (from memory) | 3707 | thin | 433 Pa (real ~1.5 bar, from memory) |

Sources:

- "Verified" means checked on 2026-10-03 against https://nssdc.gsfc.nasa.gov/planetary/factsheet/ (Mercury, Venus, Earth, Moon, Mars) and https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html (Titan radius and density).
- The radii in the table are mean radii from memory. The fact sheet lists equatorial diameters, which are consistent with them.
- The analogue temperatures follow the catalogue convention, 278/√a. They are not the real mean surface temperatures.

**Known limitation: icy bodies.** The model has no ice mantle, so Titan's density is about 2x too high and its gravity about 2x too high. Titan's air class is "thin", while the real Titan has a thick, ~1.5 bar atmosphere.

**Challenger Deep check:** `pressureAtDepthPa(EarthTwin, 10935 m)` = 109.6 MPa. The real value is about 1086 bar (from memory).

### Corpora

The geophysics was measured on two corpora drawn from galaxies 0-2 of LETHRA-GOLDEN-001, sector [0,0,0]:

- **The planning corpus:** 132 habitable water planets from the first 120 refs.
- **The rocky corpus:** the first 460 non-gas-giant planets in ref order. The plan names "the same selection as biome2 P2" but does not define it, so this selection is our own.

| | 132 water (planning) | 460 rocky |
|---|---|---|
| g p10/p50/p90 (m/s2) | 3.35 / 7.57 / 14.79 | 3.45 / 8.02 / 14.97 |
| g min..max | 2.51..18.98 | 2.18..19.64 |
| catalogue g p10/p50/p90 | 3.76 / 7.10 / 10.85 | 3.64 / 7.34 / 10.98 |
| tau p10/p50/p90 | 0.594 / 0.885 / 1.389 | 0.539 / 0.894 / 1.389 |
| Spearman(g, R) | 0.992 | **0.990** |
| hasAir | 132 (all earthlike) | 450 (none 10, thin 245, earthlike 165, thick 40) |

**Agreement with the planning prototype** (scratchpad relief-scripts/geo.mjs): the maximum relative difference in g is 4.5e-5 and the maximum difference in tau is 8e-5. Both come from the prototype's G = 6.674e-11 against the catalogue's 6.6743e-11.

The four judged water worlds:

| | T (K) | g catalogue | g geophysics | cf | vigour | tau | Pressure |
|---|---|---|---|---|---|---|---|
| Maithea | 284 | 6.97 | 6.82 | 0.229 | 0.384 | 0.789 | 70.5 kPa |
| Selawyn | 320 | 11.48 | 18.56 | 0.522 | 0.704 | 0.603 | 191.7 kPa |
| Raiva | 300 | 2.69 | 2.55 | 0.424 | 0.123 | 0.456 | 26.3 kPa |
| Lethuris | 275 | 12.07 | 17.66 | 0.343 | 0.899 | 0.771 | 182.4 kPa |

### Acceptance criteria not met, stated precisely

**Spearman(g, R) < 0.95 is not met (measured 0.990).**

- Why: with g = 4/3·π·G·ρ·R, the seeded density spread is only about ±25% (p10/p90 4350/6690 kg/m3) against a 4.5x radius span (2000-9000 km), so g ranks almost exactly with R. The real rocky solar-system bodies also rank 1.0: Europa, Moon, Io, Mercury, Mars, Venus and Earth fall in the same order by R and by g.
- What would meet it: an ice mantle for `Ice world` bodies (187 of the 460; T 6-136 K). With ice mass fraction 0.25-0.50 at 1200 kg/m3, Spearman drops to 0.84; at 0.30-0.60 it drops to 0.81. This would also correct Titan.
- Why it was not shipped: it raises Ice-world gravity factors, and therefore their `tectonicRelief`, which changes the relief calibration P4 works from. Ice is also mechanically weaker than rock, so it would need its own relief factor. This is left as an owner/P4 decision. The test is kept as a visible `todo`.

**Tau p10 on the 460 rocky corpus is 0.539, which is 0.051 from the prototype's 0.59.**

- On the prototype's own 132-planet corpus the value is 0.594.
- Per-planet values match the prototype to 8e-5, so the gap comes from the different corpus (it adds small dry and icy planets), not from the implementation.

**"g spans ≥ 2-15 m/s2"** is read as "covers roughly 2 to 15". The measured range is 2.18 to 19.64. Catalogue planets start at R = 2000 km, which puts the lowest possible g at about 2.0.

## R0: the terrain floor/window split (same package)

`terrainFloorSampler(body, ...)` takes the same arguments as `terrainSampler` and returns the same samples plus three extra `SurfaceSample` fields. The plain `terrainSampler` keeps its historical field set (tests/river-terrain.test.mjs deep-compares that shape), so the change is additive: elevation, ocean and colour output are unchanged, and `ELEVATION_IDENTITY_SHA256` and `KEPT_PALETTE_COLOUR_SHA256` hold.

- **`floorM`:** the smooth regional floor. It is the base field after the [-16, 18] km clamp and the min(1, R/2e6) scale.
- **`windowM`:** the local window, equal to the uncratered height minus `floorM`. It is the hills/gullies/rocks layer plus the landforms.
- **`continentalM`:** the continental coordinate A·scale. On water worlds its sign is the sea-level-0 coastline.

`terrainWindowMaxM(body)` returns 772 + 1908·min(1, R/2e6).

- For R ≥ 2000 km this is 2680 m.
- The 772 m hill layer is metre-based and is not scaled by radius. The plan's shorthand 2680·min(1, R/2e6) is therefore wrong for small moons: Naorven (R 906 km) reaches 1528 m against that shorthand's 1213 m.

Measured over 20000 directions per body:

- 0 window violations on 6 bodies.
- Window maxima are 2487-2551 m on the full-size bodies.
- 0 coast-sign mismatches on the 4 water worlds.

Test: `tests/terrain-floor-window.test.mjs`.
