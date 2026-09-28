# Thin-leaf shader: independent Opus review

The real Claude CLI completed a source review using `claude-opus-5-5`
(`provider: firstParty`, success, 220,581 ms). Exact prompt, input hashes and
response are preserved in
[`test-results/opus-leaf-transmission-review/`](../test-results/opus-leaf-transmission-review/response.json).
The reviewed source was an uncommitted prototype based on `78f3df3`.
This was a source review, not an Opus browser or visual acceptance run.

## Findings and follow-up

Opus found the diffuse shader anchors, indirect-light order, opposite-facing
normal handling, rectangle LTC basis, cache-key composition and bounded tint
reasonable for a first experiment. It recommended the following changes or
explicit checks:

- **Normal-map grazing leak:** using a perturbed normal can classify incident
  light on the viewed side as transmission. Use the unperturbed, already
  wind-deformed/view-facing surface normal for transmission, while leaving
  reflection and specular normal mapping intact. Assign it before direct-light
  evaluation. This changes the initial prototype's normal choice.
- **Zero-factor comparison:** unchanged expressions are not proof of identical
  compiled arithmetic. Measure every pixel, report maximum absolute error,
  and use a declared tolerance. Report exact equality only if observed.
- **Rectangle-light fixture:** move the camera's perpendicular foot outside the
  central measurement window and retain finite/outlier checks. The host LTC
  normal/view singularity is inherited, not fixed by the leaf adapter.
- **Backlit self-shadowing:** compare a casting leaf with a non-casting leaf;
  check directional, point and spot blockers. Colour transmission still uses
  opaque shadow maps, so light cannot transmit through a succession of leaves.
- **Isolate specular:** add black base colour with nonzero specular intensity
  under direct and environment light. Vary transmission independently.
- **Integration:** verify the actual GLB is double-sided, nonmetallic and has no
  metalness map. Add an assertion to catch later replacement of the composed
  wind/lighting hook. Reject front-hemisphere AO maps in this initial scope.

The actual family-F foliage JSON was inspected after review: `doubleSided`
is true, `metallicFactor` is zero, there is no metallic-roughness texture, and
the material has a base-colour and normal map plus `KHR_materials_specular`.
It fits the proposed material guard. No source GLB was changed.

## Limits to retain

This is a base-colour-tinted approximation, not a glTF extension importer or
a complete extension implementation. Rectangle lights inherit the renderer's
lack of shadows. Environment diffuse retains the host's front-view specular
multiscatter attenuation. Uniform transmission adds opposite-hemisphere
lighting work; tree overdraw and full-scene performance must be measured.
The review does not approve canopy shape, distant LODs or game deployment.

Final implementation and test status belongs to the
[leaf transmission record](leaf-diffuse-transmission-2026-09-28.md). The raw
review input remains unchanged even when its recommendations are implemented.

## Follow-up source review

A second genuine `claude-opus-5-5` run completed successfully in 146,225 ms;
[response and input hashes](../test-results/opus-leaf-transmission-review/followup/response.json)
are retained separately. It inspected the corrected shader, calibration lab,
and optional tree-loader/lab integration. It found no remaining shader
correctness error and accepted the geometric-normal assignment order, AO
exclusion, cache/hook assertion and area camera offset for a bounded tree test.

It identified an inherited tree-lab shadow issue that must be tested:
`sun.shadow.normalBias = 0.035` offsets a card along its authored normal even
when the light hits its opposite side. That can make the card shadow its own
transmitted light. The proposed experiment uses zero normal bias and a small
depth bias for both baseline and transmission, then compares casting and
non-casting backlit leaves. The review's estimate of how many leaves are
affected is a source-level hypothesis, not a measured percentage.

The follow-up also suggested stricter option/dependency guards. Its select
round-trip concern was checked against the actual HTML: the values already
use `0.35` and `0.5`, matching the loader's string conversion. No select fix
was needed. Full-tree illumination, minification, LOD parity and planetary
performance remain separate acceptance work.
