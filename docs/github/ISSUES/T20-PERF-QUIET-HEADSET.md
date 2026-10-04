---
id: T20
key: PERF-QUIET-HEADSET
title: "[T20] PERF-QUIET-HEADSET: quiet-host performance and the headset validation gap"
repo: universe-atlas
labels: ["type:task", "area:tests", "agent:astra", "resource:quiet-host", "size:M", "round:B"]
owner_agent: astra
co_owner: "opus (Quest budget doc), owner (headset)"
reviewer: opus
visual_judge: none
priority: P3
backlog_rank: 20
round: B
size: M
resource: quiet-host
resource_note: "exclusive GPU, nothing else running; owner wears the headset"
depends_on: []
soft_depends_on: []
external_depends:
  - "end of round, nothing else running"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "docs/desktop-perf-* (new dated baseline)"
  - "docs/quest3-atlas-budget.md (new)"
  - "docs/headset-checklist-2026-10.md (new)"
acceptance:
  - "Per-system p95 ms on the idle machine vs the 16.7 ms floor, labelled with the proxy method"
  - "Walking and VR suites have recorded exit codes"
  - "Checklist lists orbit/flight/ground poses with a Quest frame-time field"
  - "Nothing labelled passed without a measurement"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §20"
---
Every perf number since relief is contended; the 3060-class floor exists only as proxy factors; no Quest budget; walking/VR suites and headset checks never run.
