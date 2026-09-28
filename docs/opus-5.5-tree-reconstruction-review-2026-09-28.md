# Opus 5.5 tree capture reconstruction review — 2026-09-28

Archived returned review. Static source/reconstruction review only; no code was executed. The reviewer discusses supplied comparison reports but does not independently verify their measurements or accept the capture. The source snapshot was dirty; its revision is the base commit. Returned-model identity, review scope and input hashes are in the [metadata record](opus-5.5-tree-reconstruction-review-2026-09-28.metadata.json).

## Returned review
# Review: Atlas tree capture reconstruction

Load validation and the mip upload path look sound. The 0.9993 IoU on exact views shows the capture/basis contract is right. The 0.72 IoU on arbitrary views and the MASK coverage loss have identifiable causes, covered below in priority order.

## Correctness fixes

**1. Filtering is unpremultiplied (highest impact).**
- Colour, normal/depth, and leaf fraction are sampled bilinearly and trilinearly across silhouette edges next to empty texels.
- At leaf edges this causes:
  - dark or background halos in colour;
  - `data.w` pulled toward whatever empty texels hold, which corrupts the parallax solve;
  - leaf fraction falling toward 0, so edges get bark roughness.
- Fix: store `rgb·a`, `n·a`, `w·a` and `leaf·a`, and do the same in the SSAA area mips. After sampling, divide by `a`.
- Check the baker first: if mips were area-averaged over empty texels without coverage weighting, the stored mips are biased as well.

**2. The parallax solve is unconverged.**
- `captureSample` does two fixed-point steps on a single-layer heightfield.
- At foliage depth discontinuities, fixed-point iteration oscillates or lands on empty-texel depth.
- Replace it with a bounded march, as in parallax occlusion mapping:
  - step `w` from +1 to −1 in 8–16 steps at `captureMip`;
  - the first step where coverage ≥ 0.5 and ray height ≤ surface depth is the hit;
  - refine with 2–3 bisection steps.
- Add a unit capture of a known tilted quad and a sphere to pin down the sign of `data.w`. The formula `t=(plane+w·R)/denominator` assumes +w points toward the camera.

**3. `hitDistance` pops.**
- It takes the minimum `t` over any view with weight > 0.001, so a view contributing 0.2% can decide depth.
- Use the maximum-weight view's `t`, or a coverage-weighted `t`.

**4. Dither is screen-space.** `captureNoise(gl_FragCoord.xy)` swims under camera motion. Two options:
- Hash the reconstructed object-space hit (Wyman hashed alpha, quantized by the derivative of the hit position). This is the same family as Three's `alphaHash`, which hashes `vPosition`.
- Set `alphaToCoverage` on the MSAA target and output coverage in alpha, overriding `opaque_fragment`'s forced 1.

**5. `vViewPosition` is still the billboard plane.**
- Specular view vectors, and later point lights, fog and shadow coordinates, use the plane position rather than the hit.
- Negligible for a distant sun, but wrong in principle.
- Define a local hit-position view vector and `#define` it over the uses after `normal_fragment_begin`.

**6. Billboard scale.**
- `d/(d−R)` is over-conservative and explodes as the camera nears the bounding sphere.
- Use `d/sqrt(d²−R²)`. Below roughly 1.1R, reject or hand off to the mesh rather than clamping to 0.01.

**7. Load and lifecycle.**
- The array-layer limit check throws inside `onBeforeRender` every frame. Move it to load.
- Validate `manifest.artifacts` as an array.
- `onBeforeRender` allocates Matrix4 and Vector3 objects per frame.

**8. Normals.**
- Confirm the baker flips double-sided leaf normals toward the capture camera. Otherwise back-facing cards shade dark.
- Mip-averaged normals shorten before `normalize`. Feed `1−|n|` into roughness (Toksvig-style) instead of discarding it; this matters most at 32–64 px.

## Measuring normals, shading and depth

**Debug outputs.** Add a `captureDebug` uniform to the impostor and a matching injection into the mesh mask hook. Modes:
- coverage, albedo, view normal, linear view depth, leaf fraction;
- selected layers and weights (impostor only).

Read these into a HalfFloat target; RGBA8 can't measure depth or normal error. Report:
- coverage IoU;
- coverage-weighted angular normal error;
- depth error in metres;
- linear albedo RMSE;
- leaf-fraction error.

**Held-out views.**
- Capture once at 17×17. Its even-index vertices are exactly the 9×9 grid, with identical `decodeTreeView` bases.
- Reconstruct the odd views from the 9×9 subset and compare against the true captures from the same pipeline.
- This isolates interpolation error from mesh-versus-capture rasterization differences. Plot error against angular distance to the nearest captured view.

**Lit comparison.**
- Use `NoToneMapping`, a sweep of about 6 sun directions, and compare linear luminance RMSE after SSAA.
- Because the albedo capture carries no occlusion, expect the impostor to read brighter inside the canopy. Measure that gap before deciding on an AO channel.

**Depth.**
- Intersect the impostor and the mesh with a vertical plane through the centre and compare the intersection masks.
- Sweep the camera across one blend cell in small steps. Log frame-to-frame coverage change for flicker and depth jumps for popping.

**Scale-separated IoU.**
- Report IoU after a Gaussian blur at the target pixel size as well as raw.
- The raw 0.72 mixes silhouette misregistration, which is fixable, with leaf-level parallax a single depth layer cannot represent. Only the blurred number should gate decisions.

## 9×9 versus 17×17

- **Current spacing:** full-sphere 9×9 has 16 equator samples, about 22.5° apart.
- **17×17 cost:**
  - it has 289 layers, which exceeds WebGL2's guaranteed minimum `MAX_ARRAY_TEXTURE_LAYERS` of 256;
  - at 128 px it costs about 101 MB per height/variant, against 28.3 MB now.
- **Recommended alternative:** unless below-horizon views are a real requirement (cliffs, flight underneath), test a **hemi-octahedral 9×9**.
  - It gives 32 equator samples, about 11.25°, the same as full 17×17, with 81 layers.
  - Version it as a new view contract.
- **Decide with data:** use the held-out measurements after fixes 1–3. Parallax error in pixels scales with projected size, so 9×9 may already pass at the ≤64 px distances where impostors actually render.
- **Smaller saving:** move leaf fraction off an RGBA8 texture that uses only R (about 25% of current bytes).

## Threshold-limited foliage

The 22 m / 32 px bake with no leaves is a baker bug, not a data curiosity. The alpha test runs on averaged alpha mips at the capture resolution.

**Establish ground truth first.**
- Render the mesh with mip 0 forced (no min-filter mips) at 2048 or more.
- Area-reduce to 32, 64 and 128. The probe currently caps supersampling at 4 and total size at 2048, so extend it to 8 or 16.
- The current 32/64 references are undersampled, so the +3%/+1% hash bias isn't established yet. Don't tune against it.

**Bake fix, pick one:**
- **(a)** Force leaf-texture LOD 0 during capture with at least 8×8 SSAA, then area-reduce. This is exact and brute-force.
- **(b)** Coverage-preserving alpha mips: rescale each mip so its coverage at the cutoff matches mip 0. This also fixes the runtime MASK mesh.

**Contract.**
- Keep native MASK as the historical contract.
- Record the foliage coverage mode (`mask` / `mask-lod0` / `hash-object`) in the manifest and include it in the version check, so existing byte audits stay valid.
- Make `alphaHash` opt-in at runtime.

**Handoff.** The mesh-to-impostor handoff must compare against whichever mode the near mesh actually uses. Otherwise canopy density visibly steps at the switch.

## Suggested order

1. Premultiply (in the baker and loader).
2. Marched parallax and depth-sign unit test.
3. `hitDistance` and hash fixes.
4. Debug channels, held-out 17×17 harness and ground-truth reference.
5. Only then decide 9×9, hemi-octahedral or 17×17, and the foliage bake mode.