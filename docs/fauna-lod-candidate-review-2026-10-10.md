Same-source LOD comparison, desktop prototype
===========================================

`buildFaunaBodyLodCandidates(loadedSource, {targets:[1500,750,500]})`
returns the original source, the existing QEM control, and two candidate chains.
Construction belongs in a serialized worker/off-frame job. No renderer imports
the candidates and no production option or world identity changes.

The joint-constrained QEM candidate locks selected existing extrema of the four
feet and raises removal costs near lower-leg joints and source colour gradients.
Revision 2 uses mild importance and near-baseline attribute costs: revision 1
preserved feet but made the runner torso and neck visibly jagged. The kit reducer
constraints are optional; its original arithmetic/output remains unchanged when
they are absent. Locks apply to welded positions, including seam duplicates.

The independent adaptive clustering candidate groups source samples by spatial
cell, semantic part, major skin joint and coarse colour bin, with unique groups
for anchors. It searches at most 18 grids per budget and selects actual source
samples instead of averaging phenotype or weights. These levels are independent,
not nested. Reversed faces and degenerate triangles are removed. This algorithm
can open holes, disconnect limbs and lose small parts; the first paired gallery
shows those failures and this candidate is rejected for production.

Both methods preserve every surviving position, normal, colour and skin byte.
They return sourceVertex and representative maps, target/reached/withinBudget,
semantic ranges, droppedFeatures, method version and explicit options provenance.
`withinBudget` concerns triangle/vertex capacity, not visual acceptance. Copied
vertex colours do not guarantee preserved interpolated coat patterns. The options
and geometry diagnostic checksums use FNV-style hashes, not cryptographic
identity; the review harness records source/output SHA256 separately.

The frozen four-archetype adult/juvenile corpus reaches all 24 constrained-QEM
targets. It retains all 23-24 selected foot positions per source at all budgets;
the old QEM retains 0-10. No constrained-QEM semantic part disappears. Clustering
reaches the numerical budgets but loses 3-8 parts and some foot anchors. These are
geometric observations, not evidence that the constrained candidate is a universal
visual improvement. Rest/walk/feed side/front/foot sheets and coat/silhouette
measurements are required before selecting a winner. Quest acceptance is unavailable.

`FaunaLodCandidateCache` bounds retained typed outputs to four sources/8MiB by
default (configurable at most eight/16MiB), checks array/plan/genome identity and
evicts least recently used entries before admission. It never transfers borrowed
loaded-body buffers. `retainedSourceBytes` records borrowed buffers kept alive;
callers must charge them after the original near-rig cache evicts a source. In-place
source mutation requires invalidation. A result exceeding the retention budget
throws rather than entering the cache. Worker reducer transient JS allocations,
caller-owned results and GPU atlas/texture reservations are additional costs.

Combined construction of both candidates and baseline took roughly 0.46-0.80s
per supplied corpus source in a non-isolated diagnostic run. This is unsuitable
for a frame callback. A candidate's 16MiB pool bound is not free headroom: the
current complete forest scene exceeds the nominal 16MiB life reservation. Any
production pool must replace/share existing resources and pass aggregate measured
CPU/GPU accounting rather than stacking another pool on the scene.

Focused checks: `tests/fauna-body-lod-candidates.test.mjs` verifies all eight
sources, source immutability, survivor bytes and canonical walk/feed skinning,
anchors, honest target flags, determinism, cache identity and byte/count limits.
The kit checks include a frozen baseline digest, all seven original reducer
specimens compared exactly against the parent implementation, and anchor/invalid
input refusal. `tests/fauna-body-lod-candidates.report.mjs` consumes a supplied
frozen corpus and writes disposable geometry/provenance evidence. Review artifacts
live under `Assets/_assetctl/animal-system-20261010/`; source files are preserved.
