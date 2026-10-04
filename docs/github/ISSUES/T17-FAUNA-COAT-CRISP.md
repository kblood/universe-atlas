---
id: T17
key: FAUNA-COAT-CRISP
title: "[T17] FAUNA-COAT-CRISP: crisp coat patterns and EC4 leftover surface defects"
repo: universe-atlas
labels: ["type:task", "area:fauna", "agent:opus", "visual:luna", "resource:gpu", "size:M", "round:B"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P3
backlog_rank: 17
round: B
size: M
resource: gpu
depends_on:
  - "T10"
soft_depends_on: []
external_depends:
  - "EC4 merge"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/fauna-composer.ts (material/shader path)"
  - "src/fauna-composer-mesh.ts, src/fauna-coat-fields.ts"
  - "src/fauna-coat-vocab.ts (append-only)"
  - "composer tests"
acceptance:
  - "Pattern scale has a measurable effect on small bodies (CPU pattern-frequency test)"
  - "Dichromatic species differ by sex in a pinned colour metric"
  - "Composer budget kept (soft 70k / hard 80k tris)"
  - "Luna 3 fixed asks per specimen on a fixed image set, 2 of 3 per criterion; \"cannot tell\" stays unverified"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §17"
---
Vertex colours blur reticulation and small spots; no sexual dichromatism; neck-to-head ring crease; EC4 dotted seam, trunk faceting, capped centipede tip.
