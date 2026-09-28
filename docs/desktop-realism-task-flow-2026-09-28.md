# Desktop realism: task ownership and execution flow

Updated 2026-09-28 following the user's request to reduce token use and give
Luna more work and Claude Code / Opus 5.5 full implementation tasks.

The scope and acceptance requirements remain in
[the implementation plan](desktop-realism-implementation-plan-2026-09-27.md).
This document changes execution ownership, not the product goal.

## Ownership

| Owner | Responsibility | Expected handoff |
| --- | --- | --- |
| Luna 6 implementation | Bounded fixes, asset adapters, instrumentation, UI integration, documentation and ordinary regression fixes | Committed implementation with focused checks and remaining limits |
| Claude Code, Opus 5.5 | Substantial coupled implementation: rendering transitions, procedural geometry architecture, or rigged fauna | Design choices implemented and committed, with tests and normal-game evidence |
| Luna 6 acceptance | Independent acceptance, reproducible failures, routine fixes, build/package checks, committed deployments and live checks | Concise pass/fail receipt tied to an exact revision |
| Parent coordinator | Product priorities, resource conflicts, integration and decisions that cross task boundaries | Integration decision and user-facing milestone status |

Opus assignments are implementation jobs, not recurring review-only requests.
Verify the actual Claude model from run metadata; never substitute another
model while retaining the Opus label. Luna can complete ordinary fixes without
returning every decision to the parent.

## Current assignments

1. **Luna guide + acceptance:** finish the bounded published-guide link fix on
   main, commit, build, publish, and validate the deployed revision. Keep
   experimental rendering changes out of this website-only release.
2. **Claude Code / Opus 5.5, supervised and tested by Luna:** own the current
   Oak/Pine forest milestone from implementation through local acceptance in
   an isolated worktree. Improve coherent species presentation, bounded
   deterministic structural variants and near/middle/far transitions during
   normal low flight and walking. Choose rendering techniques from evidence;
   the captured diffuse-transfer experiment is optional, not prescribed.
3. **Following forest integration:** Luna owns bounded ground-material,
   undergrowth, asset-adapter and instrumentation tasks with separate file
   ownership. Opus owns the coupled genome-compatible rig/animation task.
   Assign concrete briefs before starting these queued jobs; they are not
   currently claimed as running or complete.

## Task flow

1. Write one bounded brief: product outcome, starting revision, owned paths,
   invariants, acceptance route and evidence required. Send file references
   rather than the full conversation or accumulated raw logs.
2. Give the implementer a dedicated worktree for a substantial task. Allow
   implementation decisions, focused tests and staged commits. Avoid parallel
   agents editing the same files or sharing an index.
3. Let the implementer fix its own routine failures. Escalate only an actual
   scope decision, incompatible invariant or unresolved technical blocker.
4. Luna independently checks the resulting revision. Reuse existing fixtures;
   add coverage for changed behavior. Failed acceptance returns a reproducible
   case to the implementer, not another broad research assignment.
5. Integrate the committed result, then let Luna build and deploy the committed
   release and check the live site. Preserve the distinction between local
   experiments, accepted implementation and published behavior.
6. Update the plan and guide once per meaningful accepted stage. Historical
   reports retain the status of the revision they describe.

## Limits on coordination cost

- One implementation owner and one acceptance owner per milestone. Do not have
  the parent independently repeat the same source audit or test run.
- Prefer existing agents and concise task briefs. Reports should normally fit
  within 15 lines: outcome, commit, checks/evidence, remaining gaps and any
  decision needed. Keep raw output in files.
- Report substantive checkpoints or blockers, not frequent intent messages.
  Poll a known live process; do not relaunch because a wait timed out.
- Keep the active team small. Serialize GPU generation and browser performance
  measurements; coordinate ownership directly between workers. A CPU build
  must not overlap a timing window used for a performance claim.
- Review architecture at consequential boundaries. Do not request a new Opus
  review for every small patch or successful focused test.
- Prefer normal-game acceptance over further isolated visual experiments.
  An experiment must resolve a specific implementation decision before another
  experiment is launched.

## Forest milestone invariants and evidence

Preserve canonical individuals, positions, heights, yaw, dated species and
existence rules. Species presentation and structural variation must be derived
from stable identities and must not introduce a second population catalogue.
Keep roots, bounds, shadows, depth and aerial perspective consistent across
representations. Structural variation changes geometry, not just tint.

Require bounded cache and instancing behavior, deterministic date replay,
normal flight/walking transitions, clear-weather screenshots and measured
frame/resource costs. A shader compilation check or one-tree lab result alone
does not establish forest acceptance. The full plan's terrain, fauna, desktop
performance and later Quest work remain open until separately verified.
