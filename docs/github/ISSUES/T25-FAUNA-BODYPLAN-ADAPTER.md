---
id: T25
key: FAUNA-BODYPLAN-ADAPTER
title: "[T25] FAUNA-BODYPLAN-ADAPTER: composer body plans on planets"
repo: universe-atlas
labels: ["type:task", "area:fauna", "agent:opus", "visual:luna", "resource:gpu", "size:L", "round:queued"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P3
backlog_rank: 25
round: queued
size: L
resource: gpu
depends_on:
  - "T15"
  - "T10"
  - "T17"
soft_depends_on: []
external_depends:
  - "creature-boundary test stays green"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/fauna-composer-adapter.ts (new)"
  - "src/fauna-runtime.ts, src/fauna-field-renderer.ts (opt-in adapter path only)"
  - "tests/fauna-composer-adapter.test.mjs"
acceptance:
  - "Flag off by default: life-cpu-digest unchanged"
  - "Flag on: pinned corpus maps every living species to a coherent recipe, deterministically"
  - "Near/far handoff keeps far-form colour within the existing channel-error bound"
  - "Luna 3 asks on herds from two planets"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §25"
---
Planet fauna use one quadruped body plan; the composer (wings, shells, many legs, trunks) is unused on planets. Needs a species -> composer-recipe adapter with LOD.
