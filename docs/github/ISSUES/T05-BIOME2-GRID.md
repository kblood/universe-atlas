---
id: T05
key: BIOME2-GRID
title: "[T05] BIOME2-GRID: per-body climate grid as a pure module"
repo: universe-atlas
labels: ["type:task", "area:climate", "agent:astra", "resource:none", "size:M", "round:A"]
owner_agent: astra
reviewer: opus
visual_judge: none
priority: P1
backlog_rank: 5
round: A
size: M
resource: none
depends_on:
  - "T02"
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/climate-grid.ts (new)"
  - "tests/climate-grid.test.mjs (new)"
  - "docs/planet-geophysics-v1.md (appended grid section only) or docs/climate-grid-v1.md (new)"
acceptance:
  - "Aquaplanet gives precipMul 1 everywhere"
  - "Leeward of a 3 km ridge <= 0.6x windward precipitation"
  - "Face-edge seams differ <= 1e-3; builds bit-identical"
  - "No raw Math.* transcendentals (source grep)"
  - "Build <= 2 ms mean / 5 ms cold; sample <= 30 ns, zero allocation; grid <= 64 KB"
  - "npm test and golden unchanged"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §5"
---
Continentality and plateau-scale rain shadow; climate v2 M2 is blocked on it. Pure and unwired, so no digest moves. Astra implements (workspace-write); Opus reviews, runs checks, commits.
