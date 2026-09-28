# Rejected small-footprint run: asynchronous load race

**Invalid comparison.** The requested HASH load had not finished when capture
started: `report.json` records `alphaHash: false` and `alphaTest: 0.5` in the
HASH setup. Its captures mix material modes. Do not use the measurements below
as MASK/HASH evidence. The original notes are preserved below for diagnosis.
The [replacement run](../isolated-final/README.md) awaits `lab.load()` directly
and asserts color and shadow coverage settings before every capture.

## Original notes (superseded)

The corrected alpha-only render-target harness is [isolated-probe.mjs](../isolated-probe.mjs). It ran against the family F GLBs and the lab at `http://127.0.0.1:5197/tree-asset-lab.html` using Chromium 149.0.7827.55 and ANGLE / NVIDIA GeForce RTX 5090 Direct3D11. Exact input and source hashes, per-mode settings, smoke checks, and measurements are in [report.json](report.json).

The probe renders one identity-transform 16 m tree, with ground and shadows disabled. It clears to transparent and reads the render target alpha channel, avoiding the invalid background-color threshold used by the rejected attempt. A 128×128 smoke image and nonzero coverage assertion passed for both modes and both LODs before the smaller probes ran. Native footprints were 16, 32, and 64 pixels; comparison images were rendered at 512 or 1024 pixels and box-downsampled. The higher-resolution captures are references for this comparison, not converged truth.

## Coverage comparison

The table reports native alpha-equivalent pixels against the downsampled high-resolution sample at the same output size.

| LOD | Mode | 16 px native / ref | 32 px native / ref | 64 px native / ref | Mean absolute coverage error at 16 / 32 / 64 px |
|---|---|---:|---:|---:|---:|
| 0 | MASK | 9 / 62.7 | 35 / 250.9 | 580 / 1005.8 | 0.212 / 0.214 / 0.108 |
| 0 | HASH | 9 / 62.7 | 35 / 250.9 | 1082 / 1024.0 | 0.212 / 0.214 / 0.034 |
| 1 | MASK | 8 / 49.3 | 36 / 197.4 | 264 / 794.2 | 0.166 / 0.166 / 0.139 |
| 1 | HASH | 46 / 50.3 | 207 / 201.3 | 829 / 803.9 | 0.085 / 0.072 / 0.059 |

In these samples, HASH improves LOD1 coverage agreement across all three footprints. LOD0 has no change at 16 or 32 pixels and overfills the 64-pixel sample. Coverage agreement alone does not establish visual quality.

## Motion and limits

At 1.75 seconds, MASK’s native 16/32-pixel alpha maps showed no change in this sample. HASH changed by 0.000 at 16 pixels and 0.0098 mean absolute coverage at 32 pixels for LOD0; LOD1 changed by 0.0078 and 0.0156. The corresponding downsampled high-resolution deltas were 0.0009–0.0033 across modes and LODs. At 7 seconds and −7 seconds, native and reference maps replayed date 0 exactly.

Small camera yaw steps exposed substantial HASH changes beyond the downsampled sample. For 0.5° steps, HASH mean absolute coverage deltas were 0.0254 and 0.0264 on LOD0, and 0.0420 and 0.0488 on LOD1. The paired high-resolution downsampled deltas were 0.0030 and 0.0030 on LOD0, and 0.0051 and 0.0044 on LOD1. This indicates HASH still has temporal coverage instability during movement without TAA; the test does not judge whether its screen-space pattern is perceptually acceptable.

This isolates a single tree and disables shadows, ground, and other scene content. It is not full-game or headset acceptance. The sample does not measure lighting, shadow silhouettes, resource lifetime, or TAA, and 512/1024 samples are not proven converged references.

The initial [failed probe report](../render-target-probes/report.json) remains untouched and is not evidence: its omitted yaw/LOD defaults yielded a NaN camera and hidden batches; it also repopulated the instances after trying to hide side specimens.
