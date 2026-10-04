---
id: T07
key: TRANSITION-AUDIT
title: "[T07] TRANSITION-AUDIT: smooth-transition audit (Astra brief Task B), no fixes"
repo: universe-atlas
labels: ["type:task", "area:rendering", "agent:astra", "visual:luna", "resource:gpu", "size:M", "round:B"]
owner_agent: astra
reviewer: opus
visual_judge: luna
priority: P1
backlog_rank: 7
round: B
size: M
resource: gpu
resource_note: "CPU probes; one GPU batch for before renders"
depends_on: []
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "docs/smooth-transition-audit-2026-10.md (new)"
  - "test-results/finish-round-2026-10-04/TRANSITION-AUDIT/"
acceptance:
  - "Covers every transition listed in the brief (tile levels, fauna/tree near-far ~80/95 m, impostors, census->instance, snowline, treeline, beach, climate bands, day/night, seasons, terminator, haze, shadows, creature gait/morph)"
  - "Each entry: blend width, measured discontinuity, proposed smoothing, regression test"
  - "Ranked list"
  - "Luna 3 asks per disputed frame, all answers reported"
  - "No fixes in this task"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §7"
---
Owner concern that transitions pop or look angular. Decides the order of T12, T13, T23; runs before anyone smooths anything. Astra is read-only for inventory and probes.
