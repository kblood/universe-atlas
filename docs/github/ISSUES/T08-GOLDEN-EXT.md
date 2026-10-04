---
id: T08
key: GOLDEN-EXT
title: "[T08] GOLDEN-EXT: extend the cross-engine golden digests"
repo: universe-atlas
labels: ["type:task", "area:determinism", "agent:opus", "resource:browser-lock", "size:M", "round:A"]
owner_agent: opus
reviewer: astra
visual_judge: none
priority: P1
backlog_rank: 8
round: A
size: M
resource: browser-lock
resource_note: "headless browsers without WebGL; take the lock anyway"
depends_on: []
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/golden-ext (base b7d1df3), 2026-10-04"
owned_files:
  - "tests/golden/generator.ts"
  - "tests/golden/perturbation.test.mjs"
  - "tests/golden/run-cross-engine.mjs"
  - "tests/golden/golden.json (new sections only; coordinator regenerates)"
acceptance:
  - "New sections sit outside `combined`; existing keys byte-identical"
  - "Node, Chromium, Firefox, WebKit all MATCH"
  - "Perturbation test (1-ULP Math.* nudge) covers new sections and reports flip count; flips recorded as determinism findings"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §8"
---
Golden covers only catalogue, 60 terrain samples and history. Climate, biomes, geophysics, ocean-volume, place-query, census, rocks and the fauna composer have no cross-engine pin.
