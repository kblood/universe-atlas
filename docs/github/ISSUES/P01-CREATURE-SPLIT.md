---
id: P01
key: CREATURE-SPLIT
title: "[P01] CREATURE-SPLIT: packages/creature-kit + apps/creature-lab (or separate repo)"
repo: universe-atlas
labels: ["type:task", "area:creature-kit", "agent:opus", "resource:none", "size:L", "round:parked", "needs:owner"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P4
round: parked
size: L
resource: none
depends_on:
  - "T10"
soft_depends_on: []
external_depends:
  - "owner answers to the seven creature-extraction questions (name, licence, repo)"
also_touches: "IWSDK (tools/assetctl/fauna-revision.mjs)"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: parked
owned_files:
  - "TBD by the coordinator once the owner answers"
acceptance:
  - "Defined after the owner answers; boundary test stays green"
source: "IWSDK docs/atlas-backlog-2026-10-04.md Parked"
---
Decouple fauna-review-environment -> surface-lighting, creature-lab-state -> fauna-appearance, and assetctl fauna-revision writing into Atlas public/. See IWSDK docs/creature-kit-extraction-plan-2026-10-04.md.
