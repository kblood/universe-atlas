# Family canopy visual decision — 2026-09-28

## Decision

Stop iterating on the four-band ellipsoid/cone far-canopy shape as the route to desktop forest realism. The next visual prototype should reuse the existing full-sphere capture pipeline with the actual family LOD1 meshes and their foliage sidecars. Keep it in the lab until it passes a matched visual gate; this is a direction for the next experiment, not approval to integrate it into the planet renderer.

The ee26efa game screenshot shows thin, open middle-distance trees followed by a conspicuous ring of brighter, solid Oak lobes and dark Pine cones. The isolated proxy image has no canopy porosity. These images predate the 0e6e346 bounds, AA, sidecar eligibility, family validation and retag-cursor fixes. Those fixes improve safety and bounds, but do not change the proxy's solid band representation. The game run also stopped at a hidden date-control click; browser errors were empty, but it did not complete acceptance. The isolated shader report was dirty and only claims a successful family-shader compile/render.

The source review established conservative profile and lifecycle logic, but could not establish visual matching. The later visual review concluded that radius, colour or aggregate coverage calibration cannot reproduce per-view crown gaps and Pine sparsity. That conclusion is consistent with the screenshots; it is not a quantitative comparison across matched meshes.

## Smallest useful next gate

Use the packaged desktop Oak and Pine LOD1 GLBs, their foliage sidecars, and the game's MASK material settings. Capture the 16 m family at rest using the existing 9×9 full-sphere contract at 128 px with 4× supersampling. Compare:

1. the LOD1 mesh rendered at 1024 px and area-reduced to the 33 px target, with a 512 px convergence check;
2. the native LOD1 mesh at 33 px, representing the handoff partner;
3. the captured impostor;
4. the 0e6e346 analytic proxy and a lab-only radius/colour-fitted upper bound.

Render at 600 m, 1440 vertical pixels and 60° vertical FOV (approximately 33 px for a 16 m tree), for one captured equatorial axis and one intermediate direction such as [1, 0.3, 1]. Keep date, rest pose, light, background and tone mapping fixed. Use the same LOD1 input for both the mesh reference and capture. Compare coverage ratio, one-pixel-blurred IoU, root offset, crown bounds, linear luminance mean/RMSE and median depth error on the covered intersection. Record capture memory and fetch count; defer GPU-cost conclusions until instanced integration exists.

The proposed capture gate is coverage within ±15%, blurred IoU ≥0.85 (or within 2× a measured reference noise floor), root offset ≤1 px, mean luminance within ±10%, median depth error ≤1 m, and no worse match to the native 33 px handoff mesh than the analytic proxy. These are proposed experiment thresholds, not established acceptance standards. Check 22 m only if 16 m passes, because the existing capture review identified missing leaf-class coverage at that height. Do not stretch a 16 m result into a claim about other height classes.

If the capture misses only at intermediate directions, repair its premultiplied filtering, depth selection/parallax and view blending before rejecting that path. Existing evidence reports about 0.7203 silhouette IoU for an intermediate direction at 128 px, so the capture system is also unproven. Earlier captures used a different authored asset; they are not evidence for the packaged Oak/Pine pair.

## Integration boundary and limits

If the lab passes, integrate the capture branch inside the existing `ForestImpostors` family path. Preserve canonical individual IDs, dates, height/yaw attributes, slot ownership, static instance buffers and current near/far ownership transitions. Keep the legacy and analytic fallbacks available during the comparison. First validate both species, intermediate-view quality and each supported height class; then measure upload, memory and GPU cost at representative population counts.

Neither review establishes realism acceptance, production readiness, or a frame-time gain. The source review is tied to fbe3c26; the visual follow-up compares older ee26efa screenshots against the corrected 0e6e346 source snapshot. The correction checkpoint was not visually rerun in the supplied images.

## Evidence

- [Source review](../test-results/opus-family-canopy-implementation/review.md) and raw prompt/response/source hashes in `test-results/opus-family-canopy-implementation/`.
- [Visual follow-up](../test-results/opus-family-canopy-implementation/visual-followup/review.md), including both source images, run records, source snapshot hashes, prompt and raw response.
- [Existing near/far assessment](opus-near-far-family-assessment-2026-09-28.md).
