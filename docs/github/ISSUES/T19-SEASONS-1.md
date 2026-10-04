---
id: T19
key: SEASONS-1
title: "[T19] SEASONS-1: consume atlas-season-1 for presentation"
repo: universe-atlas
labels: ["type:task", "area:rendering", "agent:opus", "visual:luna", "resource:gpu", "size:M", "round:queued"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P3
backlog_rank: 19
round: queued
size: M
resource: gpu
depends_on:
  - "T09"
  - "T13"
  - "T14"
  - "T15"
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/season.ts"
  - "src/ground-material.ts, src/forest-presentation.ts (season uniform hunks)"
  - "src/flora-field.ts (tint hook)"
  - "tests/season-presentation.test.mjs (new)"
acceptance:
  - "Seek-independence: direct and stepped seek give identical presentation"
  - "life-cpu-digest unchanged (presentation only)"
  - "Same place in two seasons differs in snow and foliage; Luna 3 asks confirms a season change, not a bug"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §19"
---
season.ts exists but nothing calls it. Seasonal snow, foliage tint and daylight; presence and kind stay on annual fields.
