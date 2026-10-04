---
id: T02
key: BIOME2-REPLAN
title: "[T02] BIOME2-REPLAN: re-baseline biome increment 2 on the relief terrain"
repo: universe-atlas
labels: ["type:task", "area:climate", "agent:opus", "resource:none", "size:S-M", "round:A"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P1
backlog_rank: 2
round: A
size: S-M
resource: none
depends_on: []
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/biome2-replan (base b7d1df3), 2026-10-04"
owned_files:
  - "docs/biome-climate-increment-2-plan-v2-2026-10-04.json (new)"
  - "test-results/finish-round-2026-10-04/BIOME2-REPLAN/ (scripts, numbers)"
acceptance:
  - "Every expectedOutcome/acceptance number re-measured on the base commit by a saved script (ELA, land snow per world, corpus, SITE_A class+height, Tw' > 316 K share, forest share)"
  - "P2 reduced to the climate grid"
  - "Per-package file ownership re-checked against main"
  - "Astra verdict saved; must-fix items closed or answered"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §2"
---
biome2-plan.json was measured on b0f3882, before relief; its expected outcomes no longer describe main and P2's geophysics half already shipped.
