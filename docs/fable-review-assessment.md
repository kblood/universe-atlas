# Assessment of Fable 5.1's independent review

2026-09-13. The [complete response](fable-5.1-plan-review.md) is preserved
verbatim. The [CLI metadata](fable-5.1-plan-review.metadata.json) confirms
`claude-fable-5-1` produced the review through Claude Code 2.1.268. Runtime was
436,942 ms, approximately 7.3 minutes. The CLI also reports an auxiliary Haiku
call with 17 output tokens; it was not the substantive reviewer.

The reviewer received the entire roadmap, earlier research/specification, the
exploration corrections and four implementation files, with tools disabled.
Its external references were not independently fetched during that invocation.
The caller subsequently checked selected arithmetic, source-code claims and the
primary references below. No runtime changes or hardware benchmarks were made.

## Findings to adopt in the next implementation specification

1. **Separate foundational contracts from full cosmic visuals.** Precise dates,
   object lifetimes, stable lineage and reference-epoch compatibility belong
   before walking. A complete visible formation-to-remnant sequence is a larger
   feature. Start with lifecycle data fixtures and a date shared by every view;
   add elaborate era rendering later. Universal time remains the foundation.
2. **Ship walking as its own acceptance milestone.** Do not require the forest,
   watershed and material overhaul to finish before validating ground contact.
   Prove one rocky planet and one airless moon, including cube edges, poles,
   streaming, save/restore and return to flight.
3. **Make civilization ownership and conflict rules explicit.** A later request
   for a neighbouring region cannot retroactively change which civilization
   first colonized a system. Begin with deterministic arrival-time functions
   and explicit tie-breaking on a bounded scenario domain. More coupled trade,
   migration and war need canonical macro histories and immutable boundaries.
4. **Separate rock and water in the query contract immediately.** The existing
   terrain can be wrapped as an immutable baseline rock field while a new water
   field controls surface level. Do not animate `body.water`, which currently
   participates in the rock-height calculation. Defer hydrology-2 detail without
   coupling its future representation to the public query interface.
5. **Prove contact detail with measured budgets.** The current maximum depth is
   insufficient for the proposed walking spacing near an Earth-size face centre.
   Add byte accounting, a dedicated contact neighbourhood and a benchmark before
   selecting higher leaf/cache caps. Keep collision and the visible contact mesh
   consistent through refinement, rather than simply trusting the analytic field.
6. **Construct compatible histories around the existing reference epoch.** For
   existing catalogue objects, condition their histories on their current records
   and preserve the digest. Use new lineage namespaces for objects absent at that
   date. Existing generated masses, types and orbits may not all fit a realistic
   evolutionary track; detect and document those incompatibilities rather than
   silently changing the catalogue or claiming all constraints are satisfiable.

## Corrections and qualifications to the independent review

| Review claim | Caller assessment |
|---|---|
| 13.8 billion years in nanoseconds needs about 60 bits | Incorrect: using 365.25 days/year gives 435494880000000000000000000 ns, requiring 89 bits. BigInt still supports it. |
| Floating-point seconds have 64-second spacing around 13.8 Gyr | Correct for an absolute float64 seconds value at that magnitude. The current application uses a local epoch near zero; this is a future clock-design issue, not a reproduced current flight failure. |
| Raising the current sea threshold raises every mountain | Wrong sign and oversimplified. The base term `(coast - sea) * 47000` falls by 470 m when `sea` rises by 0.01, before clamping and the dependent detail terms. The coupling problem itself is real. |
| Level 16 yields about 6 m cells; levels 18–19 about 1.5–0.76 m | Confirmed at the centre of an Earth-radius cube face: `2R / (2^level * 32)`. Distortion varies over the face. This is mesh spacing, not a bound on terrain error or contact mismatch. |
| A restricted level-19 tree necessarily needs about 230 leaves and more than 300 resident tiles | A speculative estimate, not a demonstrated lower bound. Required coverage, balance rules, corners, culling and fallback policy matter. Benchmark the actual selection rather than hard-coding these estimates. |
| A 256 MiB budget is necessarily too small | Not established. Regional channel formats, spacing, residency and temporal overlap were assumptions, not implemented allocations. Keep an explicit provisional budget and choose representations after accounting. |
| Geology 2 must use regional rasters as the authority | A design option, not a requirement. Analytic features, graphs and raster caches can be combined behind the same authoritative query. The roadmap did not mandate a universal raster replacement. |
| Lazy coarse history cannot be causal | Unconstrained independently generated interacting regions are unsafe. Lazy evaluation of a canonical dependency graph or analytic arrival functions can still be deterministic. Eager whole-domain simulation is one solution, not the only one. |
| Disable morphing under the capsule to solve contact mismatch | Insufficient alone: immediate replacement can visibly pop or penetrate the player. Prepare and pin contact coverage, stage mesh/collider replacement together and test the transition error. |
| Derive normal sample spacing directly from tile LOD | Can introduce shading disagreement between neighbours. Choose a documented shared metre-scale sampling convention or an explicitly blended band policy across LOD boundaries. |
| Loss of half the stellar mass universally determines orbital escape | The familiar threshold has restricted assumptions, including an initially circular orbit and impulsive symmetric mass loss without a kick. Eccentric phase, mass-loss timescale and kicks alter the outcome. Use a model valid for the fixture, not a universal boolean rule. |

The current texture filtering and permanent worker-failure state are useful audit
findings. Mipmapped materials, bounded retry/recovery and explicit job ownership
belong in the walking work. However, neither screenshot predictions nor a noise
evaluation count establish frame rate; CPU/GPU profiling is still required.

## Refined next-release recommendation

The next release should include:

- A versioned precise date type, reference epoch, existence/lineage records and
  query interfaces that are shared across all scales. Keep arbitrary future
  dates separate from the short floating-point interval used for rendering.
- Sun-like and massive-star lifecycle data fixtures, deterministic checks and
  explicitly limited orbital validity intervals. Full visual cosmic history is
  developed later without changing these contracts.
- Independent rock-height and water-level queries, initially preserving the
  terrain 1.1 baseline. A controlled water-level fixture exercises date seeking
  without implying a completed planetary climate model.
- Land/walk/jump/run/return-to-flight on a rocky planet and airless moon, with
  stable radial orientation, neighbour seams, contact coverage and collision.
- A byte ledger and acceptance routes that measure contact mismatch, streaming
  recovery, frame times and memory, including pole/edge cases and cold restores.

Then proceed to structured geography and hydrology, detailed materials and
forests, visible lifecycle consequences, local historical change, and wider
civilization/cosmic history. Some data prototypes can advance alongside content,
but the release gates should remain independently demonstrable.

This narrows the next release without narrowing the user's universal-time goal.
Species, populations, civilizations and later cosmic representations all retain
the same deterministic history contract.

## Checked references

- [Hills 1983: sudden mass loss and kicks](https://adsabs.harvard.edu/pdf/1983ApJ...267..322H)
  studies arbitrary eccentricity and kicks, demonstrating why a blanket half-mass
  escape rule is unsuitable.
- [Barnes, Lehman and Mulla: Priority-Flood](https://arxiv.org/abs/1511.04463)
  is a useful depression-handling reference. Its application to our spherical
  hierarchy still needs explicit topology, outlets and deterministic ordering.
- [Barnes and colleagues: Fill–Spill–Merge](https://esurf.copernicus.org/articles/9/105/2021/esurf-9-105-2021.html)
  provides relevant context for retaining real depressions and lake systems
  instead of simply filling every basin out of existence.

Arithmetic checks were performed with Node.js; code claims were checked against
`terrain.ts`, `planet-tiles.ts`, `planet-renderer.ts` and the implementation record.
The original review remains unchanged so its suggestions and these corrections
can be compared directly.
