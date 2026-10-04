---
id: T14
key: BIOME2-FOREST
title: "[T14] BIOME2-FOREST: habitat-suitability-2 and revival of the held C2 branch"
repo: universe-atlas
labels: ["type:task", "area:forest", "agent:opus", "visual:luna", "resource:gpu", "size:M", "round:C"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P2
backlog_rank: 14
round: C
size: M
resource: gpu
depends_on:
  - "T09"
  - "T06"
soft_depends_on: []
external_depends:
  - "held branch biome-round/W2-C-FOREST-C2-held (5f49777)"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/habitat-suitability.ts, src/forest-habitat.ts, src/tree-species-recipe.ts, src/forest-tree-catalogue.ts, src/forest-census.ts, src/planet-canopy.ts, src/planet-forest.ts, src/forest-presentation.ts"
  - "their tests (biome2 plan P5)"
acceptance:
  - "All-ones weights reproduce the legacy pick"
  - "Spire share in boreal/treeline cells >= 2.0x tropical, per planet with sample counts"
  - "planet-forest-frame-digest re-pinned deliberately, old/new pair recorded"
  - "life-cpu-digest unmodified"
  - "No tree where Tw' >= 316 K"
  - "Held branch retired only by its creator or the owner"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §14"
---
Oak/Pine mix does not follow climate. The held C2 branch has the validated recipe (2.78x) but keys on the old planet-relative climateCode. Includes krummholz scaling and savanna cover.
