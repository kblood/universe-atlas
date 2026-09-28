# Captured tree diffuse transfer experiment

## Result

The optional RGB moment representation in `d12733c` passes the Oak lighting
comparison at 16 m under the six tested view/sun combinations. It does not
establish visual acceptance or readiness for a forest renderer.

On the same captured tree, with per-view PBR enabled in both cases:

| Coverage-weighted 33 px view | Normal-based diffuse | RGB transfer diffuse |
| --- | ---: | ---: |
| Front, original sun | -6.38% | -0.71% |
| Intermediate, original sun | -21.00% | +0.39% |
| Front, opposite horizontal sun component | -5.81% | -1.42% |
| Intermediate, opposite horizontal sun component | +23.03% | -0.24% |
| Front, overhead sun | -44.56% | -3.79% |
| Intermediate, overhead sun | -12.19% | +2.84% |

These are relative mean luminance differences against the exact source LOD1,
using untone-mapped linear RGB in renderer units. The source reference is
1056 px reduced to a 33 px full capture-diameter frame. Sun positions are
`[-30,55,25]`, `[30,55,25]` and `[0,80,0]`; the two view directions are
`[0,0,1]` and `[1,.3,1]`. This is a matched on/off comparison in one browser
run, not a comparison between unrelated screenshots.

The RTX 5090 / ANGLE D3D11 run reported no browser or WebGL errors. Both the
legacy and coverage-weighted texture filters were exercised. The
[report](../test-results/family-capture/sidecar-transfer-v1/report.json) preserves
the complete results, source hashes and exact raw source snapshots.

## Method

Use the established order-two clamped-cosine irradiance expansion described by
[Ramamoorthi and Hanrahan](https://graphics.stanford.edu/papers/envmap/).
For each original covered source sample, store nine moments **per RGB channel**:
`A, Nx, Ny, Nz, Qxx, Qyy, Qxy, Qxz, Qyz`. They include the sample's linear
albedo and coverage. Keeping RGB coefficients preserves correlations between
leaf/bark colour and orientation. The missing diagonal is `Qzz=A-Qxx-Qyy`.

Reduce these coefficients linearly by pixel area. Keep signed terms, and do not
renormalize first moments. Bilinear/mip and view interpolation consequently
operate on the lighting response rather than turning many leaf orientations
into one unit normal. Clamp the evaluated irradiance, not the coefficients.
Hemisphere light uses the exact linear first-moment expression. The original
Three specular path remains in place.

The optional shader supports the lab's punctual, ambient and hemisphere lights.
Environment maps, probes and rectangular area lights are deliberately rejected
for this prototype. No self-shadowing, cast shadows, atmosphere, wind or
instanced forest path is supplied by these coefficients.

## Cost and unresolved work

- Nine RGB half-float moments use seven additional RGBA16F texture arrays.
  Total decoded texture storage is **31,848,552 bytes** for one 81-view family,
  versus 7,077,456 bytes for the original attachments. The experimental loader
  and capture command enforce a 32 MiB decoded-texture limit.
- The shader adds texture reads and diffuse evaluation work. Full-game GPU cost
  is unmeasured. Storage, sampler cost and instancing need evaluation before
  adoption or adding species/variants.
- Coverage and depth are unchanged. Intermediate weighted median view-depth
  difference remains **1.163 m**, above the current 1 m comparison gate.
- The magnified capture still looks soft and stippled. Screenshots are inspection
  views, not proof of appearance at the 33 px measurement distance.
- Pine, other heights, root-position error and motion/temporal appearance remain
  unverified for this representation. No production adoption follows this run.

## Provenance and reproduction

The named capture command adds `--diffuse-transfer quadratic` to the existing
81-view, 64 px / 512 px-source Oak LOD1 capture with its exact runtime foliage
sidecar. The validated brief is
`examples/asset-briefs/atlas-family-lod1-diffuse-transfer.json` in IWSDK;
the host option and brief were committed as `209280b`.

The [artifact audit](../test-results/family-capture/sidecar-transfer-audit/capture-audit.json)
checks all 2,835 files, finite/bounded transfer values, area-associated albedo
agreement and source provenance. All **2,268 original capture attachments are
byte-identical** to the prior Oak sidecar capture. The new lighting information
was derived from the original 512 px samples before any normal reduction.

Retained capture:
`Assets/_assetctl/atlas-oak-lod1-capture-16m-64-sidecar-transfer-v1`.
Browser harness flags: `ATLAS_CAPTURE_SIDECAR=1`, `ATLAS_CAPTURE_FAMILY=oak`,
`ATLAS_CAPTURE_TRANSFER=1`, `ATLAS_CAPTURE_RELIGHT=1`,
`ATLAS_CAPTURE_MULTI_SUN=1`, with `ATLAS_CAPTURE_REPORT` pointing at a fresh
folder. The audit uses the sidecar and transfer flags. GPU jobs remain serialized.
