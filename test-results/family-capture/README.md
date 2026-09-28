# Actual family LOD1 capture comparison — 2026-09-28

These are isolated development measurements, not forest or visual acceptance.
Live remains `8e16776`. Source family geometry and original files are preserved.

## Inputs and capture

Root tool commit `24d81e3` accepts the existing author-7 and EZ-Tree Oak/Pine
source contracts, verifies briefs/provenance and both GLB hashes, and preserves
the original manifest plus upstream MIT notice. Runtime capture commit
`7d703ee` selects the actual simplified LOD1. The validated comparison brief is
`examples/asset-briefs/atlas-family-lod1-capture-comparison.json` in IWSDK root.

Each 16m family was captured at 81 full-sphere directions, 512px source reduced
to 64px plus independent mips. Each decoded GPU set uses 7,077,456 bytes.
`capture-audit.json` records the retained output locations, source manifest
hashes, adapter and channel checks. `audit.mjs` checks all 2,268 files per
family by length/hash, finite values, nonempty bark/leaf classifications and
base coverage sums. Both passed on RTX 5090 / ANGLE D3D11. Review files retain
NOASSERTION for original Atlas materials; MIT geometry attribution is retained.

## Runs

- `filtering-v1`: harness failed because the lab extension accidentally removed
  its existing `impostor` getter. The getter was restored. This was not a GPU
  product failure; no results were collected.
- `filtering-v2`: actual GPU A/B, no GL/page/console errors. Its 33px reference
  used only 132px source samples and was insufficiently converged.
- `filtering-v3`: 33px source reference uses 528px samples; intermediate Oak
  weighted capture gives blurred IoU 0.873 and coverage error -6.37%. Pine gives
  0.838 and -6.73%, but 264px versus 528px source coverage differs about 20%.
- `surface-v1`: metric depth and linear rendered colour measured with a 1056px
  mesh reference. Oak reference coverage changes <0.6% from 528px; Pine still
  changes 15–16%. Pine convergence is not established. This catches failures
  that silhouette-only comparisons missed.
- `surface-v2`: same inputs with coverage-weighted view depth, two-sided leaf
  orientation, and sphere tangent-cone bounds. No GL/page/console errors.
  Weighted-filter intermediate median depth error fell from 1.873m to 1.158m
  for Oak and 1.617m to 1.143m for Pine; p95 fell from 7.017m to 3.214m and
  3.828m to 2.444m respectively. Silhouettes are unaffected by this depth blend.

The primary result is **not accepted**: intermediate weighted capture luminance
is still 35.6% below the Oak mesh and 26.6% below Pine, outside the 10% gate.
Median depth still exceeds 1m. The normal orientation correction made little
difference in these directions. Coverage-weighted packing fixes transparent
attribute filtering, but it is not a general silhouette or lighting improvement.

All reports include runtime source hashes. The last run used the recorded
uncommitted renderer changes before their staged commit; the SHA label alone
does not identify those bytes. Frame pixel counts describe the entire capture
diameter, not the tree's projected height. The screenshots deliberately magnify
the 64px representation to expose artifacts; they do not represent accepted
close-range use. Root raster contact, temporal stability, full forest cost,
physical height variants and game handoff remain unverified.

## Corrected source sampling

The runs above intentionally load original GLB texture mips. They use the real
game geometry but **do not model the current game's offline foliage mips**.
That missing input was found during the comparison audit. Root `35ff152` and
Atlas `d2223c3` add explicit, source-hash-bound sidecars to both capture and
reference, with no silent fallback. `sidecar-audit` verifies the new retained
captures; `sidecar-surface-v1` repeats the hardware comparisons with the actual
runtime foliage inputs. All artifacts and GPU error checks pass.

At the intermediate 33px frame, weighted capture versus the 528px reference
gives blurred IoU 0.874 Oak / 0.848 Pine, area error -6.08% / -6.24%. The
528px→1056px source convergence error is <0.7% Oak and 3.3–3.6% Pine. Native
MASK geometry still loses 27% / 50% coverage respectively. This is relevant
to the visible transition and is not solved by a matching proxy alone.

The source correction improves Pine capture coverage and reference convergence,
but intermediate luminance is still -35.9% Oak / -38.0% Pine; median depth
errors are 1.163m / 1.177m. These captures also remain unaccepted. An opt-in
per-view PBR lighting experiment is being implemented separately; its existence
is not evidence of improvement.

`sidecar-relight-v1` subsequently tests committed `bd6d96a` with its opt-in
`captureRelightViews=1` path on RTX 5090; all four family/filter combinations
compile/render without GL/page/console errors. The installed Three PBR chunks
shade each view before coverage-weighted light blending. Intermediate weighted
luminance error improves from -35.94% to -21.00% Oak and -38.03% to -24.95%
Pine; it still fails the 10% gate. No full-game or GPU cost claim is made.

That run also tests native Three alpha hashing as a separate mesh setting,
using the current offline mip chains. Oak's 33px area error is +2.4–2.8%, with
blurred IoU 0.886–0.895 against the MASK supersampled reference. Pine instead
overfills by 76–78%, with blurred IoU about 0.555. This is not grounds for a
global foliage-mode switch. The family-specific behavior needs a coherent
source/capture coverage contract and actual-game temporal review.

`alpha-distribution.json` provides a CPU explanation for that distinction. The
current sidecars preserve a fixed MASK cutoff, not mean alpha. Pine's expected
hashed coverage / cutoff coverage grows from 1.071 at the original level to
1.901 at mip 7; Oak's mip-7 ratio is 1.051. Thus combining the current Pine
MASK correction with alpha hashing changes its intended density. Before any
family-mode switch, compare hashing with mean-coverage mips (or the original
chain) and retain a consistent source/capture sampling contract. This texture
statistic does not by itself establish the mesh's screen-space coverage.

## Reproduce

Keep rendering dev server on 5197, retained root captures present, and the GPU
free of other browser/generation jobs. Run `node test-results/family-capture/audit.mjs`
then set `ATLAS_CAPTURE_REPORT` to a **fresh** report directory and run
`node test-results/family-capture/compare.mjs`. The harness uses original MASK
source coverage and reports native mesh loss separately from supersampling.
Set `ATLAS_CAPTURE_SIDECAR=1` for the runtime-matching captures and reference.
The optional `ATLAS_CAPTURE_RELIGHT=1` requires the per-view lighting uniform;
the runner fails if that option is requested but unavailable. New runs also
report native Three alpha-hash coverage as a separate source comparison.

Next implementation must resolve intermediate-view lighting/depth and Pine
source sampling before game integration; the original solid canopy remains
visually rejected by the genuine Opus review. Do not retune a scalar brightness
to hide a directional reconstruction defect.
