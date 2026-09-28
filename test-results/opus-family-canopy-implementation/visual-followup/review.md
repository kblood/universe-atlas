# Opus 5.5 visual follow-up: family canopy vs captured impostors

- Model: claude-opus-5-5
- Provider: firstParty
- Run: b3c42e4b-e15c-4f43-90d7-773c725af5e2
- Duration: 140741 ms
- Source checkpoint reviewed: 0e6e346 (screenshots predate it)
- Screenshot build: ee26efa
- Prompt/input hashes: see inputs.json

> The reviewer reported that the earlier source review's Markdown file was absent and used its raw response.json instead. This follow-up still has the exact previous prompt/source snapshot referenced in inputs.json.

**Recommendation:** Calibrating the 4-band ellipsoid/cone proxy is not a credible route to the realism goal. The next prototype should reuse and repair the existing capture pipeline. That capture pipeline is not validated either, and a matched lab gate should decide before any game integration.

(`review.md` doesn't exist at the stated path, so I read the earlier review from `response.json` in the same directory.)

## What the screenshots show

**Game frame (ee26efa, 170 m clearance, middle ring all LOD1):**
- **Middle ring:** thin, open trees with ground visible through the crowns. Many Pines are nearly bare sticks; Oaks have small, speckled olive crowns.
- **Beyond a fairly sharp arc:** opaque, saturated green Oak "beehives" with 2–3 visible tiers and dark undersides, plus small solid dark cones for Pine. The far Oaks look much bulkier and brighter than nearby middle Oaks. The switch looks like a change of tree type, not a change of detail level.

**Isolated render:** smooth stacked ellipsoids for Oak and faceted 8-sided cone tiers for Pine. There is no porosity at all.

**Inference:** The 0e6e346 changes affect quad bounds, edge AA by about 1 px, eligibility, validation and the retag cursor. None of them change band radii, colour or solid fill, so this shape and coverage mismatch should persist; `family-canopy-2026-09-28.md` says the same. I can't measure the boundary distance from pixels; attributing it to the 550–600 m handoff band comes from the source.

## Why calibration isn't enough

A 16 m tree at 600 m is about 33 px, or roughly 0.5 m per pixel. The crown clumps, Pine whorl gaps and asymmetric band offsets (Oak band 0 sits at z ≈ −2.9 m) span 2–6 px, so they are visible at this size. That is also the handoff distance, where the partner is the real LOD1 mesh at the same pixel size.

Calibrating radius, colour or a uniform dither can match aggregate coverage and mean colour. It cannot reproduce per-view silhouette or gap structure, and Pine (4.6% texel coverage) is the worst case. A capture of the actual LOD1 mesh encodes that structure by construction; its problem is fidelity, not representability.

| | Analytic 4-band | Existing capture (v2) |
|---|---|---|
| 32 px silhouette and gaps | Solid envelope; can match only area | Encoded in capture. Known 0.7203 IoU is at 128 px, unblurred; the 32 px blurred value is unmeasured |
| Pine sparsity | Solid cones overfill | Follows the source's alpha, if captured with the game's sidecar material |
| Per-view shape | Rotationally smooth | 81 views, 3-view blend |
| ID, yaw, height, ownership, static slots | Existing | Can reuse the same quad, attributes, `parameters.z` code, ownership discard and log-depth hit |
| Height classes | Correct by construction (pivots scale, margin stays metric) | Needs measurement: at 22 m the leaves are metric, but a scaled 16 m capture enlarges them |
| Shader | 4 bands + trunk (cones ≈ 9 planes each) | About 15 fetches per fragment. View triangle and mip are chosen **per mesh on the CPU** (`tree-captured-impostor.ts:160-181`) and must move to per-instance GLSL |
| Memory | Under 200 B of uniforms per family | 28.3 MB per family per height class at 128 px; a 64 px interior would be about a quarter of that (arithmetic only) |

If adopted, the capture sampler would replace only the band loop inside `ForestImpostors`' family branch. Legacy code 0 and the analytic fallback stay, so this is not a third system.

## Smallest next visual gate (lab only, no planet integration)

1. **Source:** the packaged desktop-v1 `oak-lod1.glb` and `conifer-lod1.glb`, with their offline foliage sidecars and MASK, which is what the middle ring draws. Hash both. The v2 evidence came from the v7 authoring tree (`test-results/tree-impostor-v7-color-a`), so it doesn't count for these assets.
2. **Capture:** the unchanged v2 contract (9×9 full sphere, 128 px, 4× supersampling), exact 16 m, rest pose.
3. **Render:** 600 m, 1440 px, 60° vertical FOV (about 33 px). Use two views:
   - one captured equatorial axis;
   - the existing intermediate direction [1, 0.3, 1], at about 12° elevation. That is close to the roughly 16° look-down implied by the 170 m clearance (inference).

   Keep the same sun, date with wind at rest, background and `NoToneMapping` for every candidate.
4. **Candidates per family and view:**
   - **R:** the LOD1 mesh rendered at 1024 px and area-reduced to 33 px. Re-check convergence against 512 px.
   - **N:** the native 33 px LOD1 mesh with the recorded MSAA state. This is the actual handoff partner.
   - **C:** the capture.
   - **A:** the analytic proxy at 0e6e346.
   - **A\*:** the analytic proxy with lab-only radius and colour scales fitted to R in that view. This is an upper bound on what calibration can achieve.
5. **22 m second check, only if 16 m passes:** the scaled 16 m capture against the 22 m mesh (about 46 px). This height is justified because it is the recorded zero-leaf failure and the largest departure from uniform scaling under the metric-leaf rule. Skip 10 m.

**Metrics against R and N:**
- coverage ratio (sum of alpha);
- IoU at 0.5 after a σ = 1 px Gaussian blur;
- root offset in pixels;
- crown bounding-box width and height;
- linear luminance mean and RMSE;
- median depth error in metres on the intersection (mesh depth from readback).

Set a noise floor from R against itself with ±0.5° yaw jitter.

## Decision criterion (proposed, not accepted)

**Capture proceeds** to an instanced branch inside `ForestImpostors` if, for both families and both views, it meets all of these against R:
- coverage ratio within ±15%;
- blurred IoU ≥ 0.85, or within 2× the noise floor;
- root offset ≤ 1 px;
- luminance mean within ±10%;
- median depth error ≤ 1 m.

It must also be at least as close to N as A is.

**Calibration stays credible only if A\* meets the same thresholds.** If even the fitted A\* fails blurred IoU on Pine, no amount of tuning will fix it.

**If C fails only at the intermediate view through misregistration**, apply the reconstruction review's fixes 1–3 (premultiplied filtering, a marched parallax solve, max-weight depth) and rerun the identical gate before judging.

**Budget at this gate:** record texture bytes, fetches per fragment and quad pixel area only. GPU cost has to wait for the instanced step, measured at 3/192 trees and at census density.

## Limits

- Neither screenshot measures anything, and neither tests 0e6e346.
- The shader report is `dirty:true`, and the game run failed before date navigation.
- If N is itself much thinner than R, continuity at the switch and fidelity to the reference conflict. Report both. Moving the switch distance is an option, not a conclusion.
- Nothing here establishes realism acceptance, production readiness or a frame-time gain.
