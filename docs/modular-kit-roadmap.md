# Runtime kit roadmap

This roadmap tracks the next Universe Atlas extractions after Creature Kit and
Flora Kit. Complete each kit, its performance work, Atlas integration and
release validation before starting the next one.

## Performance completion gate for every kit

Each kit must receive a source-level performance audit before its phase closes.
Record repeatable baselines for representative workloads, identify the actual
cost centers, and implement the safe improvements supported by those
measurements. For every implemented change, report paired before/after results,
the hardware/runtime and workload, and correctness or visual parity checks.
Where a candidate does not show a repeatable benefit or risks behavior,
quality, or memory regressions, record the result and reason for deferring it;
do not claim it as an optimization. Performance work must cover the Kit and
its Atlas integration boundary, while keeping Atlas-only scheduling,
residency, and scene costs separately attributed. Do not advance to the next
kit until this review, implementation, and its gates are complete.

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

The full recursive-kit, production-build and Atlas test workflow passed again
after the Tree Kit pin and performance-report updates: run `38502759693` at
Atlas commit `cfae98d3e91dff125ea7f55634824680e01b0d15` passed all 2,015 tests
(1,995 pass, 16 skipped, four explicit TODOs, zero failures). This confirms the
exact Tree Kit `f7788026f0ab4663483d090b2857d1e6f29c62cd` submodule pin and the
Atlas test runner on Linux; the separate full Windows run remains the evidence
for the Windows command-length fix.

## 1. Tree Kit

Extract the actual Atlas runtime tree presentation: tree asset families,
resolved species recipe inputs, allometry and structural variants, instanced
rendering, bark and wind/leaf materials, LOD coverage and mip handling, and
captured far impostors. Include a focused Tree Lab that exercises the same Kit
implementation used by Atlas. Keep `PlanetForest` population identity,
habitat/terrain/water eligibility, residency, world-time conversion and
planetary canopy integration in Atlas. Pass resolved traits, instance rows,
lighting and wind inputs across a versioned API.

Tree Kit is now a public code-only repository at
[`kblood/tree-kit`](https://github.com/kblood/tree-kit), pinned by Atlas as the
`external/tree-kit` Git submodule. The current pin is `4a05bacd960bbb6dc9e5f77201c8294e486cdd86`
(package version `0.1.2`). Its versioned v1 API owns recipes, allometry,
structural variants, family assets and instances, bark/resource sharing,
foliage, wind and coverage shaders, LOD/captured far impostors, and the Tree
Kit Lab. Atlas now imports the submodule API, routes the Lab to the Kit-owned
page, and retains only its world/catalogue/atmosphere adapters and Atlas-authored
runtime assets. The 40 duplicate TypeScript implementation files have been
removed from Atlas. Atlas GLBs and mip payloads remain Atlas-owned because the
rights for Atlas-authored material and foliage content are unresolved; they
were not copied into the public Kit. `scripts/check-tree-kit.mjs` verifies the
exact clean pin, API paths, Lab and provenance.

The extraction preserves the boundary prepared earlier: `tree-species-recipe.ts`
consumes Kit-owned `TreeSpeciesInput`; `tree-asset.ts` resolves its fixed BigInt
wind period without Atlas `world-time.ts`; local aerial perspective is injected
as a callback. Atlas supplies the dated eligible species and retains
`PlanetForest` identity, habitat/terrain/water eligibility, residency, time,
and planetary canopy integration. Kit tests verify deterministic DTO behavior
and that its public entrypoints have no transitive dependency on Atlas adapters.

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

Tree Kit's standalone suite passes 86 tests and both its TypeScript and Lab
builds pass. After removing the Atlas source copies, 177 focused Atlas tests
passed (174 pass, 3 skipped), including the Lab/API, tree-family, allometry,
captured-atlas, resource, foliage and Windows test-runner contracts. The Atlas
production build also passes and emits the Kit Lab at
`external/tree-kit/tree-asset-lab.html`; the legacy root URL redirects there.
The broad `test:affected` run also reaches unrelated active terrain-colour
findings recorded elsewhere in this roadmap, so the full Atlas regression gate
is still open.

The opt-in integrated fixture now lives in
`tests/tree-runtime-benchmark.browser.mjs`, using the fixed grounded pose in
`tests/fixtures/tree-runtime-benchmark-pose.json`. It checks that near, middle
and far populations are present, records tier-isolated draw/triangle deltas,
marginal scene GPU time, Atlas scheduled upload ranges, family load/far-atlas
bake time and load/steady/dispose memory. It explicitly labels whole-scene GPU
interactions, scheduled (not driver-observed) upload bytes, global
`renderer.info` counts and sampled peak-memory limits. It now restores and
checks the fixture position, heading and date, pauses exploration before the
first frame, selects the active scene GPU pass, and stops sample collection
while outstanding timer queries drain. `acceptanceEligible` means a valid,
uncontended capture only; one capture does not establish an optimization or
replace the paired release protocol. The profiler change passes its focused
unit tests and the Atlas production build, but the integrated browser/GPU
capture remains unverified. Run it only on a quiet host and retain its report
and screenshots before selecting a runtime optimization.

The harness separates `ok` (the capture completed without app errors) from
`acceptanceEligible` (the evidence passed every measurement gate). Accept only
the latter. It records Atlas/runtime/device/WebGL identity and a mixed-tier
screenshot, warms each visibility condition before sampling, requires hardware
timer-query samples and zero stationary instance writes, and rejects captures
with baseline CPU above 25%, baseline GPU above 10%, more than 20% foreign CPU
use, or known foreign Blender/browser processes. GPU-utilization and Windows
process telemetry must be available; unknown host load is not a clean result.

The Kit Lab now exercises mixed LOD0/LOD1 populations and captures/displays far
family atlases through the same production library. The 2026-10-14 isolated
RTX 5090 capture confirms existing LOD1 assets reduce triangles by 64.8%/73.6%
and GPU p50 by 59.2%/59.8% for branching/spire families at 192 instances. This
is evidence for the existing LOD optimization, not a new before/after Kit win.
The earlier bark texture pool recovers 19,573,416 estimated retained bytes,
but it also predates the Kit and must not be recounted as new work. The next
Tree Kit performance gate is a quiet-host mixed-distance Atlas capture with
per-tier draw/triangle attribution and GPU timing, followed by measured load,
upload, and memory analysis. Implement and document an additional optimization
only when that evidence identifies a safe bottleneck; keep Tree Kit active until
the audit and runtime check are complete.

`tests/tree-asset.browser.mjs` already profiles isolated LOD0/LOD1 for each
family, but its fixed population does not mix distance bands, its counters
include scene/grid/shadow work, and its memory figures are Three object counts
rather than GPU bytes. The integrated fixture classifies contributions by
hiding each Atlas forest tier in the same fixed view, while its marginal GPU
result remains scene-level. Borrow the draw-classification pattern from
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

An attempted whole-Atlas hide-one-system capture on 2026-10-14 timed out before
the walker reached its fixed pose. The harness marked the host contended: an
active Blender process, Opera, 46% host CPU load and other GPU/CPU work were
present. Its report is explicitly non-acceptance evidence; no mixed-tier GPU
delta is inferred from it. Repeat the fixed-pose near/middle/far attribution
when the host is quiet, without interrupting the existing Blender or browser.

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

The first source audit narrows the tile candidate: `planet-tiles.ts` uses
growable JavaScript arrays before producing typed buffers, but positions and
parents are reread for morph bounds and skirts. Early Float32 writes would
change numeric results; retain double-precision intermediates and compare the
final buffers byte-for-byte. Also profile per-point/vector/skirt allocations,
terrain-versus-biome climate calls (their sampled heights can differ), and
mountain-cache retention before changing them. The carving block and point
memos are bounded, but `mountain-layout.ts` also has a separate module-global
`orogenLayout` Map and per-layout `coarseFields` Maps with no eviction. Measure
layout count, backing-buffer bytes, post-GC heap/external memory, and revisit
latency on a fixed world itinerary before proposing a bound; eviction must not
change values or invalidate live samplers.

The active biome classifier computes legacy moisture noise at
`surface-biomes.ts` and then calls `surfaceClimate`, which computes the same
noise for precipitation and returns it as `legacyMoisture`. Reuse that sampled
value only after exact classifier-output and material-byte parity checks across
dry, frozen, wet, and shared-seed body fixtures, and benchmark both classifier
throughput and complete tile builds. This is a concrete candidate, not yet a
measured win. `climate-grid.ts` currently has no production callers, so its
optimization cannot count as a live runtime improvement.

For tile staging, profile the growable output arrays and temporary lattice,
skirt, and ocean objects before replacing them. Position and parent values
must remain double precision until skirt/morph data has been computed. Require
byte-identical final buffers, unchanged anchors/metadata/material bytes, and
repeatable allocation or CPU improvement without increased retained memory.

For dense terrain consumers, measure allocation from the sample/color/flow
objects used by tile textures and orbit baking before considering an explicit
caller-owned output API. Preserve the existing public API's independent-result
semantics; the tile lattice retains samples, so it cannot safely reuse one
shared scratch result. Profile cold carving solves separately from the already
bounded exact-key block/point cache and count builds, hits, evictions, transient
typed-array bytes, and end-to-end tile p95 before considering workspace reuse.

The pinned Surface performance workloads use the fixed climate fixtures and
4,096 directions for parity, with 200,000 precomputed warm queries for
throughput. Build all six L0 faces and fixed coast/snow/treeline/massif tile
sets at L8, carving transition, L14, L20, and L22, plus seams, corners,
parent/child pairs, water datum variants, rock/riser transitions, and the fixed
1,061-frame stationary/turn/flight/descent/water-seek digest trace. Separate
construction/first-touch from warm CPU time, allocations, worker queue/build/
transfer/install latency, and browser frame/memory results. Alternate paired
baseline/candidate runs and keep all raw rounds. Do not count climate scratch,
PDD inlining, lattice/texel-direction reuse, direct RGBA writes, smaller near
textures, coarse/baked mountains, point memo, or leaf-loop caches again; those
are already implemented. Do not reuse terrain climate samples for biome
classification without proving sampled-height equivalence around craters and
rivers.

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

The first source audit identifies the advancing-frame handoff as the primary
candidate: the exact-timestamp Atlas cache misses as `Ns` advances, then
rebuilds same-integer-Myr consumer views that can be discarded by the later
LifeGate comparison. Measure this case before memoizing. `biosphereAt` results
are mutable, so a shared dated-result cache needs mutation-safety tests.
`biosphereHistoryCache` holds 64 worlds but does not refresh hit order; measure
multi-world retention and eviction before changing its FIFO behavior. Keep
generation, date-boundary semantics, Creature Kit genomes, and Atlas lifecycle
and environment gates unchanged unless a paired benchmark justifies a safe
optimization.

The current runtime already memoizes planet snapshots by exact body/seed/date
and hydrology references (`main.ts`), caches one exact LifeGate timestamp, and
reuses LifeGate sources for same-Myr frames. Do not count these as new wins.
The advancing-frame candidate is narrower: before same-Myr source reuse is
checked, the miss path still derives Flora kinds, Tree species and Fauna views.
Measure repeated sub-Myr timestamps and memoize derived views by stable species
array identity only if allocation and frame p95 improve while environment and
lifecycle gates remain time-sensitive. `biosphereAt` also rescans and filters
species and rebuilds its digest; date memoization is conditional on proving
mutation isolation and bounded retained memory. The 64-world history cache is
FIFO, not LRU; test 1/64/128-world round-robin access before changing eviction.

The reproducible Biosphere workload separates Kit cold generation and dated
queries from Atlas history/cache queries and the browser LifeGate handoff. Use
fixed sterile, mature, extinct, suitable and unsuitable bodies; exact-date
hits; raw timestamps advancing within one integer Myr; adjacent-Myr boundaries;
life/star/environment threshold crossings; reverse/random seeks; and multiple
worlds. Pin seed, body IDs, runtime and commits, warm cases, then alternate at
least five paired baseline/candidate runs. Record CPU p50/p95/max, allocations,
GC and retained heap separately from end-to-end frame cost, and separate
desktop from Quest. Require exact DTO field/order, species/lineage/genome,
digest, dated flags and uncached-result parity; test boundaries at ±1 Myr,
random visit order, seek direction, and caller mutation safety for shared
results. Preserve bounded memory over long multi-world seeks. Habitat-membership
and compiled-niche helpers have no Atlas runtime caller, so their optimization
cannot count as a live-path improvement until that changes.

## Per-kit release gate

Each Kit must have an independently buildable public repository, a versioned
API, complete extraction provenance, focused tests and a useful Lab or review
surface. For each Kit, perform a performance audit against fixed representative
scenarios, implement and benchmark the justified optimizations, and document
before/after results. If measurements show no safe optimization, document the
evidence and remaining bottleneck rather than making a speculative change.
Use a repeatable comparison protocol: record the Kit and Atlas commits, build,
device, browser/runtime, graphics settings, seed and scenario inputs; warm up
before sampling; and run at least five paired baseline/candidate trials under
the same conditions. Report CPU p50/p95/max and budget exceedances, valid GPU
timer-query samples where available, draw/triangle/upload attribution, and
load/steady/dispose memory separately. Discard disjoint or otherwise invalid
GPU samples, report run-to-run spread, and set regression limits from the
baseline variability and target budget before judging a candidate. Label
desktop and Quest evidence separately; do not generalize one device's result
to the other.
Integrate Atlas through an exact Git submodule pin with no editable duplicate;
test a clean recursive clone, Kit build/tests, Atlas build/tests and runtime
parity. Publish the Kit commit before advancing and publishing Atlas. Finish
all gates for one Kit before beginning the next.

Water, atmosphere and civilization extraction are deferred unless later work
shows a clear reusable runtime boundary.
