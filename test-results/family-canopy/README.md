# Family canopy shader checks

These are isolated actual-package loader and analytic shader checks on an RTX
5090, ANGLE D3D11, 1000 × 700 canvas with logarithmic depth and antialiasing.
They do not prove full-game appearance, distance continuity or performance.

`shader-smoke.mjs` loads the shipped Oak/Pine GLBs and offline foliage sidecars
through `ForestAssetSource`, derives their profiles through the real GLTFLoader,
then compiles and draws both family proxies in one mesh. No source image or GLB
is modified. This is a dev-server check, not a deployed-build receipt.

- `shader-fbe3c26/report.json`: actual loading fails because the first profile
  helper assumes tightly packed arrays for interleaved GLTF attributes.
- `shader-stride-fix/report.json`: after fixing attribute stride, the GPU rejects
  the cone base-plane expression `1-dot(...)` because `1` is an integer literal.
  Its image is a failed draw; no success is claimed.
- `shader-stride-glsl-fix/report.json`: development fix passes with GL error zero
  and no browser errors. This initial report has only the original HEAD, not
  source hashes, so use the next committed-source run as the success evidence.
- `shader-ee26efa/report.json` and `families.png`: committed browser-fix source,
  exact runtime file SHA-256 values, package family profiles/colors, successful
  shader compilation and GL/browser error checks. The source hash list removes
  ambiguity from unrelated concurrent documentation edits in the worktree.
- `browser-fixes-cpu.log`: nine focused profile/shader regression checks pass.

The proxy image shows stacked smooth broadleaf bands and solid conifer cones.
It is an implementation check, not visual acceptance. Matching the actual middle
LOD's holes and branches, full-game handoff, measured overdraw and realistic
forest appearance remain open.
