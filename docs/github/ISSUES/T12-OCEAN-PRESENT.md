---
id: T12
key: OCEAN-PRESENT
title: "[T12] OCEAN-PRESENT: seabed reads as underwater, far waves fade, ocean skirts"
repo: universe-atlas
labels: ["type:task", "area:ocean", "agent:opus", "visual:luna", "resource:gpu", "size:M", "round:B", "needs:owner"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P2
backlog_rank: 12
round: B
size: M
resource: gpu
depends_on: []
soft_depends_on:
  - "T01"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/ocean-present (base b7d1df3), 2026-10-04"
owned_files:
  - "src/ocean-gerstner.ts, src/ocean-water-material.ts, src/ocean-patch-culling.ts"
  - "src/planet-renderer.ts (ocean + underwater hunks; only planet-renderer writer in its round)"
  - "tests/ocean-seam-continuity.test.mjs"
acceptance:
  - "Node geometry test: 0 slivers at 2:1 edges"
  - "Wave amplitude-fade test passes"
  - "OCEAN_SURFACE_DETAIL_M = 2000 unchanged"
  - "Luna 3 asks on seabed approach frames, four worlds: \"reads as underwater\", all answers reported"
  - "Seabed geometry detail in scope only if the owner allows it (T01)"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §12"
---
Luna: "the seabed reads like dry ground". Waves alias at L8 and below (no distance fade); slivers at 2:1 tile edges (no ocean skirts). Seabed stays real ground at true depth.
