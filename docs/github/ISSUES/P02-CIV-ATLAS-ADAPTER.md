---
id: P02
key: CIV-ATLAS-ADAPTER
title: "[P02] CIV-ATLAS-ADAPTER: one-way read-only Atlas interface for Civilization Lab"
repo: civilization-lab
labels: ["type:task", "area:platform", "agent:opus", "resource:none", "size:M", "round:parked"]
owner_agent: opus
co_owner: "astra"
reviewer: astra
visual_judge: none
priority: P4
round: parked
size: M
resource: none
depends_on:
  - "T16"
soft_depends_on: []
external_depends:
  - "Civilization Lab M3"
base_commit: TBD  # coordinator fills `git rev-parse main` at claim
branch: TBD  # work/<id>-<slug>, one writer
status_at_draft: parked
owned_files:
  - "civilization-lab: interface doc + stub contract test (paths TBD)"
acceptance:
  - "Interface doc reviewed by Astra"
  - "Stub contract test runs in civilization-lab"
  - "No Atlas file changed"
source: "IWSDK docs/atlas-backlog-2026-10-04.md Parked"
---
Address, date, habitability, climate, resource proxies and travel distances. Interface document plus a stub contract test in civilization-lab; nothing changes in Atlas yet.
