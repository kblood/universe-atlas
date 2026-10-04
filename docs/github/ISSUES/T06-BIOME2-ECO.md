---
id: T06
key: BIOME2-ECO
title: "[T06] BIOME2-ECO: eco-class table, assemblages and new Biome Lab biomes"
repo: universe-atlas
labels: ["type:task", "area:climate", "agent:opus", "visual:luna", "resource:gpu", "size:M", "round:A"]
owner_agent: opus
reviewer: astra
visual_judge: luna
priority: P1
backlog_rank: 6
round: A
size: M
resource: gpu
resource_note: "code CPU; 7 Biome Lab captures on GPU"
depends_on:
  - "T02"
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/biome2-eco (base b7d1df3), 2026-10-04"
owned_files:
  - "src/eco-class.ts, src/eco-assemblages.ts (new)"
  - "src/biome-ecology.ts (append-only)"
  - "src/biome-lab.ts, src/biome-lab.css"
  - "tests/eco-class.test.mjs, tests/eco-assemblages.test.mjs, tests/eco-identity-site.test.mjs, tests/biome-ecology.test.mjs"
  - "docs/eco-class-v1.md"
acceptance:
  - "Classes 0-13 reachable; monotone in temperature and moisture"
  - "groundLookOf continuous (<= 0.02 jump per 0.01 K)"
  - "Classes 0-11 each have a rendered fauna role and non-zero flora weight; negative test (role removed) fails"
  - "9 existing biome digests unchanged"
  - "Luna blind-ID verdict saved (exit 2 = visual check NOT done)"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §6"
---
One absolute Köppen/Whittaker class table driving colour, ground look, trees, understory and fauna roles; shared vocabulary for T13, T14, T15.
