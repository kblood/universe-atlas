---
id: T16
key: PLACE-QUERY-2
title: "[T16] PLACE-QUERY-2: platform query surface and \"build a game on Atlas\" guide"
repo: universe-atlas
labels: ["type:task", "area:platform", "agent:opus", "resource:none", "size:M", "round:B"]
owner_agent: opus
co_owner: "sonnet (docs)"
reviewer: astra
visual_judge: none
priority: P2
backlog_rank: 16
round: B
size: M
resource: none
depends_on: []
soft_depends_on:
  - "T09"
external_depends: []
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: backlog
owned_files:
  - "src/place-query.ts, src/ocean-volume.ts"
  - "docs/place-query-v1.md (-> v2), docs/platform-getting-started.md (new)"
  - "tests/place-query.test.mjs"
  - "README \"Architecture and limits\" stale lines (coordinator applies)"
acceptance:
  - "place-query-2 versioned in the manifest"
  - "coastAt agrees with sign of dated sea level at 1000 points"
  - "Rung parameter returns the renderer's answer at that rung"
  - "Doc-test runs the getting-started example (address, date, placeAt)"
  - "Test asserts README version strings equal code constants"
  - "Doc final pass after T09 climate fields"
source: "IWSDK docs/atlas-backlog-2026-10-04.md §16"
---
versions.lodLadder is null (place-query.ts:59); no coast query or pressure altitude correction; nothing calls placeAt; no getting-started doc; README versions/claims stale.
