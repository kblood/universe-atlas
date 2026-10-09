# Runtime body-derived LOD prototype

Source baseline: Atlas `f3e7697`. This module derives low-poly geometry from an
already loaded `QuadrupedBodyData`; it does not generate a replacement animal,
change its genome, rebuild its skeleton or modify the production fallback.

## API

```ts
const chain = buildFaunaBodyLodChain(body, {targets: [1500, 500, 200]});
const level = chain.levels[1];
const cache = new FaunaBodyLodCache(8);
const cached = cache.get(body);
```

`level` is compatible with QuadrupedBodyData: original `plan`, Float32 position
and normal buffers, normalized Uint8 colour/skin-index/skin-weight buffers,
Uint32 indices, remapped body/structural/face ranges and counts. It also carries
target/reached/withinBudget, sourceVertex/representative maps, semantic part
ranges, reducer statistics, droppedFeatures, appendagesPresent and byteLength.
The chain keeps its source and a provenance record: source body version,
reducer version, original counts and a noncryptographic geometry checksum.
All surviving attributes are copied bit-for-bit from the source.

The public budget envelope is 1–4 decreasing targets in 64–3000 triangles,
sources up to 40000 vertices/60000 triangles, and cache capacity 1–64 bodies.
`withinBudget` requires both triangles and vertices at or below the requested
target. Consumers must check it; reaching a triangle count does not itself
prove visual quality. Default renderer reservations can safely use 1500/500/200
vertices and 4500/1500/600 indices. The measured corpus used far fewer vertices.

The cache keys by actual loaded source identity, original array references,
bone-plan/genome identity and LOD options. It is bounded LRU, not a species-name
cache. Loaded bodies are immutable; in-place edits require invalidate(source).
Array/plan/genome replacement invalidates automatically. Result ownership and
source ownership remain distinct.

## Compatibility and feature preservation

The existing composer reducer uses deterministic half-edge quadric collapses,
exact position welding, skin/colour penalties, manifold link and boundary
checks, face-turn limits and mirror rules. The adapter normalizes Uint8 colours
and weights only for scoring and restores the original bytes through the
survivor map. Its exact source layout is body, each ear/horn, structural
appendages, then face features. Unsupported layouts and invalid source data
fail closed.

Keeping all supplemental triangles unchanged would cost 680–1088 triangles
before the body, defeating the desired 500/200 targets. Instead the entire mesh
is reduced with explicit semantic ranges. Ears/horns/structural parts remain
identified and their parent bones stay. Presence is reported independently;
it does not imply a feature retained its exact silhouette. Missing features
are explicit rather than silently repaired with a different animal model.

Construction is synchronous and takes hundreds of milliseconds. Schedule it
off-frame in a worker, serialize cold jobs and cache results. Worker input must
clone the loaded source; never transfer/neuter its original buffers. Return
derived level buffers plus provenance, retaining the original main-thread
source for cache identity. Worker/backend integration belongs to the
coordinator; no production module imports this prototype.

## Evidence

`tests/fauna-body-lod.bench.mjs` measures six authored morphology families in
adult and juvenile stages, with rest/walk/feed skinning. Full detailed sources
contain roughly 10–20k triangles. Report:
`test-results/fauna-body-lod-prototype.json` in the prototype worktree.

| requested triangles | observed maximum vertices | maximum posed p95 surface error / source diagonal |
|---|---:|---:|
| 1500 close | 804 | 0.75% |
| 500 mid | 304 | 1.63% |
| 200 far | 154 | 8.63% |

All targets reached with strict stage-0 geometry rules. All primary appendage
parts remain nonempty; no face part vanished in this corpus. Surviving vertices
skin identically to the detailed mesh under the unchanged 22-bone plan.

200 triangles is not universally acceptable: adult winged far posed p95 error
is 8.63% of the source diagonal (maximum 14.15%). Juvenile cursorial far envelope
loss reaches 10.54%. Most other far p95 values are 2.6–4.1%. A reviewed policy
must retain 500 triangles for failing shapes or improve the reducer; do not
enable all far levels merely because they hit a count budget.

Cold LOD construction measured 119–266 ms; source-body generation is a separate
cost. Cached lookup averaged 0.122 microseconds in a 100000-hit loop. This is
Node construction/quality evidence, not browser draw or device performance.
1500 triangles only modestly improves the current near primitive triangle
cost; 500/200 reduce the far geometry cost. Rendering and posing costs must be
measured with the proposed shared skinned backend before a production decision.

Validation: TypeScript clean; five focused tests pass for determinism, exact
source/attribute retention, rest/posed quality, all six adult morphologies,
cache replacement/eviction and fail-closed malformed inputs. The benchmark
extends construction/quality evidence to all six juvenile morphologies. No
source body, generator version, canonical world pin or production renderer is
changed, and no external model, asset download or Blender pipeline is used.
