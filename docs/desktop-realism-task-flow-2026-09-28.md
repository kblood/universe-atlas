# Desktop realism: task ownership and execution flow

Updated 2026-09-28 following the user's request to reduce token use and give
Luna more work and Claude Code / Opus 5.5 full implementation tasks.

**Latest routing instruction:** the user switched the coordinating thread to
Luna. All main implementation milestones go to Astra or genuine Claude Code /
Opus 5.5. Luna coordinates and handles routine testing, deployment, guide/docs
and bounded harness maintenance. Existing Opus jobs continue without restart.

The scope and acceptance requirements remain in
[the implementation plan](desktop-realism-implementation-plan-2026-09-27.md).
This document changes execution ownership, not the product goal.

## Ownership

| Owner | Responsibility | Expected handoff |
| --- | --- | --- |
| Luna 6 support | Routine test harnesses, documentation, deployment preparation and mechanical follow-ups | Scoped commit or reproducible evidence with remaining limits |
| Astra or Claude Code, Opus 5.5 | All main implementation milestones, including rendering transitions, procedural geometry architecture and rigged fauna | Design choices implemented and committed, with tests and normal-game evidence |
| Luna 6 acceptance | Independent acceptance, reproducible failures, routine fixes, build/package checks, committed deployments and live checks | Concise pass/fail receipt tied to an exact revision |
| Luna parent coordinator | Product priorities, resource conflicts, integration and delegation across task boundaries | Integration decision and user-facing milestone status |

Main milestones are delegated to Astra or Opus as complete implementation jobs.
Opus assignments are not recurring review-only requests.
Verify the actual Claude model from run metadata; never substitute another
model while retaining the Opus label. Luna can complete ordinary fixes without
returning every decision to the parent.

## Current assignments

1. **Luna acceptance:** review clean runtime `a755f1b` in the ordinary game:
   individual fauna rig handoff and pose, matched understory/detail-tree views,
   then isolated performance sampling. The published runtime remains the
   rivers-disabled `4796b1a`; later candidates require committed deployment
   and live checks.
2. **Claude Code / Opus 5.5, supervised by Luna:** implement ordinary procedural
   rocks and species-based physical tree dimensions in separate worktrees.
   Both are complete implementation assignments with focused tests and staged
   commits; browser/GPU work remains serialized after their handoffs.
3. **Luna implementation:** bounded correctness fixes and performance-review
   tooling. Corrected forest resource estimates are integrated. The confirmed
   flower/tree stem winding fix is committed separately, awaiting integration.
4. **Luna guide:** keep guide/plan claims tied to deployed or locally verified
   revisions, review the shared acceptance images, and supervise genuine Opus
   jobs and their model receipts. The procedural understory implementation is
   integrated, with visual acceptance pending.

## Task flow

1. Write one bounded brief: product outcome, starting revision, owned paths,
   invariants, acceptance route and evidence required. Send file references
   rather than the full conversation or accumulated raw logs.
2. Give the implementer a dedicated worktree for a substantial task. Allow
   implementation decisions, focused tests and staged commits. Avoid parallel
   agents editing the same files or sharing an index.
   Dependency directories must also be isolated if the worker may install or
   repair packages. Before `npm ci`, installation or cleanup, resolve
   `node_modules` and check for junctions/symlinks. Never mutate dependencies
   through a link to another worktree. Remove only the link itself using an
   appropriate nonrecursive operation, then install locally from the lockfile.
   Do not kill another worktree's dev server to unlock shared dependencies.
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
- Capture test commands, revisions, exit status and output as the run starts;
  save browser state before screenshots and use distinct attempt directories.
  If output was truncated, record that limit rather than reconstruct a raw log
  or rerun a completed suite solely for archival completeness.
- Keep the active team small. Serialize GPU generation and browser performance
  measurements; coordinate ownership directly between workers. A CPU build
  must not overlap a timing window used for a performance claim.
- Review architecture at consequential boundaries. Do not request a new Opus
  review for every small patch or successful focused test.
- Prefer normal-game acceptance over further isolated visual experiments.
  An experiment must resolve a specific implementation decision before another
  experiment is launched.

## Browser checks that avoid repeated setup

- Start from a previously rendered seed, body, date and surface address. Do not
  scan thousands of new landing sites just to check a shader. Broader habitat
  searches belong to coverage testing after the basic route works.
- Save the selected canonical identity, position and exact date before travel.
  Exploration advances time by default: freeze it before readiness waits when
  testing replay, and assert the restored date, navigation mode and camera pose.
  A walking-to-flight transition is a separate navigation result, not proof of
  a changed population.
- Record the phase and a small state snapshot before long waits, then periodically
  while waiting. Split readiness conditions so a missing animal cannot be
  reported as a failure to become grounded. Keep full diagnostic dumps in files.
- Capture useful state and images before optional panel collapse or screenshot
  cleanup. A blocked cosmetic click must not discard substantive test evidence.
  Check that the target is large enough and actually in frame before calling an
  image a close-up.
- Distinguish the canonical population, resident data and submitted draws.
  `faunaDrawn` is filtered by distance and camera/shadow visibility; absence from
  that list alone does not establish disappearance. Terrain `maxLevel` describes
  visible tiles, so contact failures also need frontier and contact-gate state.
- Reserve the GPU for active browser/capture work. Ordinary CPU work can overlap
  visual checks; isolate both CPU and GPU load for performance measurements.
  Release the slot explicitly when a run ends or switches to source diagnosis.

## Forest milestone invariants and evidence

Preserve canonical individuals, positions, yaw, dated species and existence
rules. The existing canonical height proxy remains a stable source datum;
the new physical-scale milestone intentionally derives rendered dimensions
from species recipes under an explicit presentation version. Near and far
representations must agree on those dimensions. Species presentation and structural variation must be derived
from stable identities and must not introduce a second population catalogue.
Keep roots, bounds, shadows, depth and aerial perspective consistent across
representations. Structural variation changes geometry, not just tint.

Require bounded cache and instancing behavior, deterministic date replay,
normal flight/walking transitions, clear-weather screenshots and measured
frame/resource costs. A shader compilation check or one-tree lab result alone
does not establish forest acceptance. The full plan's terrain, fauna, desktop
performance and later Quest work remain open until separately verified.
