---
id: T23
key: LOD-HORIZON
title: "[T23] LOD-HORIZON: distant mountains from tile metadata"
repo: universe-atlas
labels: ["type:task", "area:rendering", "agent:opus", "visual:luna", "resource:gpu", "size:L", "round:queued"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P3
backlog_rank: 23
round: queued
size: L
resource: gpu
depends_on:
  - "T07"
  - "T13"
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/planet-renderer.ts (tile-selection hunks)"
  - "src/planet-tiles.ts, src/lod-ladder.ts"
  - "tests/lod-consistency.test.mjs, tests/tile-metadata.test.mjs"
acceptance:
  - "Renderer selects rungs through levelForPose"
  - "Horizon summit within agreed tolerance of S4 truth at 20 poses"
  - "L6 colour ceiling in the test lowered toward 12"
  - "Luna reads the same range from orbit, flight, ground (3 asks)"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §23"
---
planet-tiles.ts writes 64 B of metadata per tile (summit, snowline, treeline) the renderer never reads; levelForPose has no runtime caller; L6 colour p99 ceiling 33.8 vs target 12.
