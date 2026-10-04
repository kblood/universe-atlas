---
id: T18
key: DEER-PARITY
title: "[T18] DEER-PARITY: deer template mapped onto composer slots, plus procedural antlers"
repo: universe-atlas
labels: ["type:task", "area:fauna", "agent:opus", "visual:luna", "resource:gpu", "size:M", "round:C"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P3
backlog_rank: 18
round: C
size: M
resource: gpu
depends_on:
  - "T17"
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/fauna-composer-face.ts (headgear rules), src/fauna-composer-face-geometry.ts"
  - "src/fauna-composer-antler.ts (new)"
  - "src/fauna-composer-recipe.ts (headgear enum only)"
  - "docs/fauna-deer-parity-audit-2026-10.md (new)"
  - "src/fauna-template*.ts read-only"
acceptance:
  - "Audit maps every deer template feature to a composer slot (built/partial/missing)"
  - "Antlers deterministic: tine count/spread from recipe; male-only option; seasonal-shed hook exposed, not driven"
  - "Old recipe links decode unchanged"
  - "Luna side-by-side deer template vs composer deer, 3 asks"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §18"
---
The only realistic animal is the Blender deer template; the composer has horns and casques but no antlers. Audit which deer features the composer lacks; antlers are the largest gap.
