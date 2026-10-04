---
id: T13
key: BIOME2-VISUAL
title: "[T13] BIOME2-VISUAL: eco palette, continuous groundLook, structured snow edge, range snow"
repo: universe-atlas
labels: ["type:task", "area:rendering", "agent:opus", "visual:luna", "resource:gpu", "size:M-L", "round:C"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P2
backlog_rank: 13
round: C
size: M-L
resource: gpu
depends_on:
  - "T09"
  - "T06"
soft_depends_on: []
merge_note: "Merge before T15 (planet-renderer.ts hunks) and before T24 if T24 touches src/terrain.ts"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/terrain.ts (colour section + palette only)"
  - "src/ground-material.ts, src/planet-tiles.ts"
  - "src/planet-renderer.ts (three ground hunks)"
  - "tests/terrain-climate-colour.test.mjs, tests/ground-climate-shader.test.mjs, tests/ground-pbr-material.test.mjs, tests/acceptance/climate-agreement.test.mjs"
acceptance:
  - "groundLook 0 reproduces today's fragment path"
  - "Texture bytes unchanged; attribute costs exactly 4 B/vertex"
  - "buildTile <= +3%"
  - "Luna blind ID >= 11/16 sites; range snow reads as snow"
  - "On Luna FAIL: at most two palette iterations, then escalate"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §13"
---
Orbit colour "heavily patchy"; weak range snow (D1); biomes indistinguishable at ground level. MATERIAL_VERSION is NOT bumped (it seeds the detail atlas).
