---
id: T10
key: CREATURE-EXPORT
title: "[T10] CREATURE-EXPORT: headless creature creation and GLB export"
repo: universe-atlas
labels: ["type:task", "area:creature-kit", "agent:opus", "resource:none", "size:L", "round:A"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P2
backlog_rank: 10
round: A
size: L
resource: none
depends_on: []
soft_depends_on: []
external_depends:
  - "EC4 merge (eye-round/EC4 a633587)"
  - "creature-boundary test (merged at b7d1df3)"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/fauna-composer-export.ts (new)"
  - "scripts/export-creature.mjs (new)"
  - "tests/fauna-composer-export.test.mjs (new)"
  - "docs/creature-export-v1.md"
acceptance:
  - "Node CLI exports N species to GLB with a provenance sidecar"
  - "`assetctl validate` and `assetctl package` pass on the output"
  - "Clips baked at time t match poseComposer within epsilon"
  - "Second export byte-identical"
  - "No Atlas import in the export path; boundary test stays green"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §10"
---
Creature Lab is not yet its own product: no GLTFExporter, no baked AnimationClip, no exportCreatureGlb. Without export other games cannot use the creatures.
