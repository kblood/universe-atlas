# Surface lighting desktop verification

Verified on the local Atlas app at `http://127.0.0.1:5197/`, using Playwright with `ATLAS_HARDWARE=1`. The first run identified `ANGLE (NVIDIA GeForce RTX 5090, Direct3D11)`; the close-up used the same hardware browser configuration. The run tested the legacy forest through the normal LETHRA-001 → Maithea → Find Life path; it did not load experimental family assets.

Runtime source hashes in both reports were unchanged across each run and match the surface-lighting implementation at commit `2f1a6c5`. Head later advanced to `6663ae8` with a separate, unimported foliage-mip helper; that change was not part of these browser captures.

## Captures and behavior

- At 195.3 m, detailed lighting was active with a 320 m × 1000 m shadow region, 2048² map, shadow intensity 1, sky fill 0.7, and ambient intensity 0.088. The broad hillside comparison is [detailed](desktop-run/lighting-detailed.png) and [basic](desktop-run/lighting-basic.png).
- At 11.70 m, the paired [detailed](closeup-run/lighting-detailed.png) and [basic](closeup-run/lighting-basic.png) canvas captures use the same paused camera pose (position delta 0 m; heading delta 1.4e-17). The detailed image shows contact shadows under legacy tree crowns and fauna; basic mode disables the shadow and sky fill and restores ambient intensity to 0.22. The attached full-frame pixel delta is not a lighting-only comparison: the legacy forest count changed from 725 to 493 as caster selection changed with the mode.
- Both browser runs had zero page/console errors and zero GL errors. The surface-lighting control toggled normally. The dated seek kept the feature enabled, but at the tested one-year-shifted date its daylight gate reported `active=false`; that capture is retained as [lighting-dated-detailed.png](closeup-run/lighting-dated-detailed.png). This is not evidence of a dated shadow render.

## Timing and CPU profile

Each lighting mode had a 1.2 s warmup and an 8 s render-profile window. In the close-up run, detailed/basic respectively recorded median/p95 CPU `planetUpdateMs` of 34.4/44.6 and 35.0/42.4 ms; median/p95 instrumented GPU pass sums of 10.81/14.43 and 9.47/11.84 ms. The scene workloads differed: 282 versus 217 draw calls and 1.263M versus 0.855M triangles. Those figures are not a controlled cost comparison, and the profiler does not isolate the shadow pass.

A separate 6.5 s CDP CPU profile was taken after the render-profile windows at the near-ground pose. It collected 4,293 samples. Highest self-sample counts were `PlanetForest.update` 847, `PlanetCanopy.currentPatch` 379, `PlanetRenderer.processLifeQueue` 284, `PlanetCanopy.noteNear` 194, and `PlanetRenderer.update` 179. The raw profile is [cpu-profile.cpuprofile](closeup-run/cpu-profile.cpuprofile); timing attribution is browser sampling, not a deterministic benchmark.

The screenshots show the shadow path operating, but also show faceted crowns, very dark foliage undersides, and hard, high-contrast shadow areas. This is an implementation check, not visual acceptance. Lateral shadow-map edge fade, XR/headset behavior, detailed-family wind/depth interaction, and isolated shadow-pass GPU timing were not verified here.

## Reproduction

```powershell
$env:ATLAS_HARDWARE='1'
$env:ATLAS_RESULTS='test-results/surface-lighting/replay'
node test-results/surface-lighting/desktop.browser.mjs
```

The close-ground variant, which also records the CPU profile, is `closeup.browser.mjs`. Both runners preserve start/end SHA-256 values for the touched runtime inputs and close their browser after the run. Detailed diagnostics and timings are in the adjacent `report.json` files.
