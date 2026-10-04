---
id: T04
key: LANDING-FIXES
title: "[T04] LANDING-FIXES: landing never on a summit; flooded bookmarks"
repo: universe-atlas
labels: ["type:task", "area:rendering", "agent:opus", "resource:gpu", "size:S", "round:A", "needs:owner"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P1
backlog_rank: 4
round: A
size: S
resource: gpu
resource_note: "CPU tests; one GPU browser check at the end"
depends_on: []
soft_depends_on:
  - "T01"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/landing-fixes (base b7d1df3), 2026-10-04"
owned_files:
  - "src/main.ts (prepareLanding + landing-site pick hunks only)"
  - "src/lod-ladder.ts (landing ceiling helpers only)"
  - "tests/render-bounds.test.mjs (the two todo cases only)"
  - "tests/landing-site.test.mjs (new)"
acceptance:
  - "Both todo tests become real asserts: 0/256 summit picks on four worlds at datum and dated low sea"
  - "Low-relief and dated-sea cases included"
  - "Flooded bookmark resolves deterministically to the documented behaviour (owner option from T01, else recommended option behind a named constant); pinned by a test"
  - "Browser check lands at a fixed bookmark"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §4"
---
Relief OPEN items 6 and 12: summit picks at the datum sea on four worlds; ground bookmarks now under the sea land elsewhere. Owner kept the ceiling formula.
