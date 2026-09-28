# EZ-Tree family adapter candidate F — 2026-09-28

**Status: local runtime-lab candidate, not an accepted game asset.** Candidate F
is the current conversion of the pinned EZ-Tree Oak reference into an
Atlas-material GLB pair. It is not connected to the planetary forest and is
not in the live app at `cc25635`. Export, loader and isolated browser checks
pass; canopy and material realism remain unaccepted. Earlier
candidates remain preserved for provenance.

## What the adapter builds

The named `tree-reference-family` operation consumes the provenance-checked
16 m Oak reference and the Atlas v7 GLB template. It writes candidate F under
`IWSDK/Assets/_assetctl/atlas-ez-family-f`, with a family manifest that records
source, template and toolchain hashes. The GLBs reuse Atlas's two material
roles and four embedded PNG textures. Geometry remains a derived reference;
the brief reports `NOASSERTION` for the original Atlas texture license state,
so the pair is not ready to package or ship.

| Level | Triangles | Geometry |
| --- | ---: | --- |
| LOD0 | 13,806 | Full branch and crossed leaf-card geometry |
| LOD1 | 4,866 | Reduced wood plus a deterministic middle subset of leaves, one plane per retained leaf |

The adapter preserves 1.2 m physical leaf cards and carries canonical leaf
centres, attachment pivots, branch levels and wind data into both levels. It
corrects the crossed-card normals, regenerates MikkTSpace tangents, and counts
the limited UV-gradient fallback when tangents cancel. Bark UVs use arc length
for V and base circumference for U, maintaining metric scale along the trunk;
the texture compresses toward tapered tips. LOD1 simplifies wood with
Meshoptimizer while weighting normal and UV attributes. Its reported error is
not a metre-only geometric error.

Candidate F keeps the same geometry counts, bounds and source images as E. An
independent tangent-convention audit corrected the `tangent.w` sign on one
LOD1 middle twig. The original Opus review assessed candidate D; candidate E
and F changes after that review have not received a new independent review.

The family manifest validates both GLBs with two materials, four embedded
source images and two draws per level. These are geometry and loader
compatibility checks; they do not prove canopy parity, material quality, or a
seamless LOD transition. The separate original-source findings and remaining
limits are in the [EZ-Tree comparison record](tree-ez-reference-2026-09-28.md)
and [Opus family-review assessment](opus-tree-family-review-2026-09-28.md).
The asset's Atlas-texture provenance remains `NOASSERTION`; the upstream
geometry is MIT-licensed, but that does not resolve the original material
license state.

## Validation of candidate F

Root tooling commits `c977c71`, `764525f` and `44570a0` preserve the adapter
and tests. Luna's independent converter test and five existing loader tests
pass. A follow-up test also checks adapter/brief hashes and the exact zero/one
cancelled-tangent counts. See the [CPU record](../test-results/tree-ez-family-v1/cpu-tests.log),
[final test output](../test-results/tree-ez-family-v1/cpu-tap.log),
[loader output](../test-results/tree-ez-family-v1/loader-tests.log) and
[family manifest](../test-results/tree-ez-family-v1/family-manifest.json).

The [RTX 5090 browser report](../test-results/tree-ez-family-v1/candidate-f-canvasfinal/report.json)
uses a 1600×1000 isolated asset scene, three 10/16/22 m specimens and instanced
populations of 64 and 192. Both levels share two materials and four images;
all 5,320 retained middle-detail foliage vertices match the near level's
position, pivot, UV and wind data. Returning from 1.75 seconds to date zero,
and advancing to the seven-second period, reproduce the canvas pixels exactly.
The changed wind phase changes 81,988 pixels. This proves replay for this
fixed browser fixture, not cross-device pixel identity or branch animation.
The separate [18-state GL check](../test-results/tree-ez-family-v1/candidate-f-canvasfinal/gl-check.json)
reports no WebGL errors. The [browser methods and limits](../test-results/tree-ez-family-v1/README.md)
describe capture and reproduction.

| Instances | Near GPU p50 / p95 (ms) | Middle GPU p50 / p95 (ms) |
| ---: | ---: | ---: |
| 3 | 0.092 / 0.100 | 0.051 / 0.057 |
| 64 | 1.060 / 1.077 | 0.363 / 0.384 |
| 192 | 3.076 / 3.116 | 1.517 / 1.583 |

Each row has 179–180 completed GPU samples with the lab's default camera,
sun, ground and shadow settings restored. Six draw calls include main and
shadow passes. These single-scene measurements do not establish whole-game
performance, a desktop hardware floor or a general speedup over another tree.

Initial browser measurements incorrectly read interleaved attributes as packed
arrays and included the changing HTML debug panel in purported canvas images.
The final harness uses attribute getters and synchronous canvas extraction;
the earlier D/E/F preliminary directories remain historical debugging output.

## What remains planned

Candidate F is a development lab result. It does not change the Atlas default
tree, replace the legacy live forest, or constitute a deployment. At live
checkpoint `cc25635`, Atlas still draws its existing tree shapes. The staged
plan calls for authored species, consistent near/far canopy, date-linked wind,
and a separately qualified Quest profile; this GLB pair only explores one
geometry source.

The final F images still show a thinner middle-detail canopy and dark back-lit
foliage with shadows disabled. Compare the
[near front](../test-results/tree-ez-family-v1/candidate-f-canvasfinal/close-lod0-front-shadows-off.png),
[middle front](../test-results/tree-ez-family-v1/candidate-f-canvasfinal/close-lod1-front-shadows-off.png)
and [near back](../test-results/tree-ez-family-v1/candidate-f-canvasfinal/close-lod0-back-shadows-off.png)
views. Reused Atlas materials mean that changing the geometry generator alone
does not resolve foliage lighting. The trunk is static; date-driven leaf
rotation and shader hooks do not establish complete tree animation or visual
shadow acceptance.

Remaining work includes visual acceptance across height, seed and biome,
physical-card UV fit and mip/alpha bleeding, broader tangent conditioning,
wind and shadow behaviour, level transitions, target-device cost, foliage
material review, source-license resolution, species binding, full packaging,
and game integration. The original Opus source review covered candidate D; its
assessment records D findings and selected E follow-up fixes. Candidate F's
later tangent-sign correction is outside that reviewed snapshot.
