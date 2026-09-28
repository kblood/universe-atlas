# Offline foliage mip sidecar desktop verification

## Build and scope

The browser runs used the detached acceptance checkout at commit `2e00837`, built cleanly with `npm run build` (see [`committed-build-2e00837.log`](committed-build-2e00837.log)), served locally at `http://127.0.0.1:5198/`. Renderer: NVIDIA GeForce RTX 5090 / ANGLE D3D11. The reports record SHA-256 for every runtime input, browser runner, family GLB, sidecar manifest, and payload, with start/end equality checks. This is a local development verification of experimental family assets; it is not a production or XR acceptance result.

The Oak and Pine payloads were separate and matched their GLB foliage images. The CPU binding report is [`actual-sidecar-report.json`](actual-sidecar-report.json); it covers source PNG and payload hashes without GPU upload.

## Full close, date, and mid run

[`browser-run-2e00837/report.json`](browser-run-2e00837/report.json) records the paired default/generated-mip and offline-sidecar runs. Find Life changed the requested URL date, so subsequent checks used the observed in-game date `435084631200000073769400000`.

Both sidecars reported `offline-sidecar`, seven downsample levels plus the 2048² base, and 5,592,064 payload bytes per family. CPU installation setup was 24.4 ms for Oak and 21.9 ms for Pine. Cold family-set loads took 3,891 ms with renderer-generated mips and 4,015 ms with offline sidecars; these are single-run timings, not a performance comparison.

A WebGL2 `texStorage2D` audit observed exactly two 2048² `SRGB8_ALPHA8` allocations with eight immutable levels. Both level-7 framebuffer attachments were complete and read back without GL error. Their alpha coverage was 0.1953125 for Oak and 0.0625 for Pine, matching the sidecar manifest endpoint coverage exactly. Bindings were restored after readback.

At the same close pose/date, default versus offline canvas images differed in 8.44% of pixels by more than 3 channel values; mean maximum-channel delta was 2.46. The separate 2 s warm / 8 s profile windows reported default/offline CPU `planetUpdateMs` p50/p95 of 35.1/44.3 and 34.3/43.8 ms, and instrumented GPU pass sums of 14.39/18.49 and 14.11/18.92 ms. Both had 299 draws and 8,613,004 triangles. These samples do not establish a speedup or perceptual improvement.

The date shift and return used the observed base date. All 32 compared tree samples retained their identity, family, recipe, physical height and wind offset. The report's first mid image, [`offline-mid-390m.png`](browser-run-2e00837/offline-mid-390m.png), is preserved as a far-canopy view and is not used as a mid-distance foliage comparison.

## Matched mid-distance foliage images

The first matched-mid attempt is preserved in [`mid-pair-down-390m/failure.json`](mid-pair-down-390m/failure.json). It reached 388 m and had detailed Oak/Pine submissions, but waited indefinitely for an unrelated `lifePending` queue after pausing; it did not capture the pair.

The corrected [`mid-pair-down-390m-rerun/report.json`](mid-pair-down-390m-rerun/report.json) uses a downward camera angle and records the outstanding life queue rather than blocking on it. At 390.58 m, detailed submissions were Oak `[0, 250]` and Pine `[0, 369]` in both captures, with detailed lighting active and identical camera position and date. Default and offline images differed in 1.82% of pixels by more than 3 channel values; mean maximum-channel delta was 0.696. See [default](mid-pair-down-390m-rerun/default-mid-down-angle.png) and [offline](mid-pair-down-390m-rerun/offline-mid-down-angle.png). There were no browser or GL errors.

These comparisons exercise explicit mip installation and the visible detailed families. They do not establish a broad visual-quality improvement, production asset acceptance, headset behavior, or a performance gain.

## Reproduction

With the committed checkout built and Vite running on `:5198`, set `ATLAS_HARDWARE=1`, `ATLAS_URL`, `ATLAS_RESULTS`, and the four sidecar path variables (`ATLAS_OAK_MIP_MANIFEST`, `ATLAS_OAK_MIP_DATA`, `ATLAS_PINE_MIP_MANIFEST`, `ATLAS_PINE_MIP_DATA`). Then run either [`integration.browser.mjs`](integration.browser.mjs) for full close/date/sidecar/storage checks, or [`mid-pair.browser.mjs`](mid-pair.browser.mjs) for the matched down-angle mid capture. The result directory names in this record are preserved; reruns should use fresh `ATLAS_RESULTS` paths.
