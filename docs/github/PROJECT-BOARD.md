# Universe Atlas project board

Draft, 2026-10-04. One GitHub Project for Universe Atlas, drawing issues and
PRs from `universe-atlas` and the Atlas-related issues in `IWSDK`
(collaboration proposal, 2026-10-03). Nothing here exists on GitHub yet.

## States (Status field)

| State | Entry rule | Exit rule |
| --- | --- | --- |
| Backlog | issue drafted with owned files and acceptance | coordinator marks Ready |
| Ready | hard deps merged; owned files disjoint from every In progress task; resource and owner agent set | owner claims: base commit, branch, session recorded |
| In progress | one writer, one worktree | hand-off tier run, PR/hand-off file posted |
| Review | assigned reviewer (Astra by default) reviewing; Luna verdicts attached where required | reviewer `ready` and the merger has merged |
| Done | merged **and** acceptance met (visual/asset/device items included) | - |
| Blocked | waiting on an owner decision, external branch or another round; reason and blocker link required | blocker resolved -> back to Ready or In progress |

Blocked is not a parking lot for slow work: a stale In progress task is
reassigned explicitly by the coordinator.

## Fields

| Field | Type | Values |
| --- | --- | --- |
| Priority | single select | P1 (backlog rank 1-8), P2 (9-16), P3 (17-25), P4 (parked) |
| Area | single select | climate, terrain, ocean, fauna, forest, rendering, platform, determinism, tests, creature-kit, docs, migration |
| Release maturity | single select | design, implemented (merged, CPU tests), visually judged (Luna PASS), device verified (headset). Maturity is tracked here and in release tags, not in branches |
| Resource | single select | none, gpu, browser-lock, quiet-host |
| Owner agent | single select | opus, astra, luna, sonnet, owner |
| Reviewer | single select | astra, opus, owner, none |
| Round | single select | A, B, C, queued, parked (next rounds added by the coordinator) |
| Size | single select | S, S-M, M, M-L, L |
| Base commit | text | `git rev-parse main` at claim |
| Session / machine | text | agent session id and host |
| Last update | date | set at start, milestones, blockers, hand-off |

Projects custom fields are not set by `gh issue create`; the labels below
carry the same values so the board can be filled with `gh project item-edit`
or by hand after import.

## Labels

| Prefix | Labels | Meaning |
| --- | --- | --- |
| `type:` | task, bug, owner-decision | issue form used |
| `area:` | as the Area field | |
| `agent:` | opus, astra, sonnet, owner | owner agent |
| `visual:` | luna | acceptance needs a Luna verdict |
| `resource:` | none, gpu, browser-lock, quiet-host | lock needed |
| `size:` | S, S-M, M, M-L, L | |
| `round:` | A, B, C, queued, parked | |
| `needs:` | owner | depends on an owner answer (soft or hard) |

`scripts/github/post-issues.mjs --labels` prints the `gh label create`
commands for exactly the labels the drafts use.

## Issue draft format (`docs/github/ISSUES/<id>-<KEY>.md`)

Front matter (parsed by `scripts/github/post-issues.mjs`; `--check` validates),
then a one-paragraph "why". Keys: `id` (T01-T25 = backlog rank, P01-P03 =
parked), `key`, `title` (must start `[id] `), `repo`, `labels`, `owner_agent`,
optional `co_owner`, `reviewer`, `visual_judge`, `priority`, `backlog_rank`,
`round`, `size`, `resource`, optional `resource_note`, `depends_on` (hard),
`soft_depends_on` (work may start; a provisional default is allowed only
where the issue says so), optional `staged_depends`, `merge_after` and
`merge_note`, `external_depends`, `base_commit` (TBD until claim),
`branch`, `status_at_draft`, `owned_files`, `acceptance`, `source`.
Values are JSON-quoted strings or plain words; lists are `  - "item"`.

The detailed rationale stays in the backlog (`IWSDK docs/atlas-backlog-2026-10-04.md`);
drafts carry only what an owner needs to claim and finish the task.

## Status at drafting (2026-10-04)

Nine drafts are already in flight as `round2/*` worktrees at `b7d1df3`: T01,
T02, T03, T04, T06, T08, T11, T12, T21. Note T11 and T12 are round B in the
backlog but running in round 2. EC4 (`eye-round/EC4`, `a633587`) is held
outside this set; the creature-boundary test merged at `b7d1df3`, so T10 now
waits only on EC4.
