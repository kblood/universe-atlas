Source-surface LOD refinement prototype
======================================

`buildFaunaSurfaceRefinedLodChain(loadedSource)` derives 1500/750/500 triangle
levels from revision-2 joint-constrained QEM. It preserves the original indices,
vertex counts, semantic ranges, loaded genome/plan, and selected foot anchors.
It changes derived positions and attributes: this is a new LOD method with its
own `fauna-surface-refinement-2` version, not a change to the full source animal.

For each semantic part it builds a bounded median triangle BVH over the original
loaded surface. Two refinement passes move adjacency centroids tangentially to
the source normal, cap movement at 2% of source diagonal per pass, and project
onto a source triangle supporting the original major skin joint. Exact-position
seam duplicates move together; conflicting semantic seams stay locked. Each move
must retain face area and agree with both the current and original QEM face
orientation. Checking only the preceding move allowed cumulative reversals; the
expanded corpus test caught that defect before visual acceptance.

Moved positions and colours are reconstructed from stored Float32 barycentrics.
Normals are interpolated from the same source triangle and normalized. Skin
weights accumulate over source triangle corners, keep the strongest four joints,
and use largest-remainder rounding to sum exactly to 255. The chain reports
`maxDiscardedSkinWeight`; this approximation can change deformation and must be
reviewed with the same canonical walk/feed palettes. Locked foot samples retain
their original position, normals, colours, joint indices and weights exactly.

Every output has `resampled:true`, `sourceTriangle`, `barycentric`, and
`initialSourceVertex`. It deliberately omits the old `sourceVertex` attribute
identity promise. `initialSourceVertex` describes the pre-refinement endpoint;
`representative` still maps source samples to derived output vertices.
`statsRole:'base-decimation-only'` distinguishes inherited QEM statistics from
the separate refinement diagnostics. Options provenance includes projection,
resampling, normal/area gates and source/base-method diagnostic hashes. Paired
review records actual source/output SHA256 independently.

Construction is off-frame/worker only. Sources and targets retain the existing
40000-vertex/60000-triangle and four-level limits; the canonical 22-bone source is
required. Pass count is limited to four. A shared Int32 cancellation flag is
checked throughout BVH/refinement and before/after base QEM. Base QEM remains a
synchronous bounded phase; terminating the worker is the immediate cancellation
route during that phase. No borrowed source buffer is transferred. No spatial
index is retained in the result.

`spatialIndexTemporaryBytes` counts the actual typed BVH buffers (at most about
9.4MiB at maximum source size), and `retainedDerivedBytes` counts output arrays
and anchor metadata. These omit reducer/adjacency JS working sets, worker input
clones, caller caches, borrowed source ownership and GPU atlas reservations. They
cannot establish combined game memory acceptance or free headroom within the
already exceeded nominal life reservation. No production pool/default changes.

Five focused tests verify immutable source data, barycentric positions/colours,
255-normalized skin, deterministic output, original triangle topology, every
face orientation, semantic feature retention, exact foot deformation, four
archetypes at adult/juvenile stages, input bounds and live worker cancellation.
Visual acceptance still requires paired rest/walk/feed review, coat/deformation
inspection and desktop CPU/GPU evidence. Quest acceptance is unavailable.
