---
id: T03
key: HARNESS-RERUN
title: "[T03] HARNESS-RERUN: run the browser harnesses the relief re-pin moved; fix desktop-perf S4"
repo: universe-atlas
labels: ["type:task", "area:tests", "agent:astra", "resource:gpu", "size:S-M", "round:A"]
owner_agent: astra
reviewer: opus
visual_judge: none
priority: P1
backlog_rank: 3
round: A
size: S-M
resource: gpu
depends_on: []
soft_depends_on: []
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: "in flight on round2/harness-rerun (base b7d1df3), 2026-10-04"
owned_files:
  - "tests/desktop-perf.browser.mjs"
  - "tests/rock-acceptance.browser.mjs, tests/canopy-water-date-seek.browser.mjs, scripts/render-probe.browser.mjs, tests/surface.mjs (fixture fixes only)"
acceptance:
  - "Each harness has a recorded exit code on an identified clean commit"
  - "S4 fails on wrong date/water bucket; negative case shown"
  - "Failures fixed or entered in tests/known-failures.json with an owner"
  - "Perf numbers labelled \"contended\" unless from T20"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §3"
---
Relief OPEN items 11 and 13: five harnesses not run after the re-pin; desktop-perf S4 does not assert date/water bucket after each seek.
