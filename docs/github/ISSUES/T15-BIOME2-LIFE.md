---
id: T15
key: BIOME2-LIFE
title: "[T15] BIOME2-LIFE: fauna in every air-planet biome"
repo: universe-atlas
labels: ["type:task", "area:fauna", "agent:opus", "visual:luna", "resource:gpu", "size:M-L", "round:C"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P2
backlog_rank: 15
round: C
size: M-L
resource: gpu
depends_on:
  - "T09"
  - "T06"
soft_depends_on: []
merge_after:
  - "T13"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/fauna-runtime.ts, src/flora-field.ts (legacy branches kept verbatim)"
  - "src/planet-renderer.ts (drawFlora scratch hunk only)"
  - "src/fauna-habitat-pick.ts, src/fauna-ecotype.ts (new)"
  - "tests listed in biome2 plan P6"
acceptance:
  - "life-cpu-digest passes with no edit to the test, LIFE_FILES, SHARED_PRESENTATION_FILES or REFERENCE"
  - "Byte-for-byte legacy identity vs e6a0b39 for classes {4,5,6}"
  - "Every class covering >= 0.5% of land has a herd"
  - "Ecotype 0 gives identical ids"
  - "Luna 3 asks on tundra, ice margin, desert, savanna, boreal sites"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §15"
---
Snow, tundra, desert and savanna should host adapted animals (Bergmann/Allen/Gloger ecotypes from existing genome fields); understory follows eco class; Maithea mean land herd weight 0.27 -> >= 0.40.
