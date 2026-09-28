# Continuous planet detail

## Current direction — 2026-09-27

The current [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md) extends this continuity contract with procedural species, reusable structural variants, per-instance appearance and a coverage-preserving canopy. The current sparse far-tree representation remains a limitation until that stage is implemented.

## Contract

Flight and walking see one dated planet in metres. Landing changes movement
and collision, not whether its landscape exists. Visibility depends on the
camera's distance and projected size, while population identity depends on
the world seed, body, stable surface cell and dated biosphere.

## Budgets and layers

1. The orbital surface remains visible until replacement tiles have useful
   resolution. Screen-space refinement continues during descent and low flight.
2. Regional terrain supplies kilometre-scale landforms. Local material detail
   supplies metre and centimetre texture without changing collision geometry.
3. A bounded forest stream begins during descent. It samples fixed planetary
   cells, caches their habitat/ground results, and admits only a small amount of
   placement work per frame. Individual tree LODs share placement and physical
   dimensions. Farther away, a stable sparse subset of the same trees remains
   visible; a coverage-preserving aggregate canopy is planned.
4. Nearby ground cover and fauna operate in low flight as well as on foot.
   Smaller objects have shorter visibility ranges. Species availability and
   sterile/microbial/extinct gates remain authoritative.
5. Ground contact refinement prepares ahead of touchdown. Existing surface
   collision must be ready before a walker is created. Until then, the camera
   stays above the sampled surface and the surrounding scene remains visible.

Atmosphere and clouds provide depth cues, but do not substitute for missing
terrain or populations. Work queues, retained cells, instances and terrain
memory are bounded. Old visible data remains while replacements prepare.

## Acceptance

Review the same ordinary inland habitat from descent, low flight and walking,
including trees/animals before landing. Record visible instance counts, plant
heights, terrain levels, queue lengths, memory, frame times and browser errors.
Check population identity while moving away/back and direct date seeking.
Verify manual held-forward flight survives galaxy and system boundaries and
that descending onto suitable dry terrain enters walking without a menu action.
Retain river/shore coverage, dated existence and allocation regression checks.
Desktop results are separate from physical-headset acceptance.

## Implemented resource contract

| Layer | Physical scale / range | Bound |
| --- | --- | --- |
| Regional geology | 14 km, 2.3 km, 310 m ridge wavelengths; up to about 1.9 km additional relief | Pure sample, no retained global mesh |
| Flight terrain | Higher detail below 6 km ground clearance | 390 selected leaves; 768 resident plus pending tiles |
| Contact terrain | Metre and sub-metre triangles near the capsule | 450 leaves; balanced 2:1 adjacency; mandatory support admitted first |
| Forest preparation | Starts below 3.5 km, centred on the observer's ground location | One current population worker request; stale replies rejected |
| Individual trees | 10–22 m height; 18 m candidate spacing; 650 m working footprint | 192 detailed + 4,096 distant instances; XR 64 + 1,024 |
| Distant trees | Stable 6.5% of canonical 18 m candidates; selection to 4.5 km, drawing to 4 km, altitude fade at 3–3.5 km | 8,192 instances; XR 2,048; frustum culled |
| Habitat placement | Dry, suitable biome; slope and dated tree availability gates | 48 placements or about 2 ms per frame; 24,000 retained cells |
| Forest uploads | Retained origin until 256 m movement; per-slot matrix/colour reuse | Dirty attribute ranges; resident candidate scan still occurs |
| Ground cover | Active below 350 m and during contact; visible to 120 m | Canonical cell enumeration, four kinds × three instanced LOD buckets |
| Wildlife | Same genome-derived primitive anatomy within 600 m | Four instanced primitive batches; up to 128 individuals |
| Touchdown | Contact prepares below 350 m; deliberate descent to 1.64 m eye clearance plus 12 cm tolerance | Wait for canonical hydrology and settled collision; retain safety clearance meanwhile |

Desktop retains a 256 MiB core reservation, including pending terrain results,
ground materials, water/environment resources and a 16 MiB life allowance,
plus up to 160 MiB for cloud resources (416 MiB combined). Immersive mode retains
a 256 MiB combined cap with a smaller cloud allocation.
This is subsystem accounting, not a cap on the whole browser process or a
claim of measured headset performance. Work and allocation remain bounded
when the observer travels: the whole planet is never populated in memory.

`planet-population-worker.ts` enumerates fixed cell identities away from the
render thread. `planet-forest.ts` retains the last working set until its
replacement arrives, then spends a bounded amount of time evaluating habitat.
Changing the camera changes the requested cells, not their seeded contents.
Tree identity uses `surface-population-2`; regional geology uses
`planet-landforms-1` and terrain version `terrain-1.6.0` (inland rivers withdrawn).

At sea-level changes, habitat samples are invalidated and evaluated against
the new water bucket. Dated flora and fauna availability gates remain shared
with the existing biosphere. Rock relief is independent of the current sea
level. The continental baseline still owns canonical drainage and stored
river construction coordinates, preserving catchment addresses.

## Continuity and performance choices

- The orbital preview stays until streamed patches reach useful resolution.
  Coarse patch textures are now 128 pixels, avoiding the first replacement
  being a six-face, very low resolution representation.
- Flight retains its previous quadtree frontier and refines incrementally.
  Horizon and frustum culling avoid refining the back side of the planet.
  Contact re-ranks the balanced frontier to guarantee collision priority;
  it does not depend on the previous flight view filling the cache favorably.
- Individual trees keep their position and size across their two LODs. Distant
  trees share those identities, with overlapping range fades, but their sparse
  subset does not preserve full forest coverage. Tree collision is not provided.
- Visible forest density is independent of camera heading. Retained origins and
  dirty instance ranges reduce redundant matrix/colour updates; this does not
  eliminate resident scans or the need for future spatial chunking.
- Atmosphere and clouds already exist. Their role is depth and weather
  presentation; actual terrain and life stream while the observer is airborne.
- Galaxy/system arrival keeps free flight and forward cruise active. Movement
  keys take over; Escape stops flight. Motion continues during the physical
  crossfade. Rebasing the incoming system also shifts the outgoing view.
- Automatic touchdown uses the existing walking preparation and physics path.
  Unsuitable or wet ground retains flight safety behavior. Landing does not
  generate vegetation or switch the planet to a different geology.

## Historical validation and remaining limits

The measurements below predate the 2026-09-27 population/cloud work and the
2026-09-28 retained-buffer increment. Preserve them as historical evidence, not
validation of today's source. See the [newer validation record](planet-rendering-validation-2026-09-27.md)
and [current implementation plan](desktop-realism-implementation-plan-2026-09-27.md).
The latest source increment has build/type-check coverage only; browser
acceptance remains pending.

`tests/planet-detail.test.mjs` covers fixed cell identity across movement and
cube seams, regional relief, coastal preservation and rock invariance under
flooding. `tests/terrain-streaming.mjs` checks a current canonical river-bank
fixture, fine contact readiness, stable support, 2:1 adjacency and the byte cap.
`tests/planet-detail.mjs` visits ordinary inland habitat, checks life during
flight, descends without clicking Land, and records screenshots and counters.
`tests/visual-continuity.mjs` checks moving galaxy/system handoffs and the
previous star-size and visible-pixel requirements.

The local full unit run passes 390 of 394 checks. The remaining four also
fail on the previously published `12046d5` baseline: cosmology/version
expectations, the scale-factor boundary, and late-time horizon gating. These
are existing issues, not evidence of a fully green suite. Cross-engine golden
terrain checks pass in Node, Chromium, Firefox and WebKit after the explicit
terrain version update.

The history golden fixture was already stale on `12046d5`: computing that
baseline produces the same history hash as this change. The refreshed fixture
records it explicitly; galaxy, sector, system and hierarchy hashes are unchanged.
`tests/free-flight.mjs` additionally holds W with autopilot cancelled across
both scale boundaries and checks movement during the blend.

The final local built-site run (Chromium, Windows D3D11, 1440 × 1000) showed
1,253 individual trees and 653 canopy stands during the 600 m flight; at low
altitude it showed 490 plants and nine animals before walking. Automatic
touchdown completed without the Land button. Rolling median frame intervals
were 16.6–17.0 ms and 95th percentiles 26.1–29.7 ms across the three captures.
There were still occasional longer stalls, so this is not a locked 60 fps
claim. Browser errors were zero and the reserved subsystem bytes remained
below 256 MiB. Screenshots and raw measurements are recorded by the test,
under `test-results/planet-detail-final/`.

The forest remains procedural geometry with sparse distant coverage.
It is not final vegetation art, ecological succession, a global food web,
tectonics, or a complete civilization-ready environment. Planetary sampling,
stable physical scale, bounded streaming and pre-landing visibility are the
foundation provided here. Physical-headset acceptance remains outstanding.
