---
id: T24
key: DET-TRANSCENDENTAL
title: "[T24] DET-TRANSCENDENTAL: no raw Math.* in existence decisions"
repo: universe-atlas
labels: ["type:task", "area:determinism", "agent:opus", "resource:none", "size:M-L", "round:C", "needs:owner"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P3
backlog_rank: 24
round: C
size: M-L
resource: none
depends_on:
  - "T08"
soft_depends_on: []
merge_after:
  - "T13"
merge_note: "If the crater-grid site is in src/terrain.ts it is a separate hunk from T13 (colour section); merge after T13"
external_depends:
  - "owner versioning decision (via T01) before any change that moves catalogue addresses"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/catalog.ts, src/surface-biomes.ts (:106 slope line), src/planet-population.ts, src/surface-cell.ts (sort comparator)"
  - "terrain crater grid: exact file/hunk named at claim (src/planet-craters.ts, or the planetSurface crater hunk of src/terrain.ts)"
  - "src/det-math.ts"
  - "tests/acceptance/version-compat.test.mjs"
acceptance:
  - "Perturbation test covers galaxy positions and these gates with 0 decision flips"
  - "Any version bump recorded in version-compat with a bookmark compatibility note"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §24"
---
Raw transcendentals decide existence in catalog.ts:205,207,383, surface-biomes.ts:106, planet-population.ts:28,55, the terrain crater grid and the surface-cell.ts comparator; hypotDet is unused there. Catalogue changes may move addresses (owner versioning decision).
