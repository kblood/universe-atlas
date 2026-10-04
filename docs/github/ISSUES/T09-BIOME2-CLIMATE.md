---
id: T09
key: BIOME2-CLIMATE
title: "[T09] BIOME2-CLIMATE: surface-climate v2 (PDD snow, heat cap, PET moisture, ITCZ, grid wiring, classifier v3)"
repo: universe-atlas
labels: ["type:task", "area:climate", "agent:opus", "resource:none", "size:L", "round:B"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P2
backlog_rank: 9
round: B
size: L
resource: none
depends_on:
  - "T02"
soft_depends_on: []
staged_depends: "T05 for milestone M2, T06 for M3"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/surface-climate.ts, src/surface-biomes.ts"
  - "src/forest-habitat.ts (version line only)"
  - "climate tests listed in biome2 plan P1, incl. tests/climate-earth-reference.test.mjs (new)"
  - "docs/surface-climate-v2.md"
  - "TERRAIN_VERSION bump: coordinator at merge"
acceptance:
  - "Earth ELA bands: 45° 2.7-3.1 km, 60° 1.2-1.7 km, equator >= 4.45 km; negative v1 test fails"
  - "No forest where Tw' >= 316 K"
  - "surfaceClimate <= 150 ns, zero allocation"
  - "climate-seek-independence passes"
  - "life-cpu-digest, terrain-leaf-loop-digest, terrain-elevation-identity pass unmodified"
  - "SITE_A ring stays in classes {4,5,6} or STOP for an owner decision (never retune physics to fit)"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §9"
---
Snow keys on the annual mean; hot poles grow forest (Selawyn warmest month 376 K); moisture is isotropic noise with a fixed 0.0425 dry belt.
