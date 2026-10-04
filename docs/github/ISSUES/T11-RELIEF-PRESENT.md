---
id: T11
key: RELIEF-PRESENT
title: "[T11] RELIEF-PRESENT: mountains that read as mountains"
repo: universe-atlas
labels: ["type:task", "area:terrain", "agent:opus", "visual:luna", "resource:gpu", "size:L", "round:B", "needs:owner"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P2
backlog_rank: 11
round: B
size: L
resource: gpu
depends_on:
  - "T01"
soft_depends_on:
  - "T07"
external_depends:
  - "owner answers on D1, D2 and the cloud deck (recorded via T01); no provisional default"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/relief-present (base b7d1df3), 2026-10-04"
owned_files:
  - "src/planet-landforms.ts, src/regional-landform.ts"
  - "src/terrain.ts (`ridges` hunk only; baseTerrainCore only with ELEVATION_IDENTITY re-pin + version bump)"
  - "src/planet-clouds.ts, src/volumetric-clouds.ts"
  - "capture pose files under test-results/"
  - "NOT src/planet-renderer.ts"
acceptance:
  - "Coastlines unchanged: 0 flips over 410,000 directions"
  - "Land p50/p90/p99 inside the relief owner band, or reported"
  - "Cloud top above p99 land on 4 worlds"
  - "Luna 3 asks per mountain frame, four worlds, all answers reported; PASS = 2 of 3 per frame"
  - "Golden terrain re-pinned by the coordinator; four engines match"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §11"
---
Luna failed 8/8 mountain frames: clouds hide the range, ridge "maze" from orbit, cloud tops below p99 land, horizon poses never re-posed sun-aware (D2). Needs owner answers on D1/D2 and the cloud deck.
