# Runtime kit roadmap

This roadmap tracks the next Universe Atlas extractions after Creature Kit and
Flora Kit. Complete each kit, its performance work, Atlas integration and
release validation before starting the next one.

## Gate 0: reliable validation

The full Atlas CI run at commit `580197e` failed during `npm test`: Vite/esbuild
workers reported that `vendor/creature-kit/package.json` could not be read.
The same failure is present on pre-Flora commit `45251c1` (CI run
`38396384837`), so Flora Kit did not introduce it. The cause was the generated
uppercase `vendor/creature-kit/PACKAGE.json` receipt being matched
case-insensitively as `package.json` by esbuild on Linux. Atlas now emits
`creature-kit-manifest.json`, removes the legacy receipt transactionally, and
has a regression test that bundles the generated package with esbuild.

The Windows command-length issue is addressed by moving the exact ordered
276-file suite into `tests/default-suite.json` and expanding it in Node before
test discovery. The package command is 155 characters and a real 1/276 shard
passes on Windows. The final full Windows run passes: 2,013 tests, 1,993 passed,
16 skipped, four explicitly open TODOs, and zero active failures. The cold-tier
ownership test exposed active bone masks retained after near/middle geometry
was trimmed; Creature Kit now releases those masks with their LOD data. The
budget test now waits for an observable blocked-admission event with a bounded
timeout instead of assuming it occurs within eight frames.

The prior terrain failures are resolved: pending reservation now exceeds the
largest installed tile measured in the stress fixture (407,174 B reserved vs
390,510 B maximum), budget pressure enters once and recovers, and stationary
water refresh settles without blocked refreshes. The ocean continuity fixture
now has a camera frustum, explicit contact focus and a test-only 120 MiB terrain
budget so it reaches LOD 18; it checks 462 fine shared edges with a maximum
measured height discontinuity of 0.066 mm. The leaf-loop cache matches an
uncached control generated from current source over all 1,061 frames. Remaining
reported TODOs concern the BIOME2 site-ring baseline, the specified geophysics
rank target, the PDD fell-colour band, and a known pre-existing fauna near-drop
case. Gate 0 is green on Windows and Linux: GitHub Actions run `38487153080` at
`cb1fc858428a8576c855123ce1e5d9133aa61317` completed in 18m17s with 2,013 tests,
1,993 passing, 16 skipped, four explicit TODOs and zero active failures. The
workflow also passed recursive kit checks and the Atlas build before the suite.
Tree Kit work now proceeds against that validated baseline.

## 1. Tree Kit

Extract the actual Atlas runtime tree presentation: tree asset families,
resolved species recipe inputs, allometry and structural variants, instanced
rendering, bark and wind/leaf materials, LOD coverage and mip handling, and
captured far impostors. Include a focused Tree Lab that exercises the same Kit
implementation used by Atlas. Keep `PlanetForest` population identity,
habitat/terrain/water eligibility, residency, world-time conversion and
planetary canopy integration in Atlas. Pass resolved traits, instance rows,
lighting and wind inputs across a versioned API.

Extraction preparation has started: `tree-species-recipe.ts` now consumes a
Kit-owned `TreeSpeciesInput` DTO instead of importing Atlas `Species`, and
`tree-asset.ts` resolves its fixed BigInt wind period without importing Atlas
`world-time.ts`. The Atlas catalogue remains the adapter that supplies dated,
eligible species.

Before extraction, record representative CPU time, allocation/heap growth,
instance counts, draw calls, GPU memory and visual coverage across near, middle
and far LODs. Profile asset loading, tree-family sharing, instance uploads,
foliage/bark texture use and impostor generation. Implement optimizations only
where the measurements identify a bottleneck; retain parity for current tree
families, bounds, LOD coverage, safe rollback/disposal and deterministic recipe
hashes. Report before/after measurements in the Kit and Atlas validation.

The existing `tests/forest-frame-benchmark.mjs` supplies fixed stationary,
turn, walk and low-flight CPU scenarios; it does not isolate tree GPU cost. A
baseline was recorded at Atlas commit `cb1fc858428a8576c855123ce1e5d9133aa61317`
on Windows 11, Ryzen 9 9950X3D, Node 24.7.0 and Three 0.181.0, after waiting
for low system CPU load. `PlanetForest.update` p50/p95/max were 0.004/0.008/
0.022 ms stationary, 0.409/0.616/0.954 ms turning at 90 degrees/s,
0.387/0.509/1.116 ms walking at 1.6 m/s, and 0.470/3.165/19.458 ms during
flight at 40 m/s from 120 m (600 frames; 17 frames exceeded 4 ms). The flight
fixture settled in 377 frames and reported 17,912 selected/cached cells, 47
near trees, 106,964 canopy trees and detailed counts `[47, 725]`. Selection
decode/apply recorded 9 replies, 23.22 ms mean and 29.99 ms maximum. This is an
Atlas CPU orchestration baseline with in-process workers and stubbed worker
selection; it does not measure tree-only GPU cost, asset rendering, draw calls,
uploads or GPU memory. Preserve the raw scenario and environment when comparing
later runs.

Next add same-view browser/device captures for near and middle family meshes
and far impostors, including tree-only draw calls, triangles, GPU pass time,
upload bytes and cold/steady/dispose memory. `tests/tree-asset.browser.mjs`
already profiles isolated LOD0/LOD1 for each family, but its fixed population
does not mix distance bands, its counters include scene/grid/shadow work, and
its memory figures are Three object counts rather than GPU bytes. Extend a
fixed-pose fixture to classify tree draws and compare near/middle/far together;
borrow the draw-classification pattern from
`tests/forest-bark-sharing.browser.mjs` and GPU timer-query approach from
`tests/desktop-perf.browser.mjs`. Cross-family bark texture sharing is already
enabled by default and was measured in the accepted Anitar30 comparison: it
recovers 19,573,416 estimated retained CPU/GPU bytes, while the coupled fauna
LOD change makes the whole scene's net saving 4,571,042 bytes. Do not count bark
sharing as new Tree Kit work or claim its combined-scene delta as tree-only
performance. Profile foliage mip/cutoff changes, family-load peak reduction
and far-atlas residency next. Preserve the existing stationary zero-write
result; treat combined-scene GPU figures as context, not tree-only evidence.

The 2026-10-14 isolated asset capture on RTX 5090 measured LOD1 reductions of
64.8%/73.6% in triangles and 59.2%/59.8% in GPU p50 for branching/spire at
192 instances. This validates the existing asset LOD benefit, but is not a
new optimization or an Atlas mixed-distance result. Full method and values are
in `tree-kit-performance-baseline-2026-10-14.md`.

The current two-family bundle contains 25,826,696 bytes (about 24.63 MiB) of
GLB and foliage-mip binary payloads, with all 16 manifest hashes and lengths
verified. However, the family and bundle manifests still mark Atlas-authored
material/texture content `NOASSERTION`; mip manifests also contain workstation-
absolute input paths and review-parent references outside the runtime bundle.
Resolve redistribution rights and make provenance references portable before
publishing these assets as a standalone public Kit. Keep the licensed EZ-Tree
MIT notice and do not infer a license for Atlas-authored content.

## 2. Planet Surface Kit

Keep deterministic terrain, mountains, landforms, craters, geophysics, active
climate fields and active surface-biome fields in one repository initially,
with separate versioned terrain, climate and biome exports. These systems are
currently coupled (`terrain.ts` consumes surface climate and biomes, while the
climate grid shares terrain's continental-height assumptions). Atlas retains
catalogue and stellar state, world-time/lifecycle conversion, worker
scheduling, renderer residency, navigation/collision, scene integration and
river-region activation.

Measure terrain sample throughput, tile generation and transfer latency,
allocation/heap growth, active tile/LOD counts and frame cost on fixed planet
scenarios. Profile repeated deterministic noise/height queries, tile geometry,
parent morphing and material sampling. Implement evidenced improvements while
preserving fixed-seed height/sample/tile parity, climate agreement, seams,
morphing, water refresh and existing memory/frame budgets.

Use fixed dry, frozen, coastal and massif samples; build tiles at L0, L8,
carving-transition, L14 and L20/22; and run stationary, turning, low-flight,
contact and water-seek renderer scenarios. Separate sampler construction from
warm throughput, tile CPU time from transfer bytes, and Node CPU evidence from
browser/GPU evidence. The existing leaf-loop cache and climate allocation
improvements are already implemented and must not be recounted as new Kit
wins. Profile tile staging arrays/temporary lattice objects and duplicated
climate/biome work before trying typed-array construction, invariant hoisting,
or bounded tile-local reuse. Keep renderer worker scheduling, caches and
residency in Atlas.

The active reusable core is in `terrain.ts`, `planet-tiles.ts` (pure geometry
builder only), `surface-climate.ts`, `surface-biomes.ts`, geophysics, landform,
mountain and LOD modules. Expose versioned `/terrain`, `/climate`, `/biomes`,
`/geophysics`, `/landforms` and pure `/tiles` APIs using Kit-owned input DTOs.
Resolve `catalog.ts` and stellar-evolution inputs in Atlas; keep world-time,
river-region activation, workers, renderer/materials, navigation/contact,
residency, budgets and water/scene integration there. A future Surface Kit Lab
must call those exported APIs directly: the existing Biome and Surface Flora
Labs do not provide a terrain/climate workbench. Profile `planet-tiles.ts`
staging allocations and mountain-carving cache retention before optimizing.
The documented 500–800 µs crater query and 180–235 ms contact-tile cost are a
historical crater-enabled path; current `terrainSampler` defaults to excluding
craters, so these numbers are not a current performance win or baseline.

## 3. Biosphere Kit

Extract dated species and lineage history, trait/growth evaluation, habitat
suitability and ecological assemblages. Inputs are resolved lifecycle,
climate and habitat samples; canonical animal genomes come from Creature Kit.
Outputs are deterministic species and habitat data for Flora, Tree and Creature
consumers. Atlas retains planet lifecycle and clock adapters, population
placement/streaming, navigation and scene rendering. Do not create a second
animal generator or turn the legacy reference Biome Lab into a runtime kit.

Start by measuring the live `biosphere-model.ts` generation and dated query,
then the Atlas `biosphereStateAt` and life-gate handoff separately. Cover cold
history creation, warm hits, same-date frames, adjacent dates, forward/reverse/
random seeks and representative sterile, mature and extinct states. Candidate
work includes memoizing the dated projection by history identity and integer
Myr, and reusing canonical species/archetype views at the Atlas fauna handoff;
measure retained memory and mutable-result compatibility before adopting either.
The compiled niche evaluator and ecological assemblage modules currently have
no production caller, so treat them as optional API scope until a real consumer
and end-to-end benefit are demonstrated. Keep Atlas-only population placement
and per-anchor herd selection outside the Kit unless the versioned boundary
explicitly moves them.

The Kit owns deterministic biosphere generation, dated projections, species
and lineage DTOs, trait/growth evaluation, and currently used membership APIs.
Atlas keeps `biosphereStateAt`/history caching, lifecycle and environment
resolution, clock conversion, species filtering, LifeGate mapping, and Flora,
Tree and Creature consumer adapters. Resolve `YEAR_NS` through a documented
Kit-owned unit contract or an Atlas projection; never import `world-time.ts`.
Preserve `generateCreatureGenome` as the canonical Creature Kit source through
a declared Kit dependency or an explicit genome-request/Atlas adapter, without
creating a second animal generator. Tree consumers should receive a stable DTO
of the fields they use instead of importing Atlas `Species`. The Biosphere Lab
should consume the extracted API directly; keep its Three.js geometry adapter
in Atlas. Do not move all of `habitat-suitability.ts`: its compiled niche
evaluator is unwired, while its tree-climate weighting helpers have a live
forest consumer.

Measure dated-query throughput, repeated habitat/species evaluation, cache hit
rates, allocation/heap growth and memory across seek-heavy and multi-planet
scenarios. Implement improvements only against measured costs; preserve
species, lineage, genome and dated-output parity, extinction/existence gates,
and visit-order/date-seek independence.

## Per-kit release gate

Each Kit must have an independently buildable public repository, a versioned
API, complete extraction provenance, focused tests and a useful Lab or review
surface. For each Kit, perform a performance audit against fixed representative
scenarios, implement and benchmark the justified optimizations, and document
before/after results. If measurements show no safe optimization, document the
evidence and remaining bottleneck rather than making a speculative change.
Integrate Atlas through an exact Git submodule pin with no editable duplicate;
test a clean recursive clone, Kit build/tests, Atlas build/tests and runtime
parity. Publish the Kit commit before advancing and publishing Atlas. Finish
all gates for one Kit before beginning the next.

Water, atmosphere and civilization extraction are deferred unless later work
shows a clear reusable runtime boundary.
