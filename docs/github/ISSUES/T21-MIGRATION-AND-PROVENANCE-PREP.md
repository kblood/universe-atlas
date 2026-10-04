---
id: T21
key: MIGRATION-AND-PROVENANCE-PREP
title: "[T21] MIGRATION-AND-PROVENANCE-PREP: GitHub/Pi preparation and the asset provenance gate"
repo: universe-atlas
labels: ["type:task", "area:migration", "agent:sonnet", "resource:none", "size:S-M", "round:A", "needs:owner"]
owner_agent: sonnet
reviewer: astra
visual_judge: none
priority: P3
backlog_rank: 21
round: A
size: S-M
resource: none
depends_on: []
soft_depends_on:
  - "T01"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/migration-prep (base b7d1df3), 2026-10-04"
owned_files:
  - "docs/migration-prep-2026-10.md (new)"
  - "tests/asset-provenance.test.mjs (new)"
  - "assets/briefs/ (sidecars)"
acceptance:
  - "Ref inventory (main, eye-round/EC4, biome-round/W2-C-FOREST-C2-held, both origin branches, every worktree) with ahead/behind and proposed disposition; nothing deleted"
  - "Largest-files report"
  - "Provenance test fails on any public/ GLB or texture lacking a sidecar or carrying NOASSERTION, except a dated allowlist"
  - "No push, no remote change, no issue created"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §21"
---
Rollout step 1 can be prepared now; upload needs explicit owner authorisation. Deer manifest and forest GLBs carry license NOASSERTION; tree-impostor-lab loads GLBs not in the repo; no LICENSE file.
