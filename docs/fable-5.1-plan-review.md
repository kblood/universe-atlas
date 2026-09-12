<!-- Independent model output, preserved verbatim below.
Caller verification: Claude Code 2.1.268 result subtype=success; modelUsage contains
claude-fable-5-1, canonicalModel=claude-fable-5-1, provider=firstParty.
The CLI also recorded a small auxiliary Haiku call; this was not a substitute
review. Complete raw output and hashed input manifest are retained locally under
test-results/fable-plan-review/. No reviewer tools were enabled.
See fable-review-assessment.md for checked corrections to this review.
-->
I'll deliver the review as a single Markdown document, drawing only on the supplied files.

# Independent architecture review: walkable worlds and traversable history

Review date: 2026-09-13. Responding model, self-reported: Fable 5.1 (`claude-fable-5-1`). The caller's CLI metadata is authoritative for model identity.

Inputs reviewed in full: the review brief, the 2026-09-13 roadmap, the exploration corrections, the 2026-09-12 research document, the Universe Atlas v1 spec, and the source files `terrain.ts`, `planet-tiles.ts`, `planet-renderer.ts` and `travel.ts`. Not supplied and therefore not inspected: `catalog.ts` (the `Body` type, `bodyPosition`, `noise`, `hash64`, the units of `epoch`), `planet-worker.ts`, `planet-atmosphere.ts`, the save format, the test suites, and any hardware measurements. Nothing was run, browsed, or modified. Where I cite an external source it is from memory and marked as not newly verified.

## Verdict and the five most consequential findings

The roadmap has the right shape and the right refusals: one date at every scale, records separate from meshes, no whole-universe reseeding, cohorts instead of agents. It should not be implemented in its current milestone order, and three of its contracts are underspecified in ways that would force rewrites. The proposal treats the present-day catalogue as a constraint to satisfy; it must instead be the fixed point that history is constructed around. It names the cosmic-date precision problem but leaves the orbital phase convention undefined, while `travel.ts` already consumes a numeric epoch. It allows coarse civilization state to be generated lazily, which cannot be causal. On the walking side, the budgets in the current renderer cannot reach the stated ground spacing on an Earth-sized body, and terrain 1.1 bakes sea level into rock height, so no time-varying water is possible without a representation change that the proposal defers to milestone 3.

1. **Anchor every history at the reference date.** Forward simulation from formation cannot reproduce the reference-date catalogue or terrain 1.1. A Sun-like star simulated from its formation date may be a red giant at the catalogue epoch, contradicting its catalogue type. Construct each entity's past and future outward from its reference-date record, the way the Kepler elements already are.

2. **Define the cosmic date and the orbital phase convention before anything else.** A float64 epoch in seconds stops advancing at cosmic dates: at 13.8 Gyr the ulp is 64 s, so adding a frame interval is a no-op. Use a signed BigInt quantum and exact modular period arithmetic for mean anomaly. This is a small change, but everything with a date depends on it.

3. **The coarse civilization layer must be eager, global and canonical.** The roadmap says "generated lazily" and "bounded coarse nodes per macro region" in the same breath. Lazy coarse generation gives visit-order-dependent colonies. Run the coarse layer once, over a fixed node count and fixed step count, digest it, and refine locally under it as a constraint.

4. **Current LOD limits cannot support walking on an Earth-sized body.** Depth 16 gives about 6 m cell spacing at a face centre. The 0.5–2 m target needs level 18–19. A restricted quadtree to level 19 needs roughly 230 leaves and over 300 resident tiles, against limits of 150 and 256. The morph from parent geometry also disagrees with analytic collision for 0.22 s under the feet.

5. **Separate rock height from water level before the surface query contract is frozen.** In terrain 1.1 the water parameter sets the sea threshold and land elevation is measured from it, so raising sea level would lift every mountain. Geology 2 will also replace the analytic sampler with cached regional rasters, which changes the basis of the "same sampler for collision and visuals" guarantee. Milestone 1's `surfaceAt` contract would be written against a representation that milestone 3 replaces.

## What the supplied code establishes

These are facts inferred from the supplied source, not from running it.

- **Terrain is a pure function of body seed, water, radius and type.** `terrainSampler` in `terrain.ts` hashes `body.seed + "/macro-v1"` and reads `body.water`, `body.radiusM`, `body.type`. There is no date, star, age or climate input. Stellar forcing cannot reach the surface today.
- **Sea level is baked into rock.** `sea = 0.37 + body.water * 0.22` and land elevation on water worlds is `(coast - sea) * 47000 + ...`. Water level and rock height are one quantity. The visible mesh then clamps negative elevation to zero in `visibleElevation`, so the seabed exists in the sampler but is never rendered or collided.
- **Finest detail is a 260 m wavelength with 22 m amplitude.** The three metre-scaled bands use frequencies `radiusM / 6500`, `radiusM / 1400`, `radiusM / 260`. Nothing exists below that. The direction-space bands at frequencies 30 to 155 correspond to tens of kilometres on an Earth-sized body.
- **Normals are sampled with a 64 m half-step at Earth radius.** `surfaceNormal` uses `eps = 0.00001` in direction space. Multiplied by 6.37e6 m that is about 64 m either side. Ground normals at walking scale will be flat.
- **Depth, leaf and cache limits.** `planet-renderer.ts` refines only while `level < 16`, stops splitting when leaves would exceed 150 desktop or 102 XR, and caps resident plus pending at 256. Splits are atomic: a parent is replaced only when all four children are resident. There is no neighbour-level constraint and no cross-face neighbour query in the supplied tile code.
- **Children morph from parent triangles for 0.22 s.** `buildTile` stores `parentPosition` interpolated from the parent's actual triangles, and `update` ramps `morph` from 0 to 1 at `dt / .22`. Collision in `travel.ts` reads the analytic sampler, so rendered ground and collided ground disagree by the unrepresented band amplitude during that ramp.
- **Failures are permanent and a worker error fails everything pending.** `failures` is never cleared and `worker.onerror` moves all pending keys into it. A failed root leaves `rootsReady` false for the session.
- **Tile textures have no mipmaps.** `DataTexture` with `generateMipmaps = false` and `LinearFilter`. Distant tiles at grazing angles will alias and shimmer from a ground viewpoint.
- **Skirts are 36 km deep at every level on an Earth-sized body.** `skirt = min(.08, ... + 36000 * relief / radiusM)`. That is harmless visually because it points inward, but it means a level-jump seam of hundreds of metres reads as a cliff, not a crack.
- **Time enters only through `bodyPosition(body, sys, epoch)`.** `nearestBody` takes a numeric `epoch`. Its units and the phase formula are in the unsupplied `catalog.ts`.
- **Collision cost per query is small.** One sample is about eleven noise evaluations; a normal is six samples. A kinematic capsule querying the analytic sampler a few hundred times per step is affordable on the CPU. This stops being true once geology 2 makes rasters the authority.

## Assessment by question

**1. Random access to a universal date.** The model supports random access only where each layer is closed-form in the date or where its forward simulation is small enough to run once and cache. The proposal conceals unbounded work in four places. First, watershed carving and erosion are path-dependent; if a region's rivers at date T depend on erosion accumulated since formation, every seek re-runs history. Correction: define the drainage graph as a function of structure and climate at the current key state only, and define erosion intensity as a closed-form function of time since the last structural event. Second, per-tree births and deaths as events: a forest of a million trees across ten thousand years is not an event log. Correction: a tree's existence interval is hashed from its cell ID and the cell's coverage curve, so existence at T costs one hash. Third, the coarse civilization layer is a forward simulation. That is acceptable, but say so: with a fixed node count on the order of thousands and a fixed step count on the order of ten thousand, it is tens of millions of updates, done once per seed, scenario and version, then cached and digested. Fourth, cache invalidation keyed on "relevant historical state signature" becomes unbounded if playback changes the signature every tick. Correction: signatures are the index of the piecewise-constant key state at T; continuously varying quantities such as sun angle and a sea-level ramp are uniforms, never cache keys.

**2. Causality with lazy regions.** Lazy generation of coarse interacting state is not causal. Counterexample: civilization A's region is generated first and founds a colony at star S in year 1000; civilization B's region is generated later and its analytic front reached S in year 900. A's colony must now be rescinded, so the result depends on visit order. Adopt these rules or a simpler model.

- **Ownership.** Every record has one owner node in the hierarchy: universe, galaxy, macro region, sector, system, body, surface region. Record ID is owner ID plus layer name plus slot ordinal.
- **Dependency.** A record at node N may read N's own parameters and earlier records, ancestor records, and boundary summaries the parent published for N. It may never read a sibling or cousin directly.
- **Exchange.** Siblings interact only inside their parent, in one pass over all children in canonical child order and quantised date order. The pass is a pure function of seed, versions, scenario and ancestor records, and its outputs are immutable summaries.
- **Eager coarse layers.** Any layer whose interactions span the domain runs eagerly at the coarsest node containing all participants, with fixed node and step counts. Civilization spread, galaxy mergers and expansion are such layers.
- **Conditioning.** Fine generators take coarse outputs as constraints and choose only among options that satisfy them. A settlement placed in year 1000 selects a host star whose lifetime record covers year 1000. If no option satisfies the constraint, use a deterministic recorded fallback, never a re-roll of the coarse layer.
- **Ordering.** Events sort by (date quantum, owner ID, layer, slot). Simultaneous events resolve in that order.
- **Star lifetimes.** Per-star lifetimes derive only from the catalogue record. The coarse civilization pass consumes analytic regional death rates, never an enumeration of stars.

The simpler achievable model for the first civilization milestone: at most eight civilizations, each with an analytic expansion front, radius as a scenario function of time with pauses, and one conflict rule, earliest arrival wins with ties broken by civilization ID. This needs no coarse simulation and is trivially random-access. Add the eager coarse graph only when trade, succession and war are actually wanted.

**3. Identity, time, versioning, checkpoints, migration.** Existing catalogue objects are the subset alive at the reference date. Objects that died before it or form after it need new stable ordinals in a separate namespace of the same cell scheme, never renumbering. Give every object an existence interval and a lineage record with predecessor IDs; a merged galaxy is a new lineage node whose predecessors keep their IDs and intervals. For the date: a signed BigInt count of a fixed quantum relative to the catalogue epoch, serialized as a decimal string, so today's `t = 0` saves map trivially. A nanosecond quantum keeps 13.8 Gyr in about 60 bits and BigInt has no ceiling anyway. Mean anomaly is then defined by convention as `M0 + 2π · ((Δt mod P) / P)` with Δt and P in quantum units, computed exactly. For frame-rate evaluation, keep a float64 offset from a view anchor and re-anchor when the offset exceeds about 10^12 s, since below that the ulp is under a millisecond. Phase accuracy after billions of orbits is physically meaningless; the convention is what determinism requires. Checkpoints are caches of pure functions and must be reproducible from scratch in tests, otherwise a corrupted checkpoint silently becomes canon. For migration: a bookmark stores versions; opening it under newer geology offers baseline or migration, and migration reports the coastline and elevation delta at the bookmarked point rather than claiming identity.

**4. Stellar, planetary, galactic and cosmic modelling.** The proposal correctly demands tracks rather than a lifetime formula. Missing dependencies on system outcomes, all standard physics and not newly verified: adiabatic mass loss expands orbits as `a · M = constant`; instantaneous loss of more than half the system mass unbinds planets, which matters for supernovae; main-sequence luminosity rises over time, shifting the habitable window and hence the life interval; giant-phase radius engulfs inner planets; neutron-star kicks unbind systems; planetary cooling and magnetic-field decay drive atmosphere loss; tidal evolution changes moon orbits and spin. Remnant thresholds by initial mass depend on metallicity and model, so store them as versioned tables with provenance rather than constants. Supermassive black holes need a galaxy-level growth history that the current 32-galaxy static layout does not have; treat it as a galaxy lineage attribute. For expansion, apply a scale factor only to separations between bound groups and hold groups, systems and planets rigid, with `a(t_ref) = 1` so reference-date positions are preserved. Life needs a model the proposal lacks: a per-body biosphere stage enum with dates derived from the habitable window and a scenario probability, and a vegetation coverage curve driven by stage. Label every layer with a provenance class: table-backed physics, heuristic, or scenario fiction. The current catalogue, as far as the supplied code shows, has no metallicity or system-age input to planet occurrence; if `catalog.ts` lacks it, galaxy evolution cannot influence planets.

**5. Cube-sphere walking, seams, hydrology, materials, vegetation, oceans.** The numbers at an Earth-sized body, face centre, are the decisive evidence.

| Level | Tile arc | Cell spacing |
|---|---:|---:|
| 10 | 12.4 km | 389 m |
| 16 | 194 m | 6.1 m |
| 18 | 48.6 m | 1.52 m |
| 19 | 24.3 m | 0.76 m |

Near face edges arcs halve, so face centres are the worst case. A restricted quadtree with one leaf at level 19 and neighbour difference at most one needs about twelve leaves per level, roughly 230, and about four ancestors per level resident for fallback. Both the 150 leaf and 256 cache limits must rise, or the contact region needs a ring-based near-ground structure. Enforce the level-one rule only within a contact ring, not planet-wide. Set morph to 1 immediately for tiles within the contact radius and make the capsule query the same field the mesh was built from. Replace the 64 m normal baseline with a step derived from the tile's cell spacing. Enable mipmaps on tile textures. For hydrology, the basin-ownership scheme is sound; it needs a cube-sphere neighbour function that does not exist in the supplied tile code, a planet-wide coarse flow graph on the order of six faces by 64 by 64 cells, and a depression-handling algorithm with deterministic tie-breaking; priority-flood is the standard reference. Once regional rasters exist they become the single authority for mesh, collider, water and vegetation; the analytic sampler survives only as the outer-level fallback. Vegetation candidates per surface cell with hashed IDs are right; correct density for cube-face area distortion using the Jacobian of the face mapping. For oceans, per-lake water elevation and a separate water surface are prerequisites for beaches and inland water, and terrain 1.1 cannot express them.

**6. Budgets and streaming.** Measured evidence in the corrections document: 218 to 253 resident tiles, level 10 at 600 m altitude, about 33 MiB worst-case raw tile buffers, negligible orbit drift, no worker errors on the route. Not measured anywhere: hardware frame rate, GPU time, browser memory, XR. The 256 MiB target is a proposal. It is too small for geology 2 with history. A 2 km region at 1 m resolution with height, water and four material weights is about 48 MiB; A→B→A needs at least two states resident, and a forest-to-mountain route spans several regions. Either raise the budget, drop regional resolution to 2–4 m with a 1 m detail band, or compress. Add a byte ledger before adding resources; the renderer has no byte accounting today. Likely limits: CPU is the regional refinement pass, not tile meshing, so it must be cached and never synchronous; GPU is foliage overdraw and shadows, so impostors beyond a few hundred metres are mandatory; storage is stacked historical states, so persist only key-state deltas.

**7. Milestone order.** Milestone 1 as written bundles a small contract with a large feature. The contract, meaning the date type, existence intervals, lineage IDs, version signatures and reference-date anchoring, is a week of data-model work and should precede everything. The feature, a system from formation to remnant with era views, should follow walking and structured terrain, because its `surfaceAt` contract would otherwise be written against terrain 1.1 and rewritten for geology 2. Bundling milestones 2 to 4 into one release defers the highest-risk gate, walking, behind the largest content effort.

## Findings table

| # | Severity | Section | Failure example | Recommended change | Acceptance test |
|---|---|---|---|---|---|
| 1 | Critical | Time architecture; cosmic representations | Forward-simulating a G-type catalogue star from formation yields a giant at the reference date, contradicting the catalogue | Construct histories outward from the reference-date record for every entity | Every catalogue object's history evaluated at `t = 0` equals its catalogue record bit-for-bit; catalogue digest unchanged |
| 2 | Critical | Precise time representation | `epoch += dt` with float64 seconds at 13.8 Gyr does nothing; ulp is 64 s | Signed BigInt quantum, exact modular mean anomaly, float64 view offset re-anchored under 10^12 s | Seek to 13.8 Gyr, play at 60 Hz for 10 s, orbit phase advances monotonically; forward and reverse evaluation agree exactly |
| 3 | Critical | Civilizations across galaxies; cross-region history | Colony founded at S by A in year 1000, later-generated B reached S in year 900 | Eager global coarse pass with fixed nodes and steps; fine layer conditioned on it; or analytic fronts only | Generate regions in shuffled order and reversed order; coarse digest and all settlement records identical |
| 4 | High | Walking and geometric continuity | Depth 16 gives 6 m cells at Earth face centre; level-one rule needs about 230 leaves | Raise depth to 19 to 20, leaf and cache limits accordingly, or add a near-ground ring | On an Earth-radius fixture, sampled cell spacing under the capsule is 2 m or better at face centre with no leaf-limit stall |
| 5 | High | Walking; contact agreement | Capsule stands on the analytic surface while the tile under it morphs from parent triangles for 0.22 s | Morph disabled inside the contact radius; collider and mesh read the same field | Measured render/collider height difference under the capsule under 5 cm across the acceptance route, including during tile arrival |
| 6 | High | Oceans now; foundational contract | Raising `sea` in terrain 1.1 raises all land elevations by `47000 · Δsea` | Separate rock height, water level and water surface before freezing `surfaceAt` | Change the water-level field only; rock heights in the digest are unchanged |
| 7 | High | Performance contract | Two 1 m regional states of 2 km each exceed 96 MiB before tiles, trees or colliders | Byte ledger first; then raise budget or reduce regional resolution | Ledger reports every resident buffer; soak A→B→A on the route stays under the declared cap |
| 8 | Medium | Performance; streaming | Worker error marks all pending as permanent failures; a failed root hides the planet's patches for the session | Retry with backoff; scope failures to the job, not the worker | Inject one worker crash mid-descent; coverage recovers within a bounded time |
| 9 | Medium | Time architecture; caching | Playback ticks change a "history signature" and rebuild mountains | Key caches on key-state index; continuous values are uniforms | Sun angle sweep and sea-level ramp produce zero tile rebuilds |
| 10 | Medium | Stellar and planetary lifecycles | Star loses half its mass; planets keep old orbits | Apply `a · M = const` for slow loss, unbinding for fast loss above half; regenerate elements at the discontinuity | Sun-like and massive fixtures: post-transition orbits differ from pre-transition by the modelled rule, checked numerically |
| 11 | Medium | Structured terrain; hydrology | Independent tiles carve rivers uphill across a face boundary | Planet-wide coarse flow graph with cube-sphere neighbours and priority-flood depression handling | Every river cell's elevation is non-increasing downstream across all 12 face edges; closed basins have exactly one recorded spill |
| 12 | Medium | Forests; walking | No mipmaps on tile textures; grazing-angle shimmer from ground | Enable mipmaps and anisotropy on tile colour and detail maps | Ground-level screenshot pair with 1 px camera shift shows no high-frequency flicker in distant tiles |
| 13 | Medium | Identity and lineage | A star that dies before the reference date has no ID scheme | Separate ordinal namespace with existence intervals; reference objects never renumbered | Adding pre-reference objects leaves the catalogue digest unchanged |
| 14 | Low | Walking and geometric continuity | 64 m normal baseline produces flat ground normals | Normal step derived from cell spacing | Normal at a 2 m bump differs from the flat normal by the analytic slope |
| 15 | Low | Ordered milestones | Milestone 1 writes `surfaceAt` against terrain 1.1 | Split contract from feature; move era views after geology 2 | `surfaceAt` signature unchanged when geology 2 lands |

## Revised milestone order and smallest next release

1. **Time and identity contract v0, plus walkable ground.** One release. Details below.
2. **Structured terrain and water.** Geology 2 as raster authority, drainage graph, per-lake water elevation, beaches. Sea-level history curve as the first key-state history.
3. **Stellar lifecycle records and system consequences.** Tables with provenance, two fixtures, orbit updates, remnant lineage. Era navigation UI with logarithmic time. System view only, no surface changes yet.
4. **Detailed living surface.** Biosphere stage curve, forests with hashed existence intervals, impostors, byte ledger enforced.
5. **Local history demonstration.** Glacier, forest and settlement as key-state deltas. This is where the caching signature rules are proven.
6. **Wider planetary and cosmic history.** Formation stages, comoving frames for group separations, early and late era representations.
7. **Civilizations.** Analytic fronts first; eager coarse graph second.

The smallest next release that validates both walking and the necessary universal-history contracts:

- Signed BigInt date with decimal serialization, shared HUD date at every scale, orbital phase by exact modular convention, view offset re-anchoring. Existing `t = 0` saves load unchanged.
- Existence interval and lineage fields on every record, defaulting to open intervals for all catalogue objects. `branchId` reserved in saves and set to zero.
- Per-star lifetime record derived from the catalogue entry with two tested fixtures, Sun-like and massive, as data only. Digest test.
- Rapier kinematic capsule with radial gravity, slope and step limits, swept movement, on Maithea and one airless moon. Depth raised to 19, leaf and cache limits raised with a byte ledger, level-one rule inside the contact ring, morph disabled in the contact ring, normals from cell spacing, mipmaps on.
- Water rendered at a separate radius from rock, driven by a per-body sea-level key-state curve that moves the water surface only. Seeking a large date on foot enters observation hover, prepares the state, then lands if ground exists. Rock heights unchanged; terrain stays `terrain-1.1.0`.
- Tests: cold and warm cache, shuffled requests, one versus two workers, reversed visits, A→B→A, all against one fixture digest. Measured contact mismatch under 5 cm. Cold-cache save and restore on foot.

This release proves the date type, the key-state cache signature, the seek-on-foot policy, the digest harness and walking, without touching geology or civilizations.

## Disagreements and unresolved decisions for the user

Disagreements with the roadmap:

- **Milestone 1 before walking.** Do the contract first and the era feature third. Walking is the risk gate the research document already identified.
- **Milestones 2 to 4 as one release.** Ship walking alone on terrain 1.1.
- **Lazy coarse civilization generation.** Not causal. Eager coarse or analytic fronts.
- **256 MiB surface budget.** Too small once regional rasters and two history states exist. Raise it or lower regional resolution.
- **5 cm contact target.** The research document says 2 cm. Pick one and record it.
- **"Never advance from the Big Bang one tick at a time."** True at the fine level. The coarse civilization layer is a forward simulation, and the documentation should say so.

Decisions only the user can make:

1. Reference-date anchoring as the construction rule. This changes the meaning of "history": today's catalogue becomes the fixed point rather than an emergent outcome.
2. Time quantum and origin. Recommended: nanosecond BigInt relative to the catalogue epoch.
3. Whether geology 2 may move Maithea's coastline outside the coastal band from the v1 spec, and whether the recorded landing site must survive migration.
4. Raise the depth, leaf and cache limits, or introduce a second near-ground structure. Recommended: raise limits first, profile, then decide.
5. Civilizations: analytic fronts only for the first civilization milestone, and whether fictional faster-than-light travel is in the default scenario.
6. Baseline desktop hardware for measurements. Nothing has been measured on hardware.
7. Whether walking is in the XR profile at all in the next release. Recommended: no.

## Sources and disclosures

Evidence from supplied material: all code facts above come from the four supplied source files; all measured figures come from the exploration corrections document. The v1 spec and research document are older and superseded where the roadmap differs.

Inference and standard results, not newly verified against a primary source: IEEE 754 float64 ulp at 4.35e17 s is 64 s; adiabatic orbit expansion under slow mass loss; unbinding when instantaneous mass loss exceeds half the system mass, Hills 1983, ApJ 267, 322; rising main-sequence luminosity, Gough 1981, Solar Physics 74, 21. Cube-sphere arc figures assume a 6.371e6 m radius and the face mapping in `cubeDirection`.

Speculative design: the ownership and conditioning rules, the analytic-front civilization model, the biosphere stage enum, the regional byte estimates and the leaf-count estimate for a restricted quadtree.

External references beyond those already cited in the roadmap, marked as not newly verified:

- Barnes, Lehman and Mulla, "Priority-flood: An optimal depression-filling and watershed-labeling algorithm for digital elevation models", Computers & Geosciences 62, 2014, DOI 10.1016/j.cageo.2013.04.024. Depression handling for the coarse drainage graph.
- Three.js `DataTexture` documentation, https://threejs.org/docs/pages/DataTexture.html, for `generateMipmaps` behaviour.

No tests or benchmarks were run for this review, no files were modified, and the model name above is self-reported.
