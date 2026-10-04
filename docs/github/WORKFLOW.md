# Agent workflow: issue to merge

Draft, 2026-10-04. Applies to Universe Atlas and to Atlas-related work in the
IWSDK repository (`tools/assetctl`, `schemas/`). Until the GitHub migration
(see `MIGRATION-CHECKLIST.md`) the same steps run locally: the issue is the
draft in `docs/github/ISSUES/`, the PR is the hand-off file, and the
coordinator is the board.

## Roles

| Role | Who | Does | Does not |
| --- | --- | --- | --- |
| Coordinator | owner or a designated Opus session | moves issues to Ready, assigns owners, checks file ownership per round, keeps the board | write task code |
| Implementer | Opus (code/design), Astra (gpt-6-astra, where the issue says so), Sonnet (docs) | one task, one branch, one worktree | touch files outside the issue's owned files |
| Reviewer | Astra (gpt-6-astra), read-only by default | evidence review, adversarial probes, claim-vs-diff audit | re-run suites reported green on the same commit without a stated reason |
| Visual judge | Luna (gpt-6-luna) via `node scripts/luna-eyes.mjs` | blind ID, PASS/FAIL per frame, 3 asks per disputed frame | judge from a single ask |
| Research / docs | Sonnet; Astra for read-only web research | docs, mechanical changes, source-flagged research | edit `src/` |
| Merger | one session holding the merge lock | merges, the merge test tier, repins, version bumps, README, `known-failures.json` | merge two tasks without the full gate after the last one |
| Owner | Kasper | decisions, licence, upload authorisation, headset | |

## Parallelism rule (current)

**One worktree per writer, one owner per task, disjoint file ownership per
round.** This replaces the collaboration proposal's cap of two implementation
branches until the owner decides otherwise. A file shared inside one round is
split by named hunk in both issues, with a stated merge order (for example T13
before T15 in `planet-renderer.ts`). Package registration, golden repins,
version constants and README belong to the merger, never to a task.

## Life of a task

1. **Ready.** The coordinator checks: hard dependencies merged, owner-blocked
   parts have a recommended default, owned files disjoint from every other
   task In progress, resource named. Then it assigns `owner_agent`.
2. **Claim.** The owner writes in the issue (or the draft's front matter):
   base commit (`git rev-parse main`), branch, session, machine. One claim per
   task; a stale claim leads to contact or explicit reassignment, never to a
   second writer.
3. **Worktree.**
   `git -C C:/LLM/IWSDK/universe-atlas worktree add C:/LLM/IWSDK/universe-atlas-wt/<id-slug> -b work/<id>-<slug> main`.
   Round workflows may keep their existing prefix (`round2/<slug>`).
4. **Minimal test first.** Write or extend one test that pins exactly the
   changed behaviour: imports only the changed pure module, deterministic, no
   browser/GPU/timers, under 2 s.
5. **Work** in the working tier (below). Commit on the task branch after each
   tested step.
6. **Hand-off.** Run the hand-off tier once, write the hand-off file, open the
   PR (or hand the file to the coordinator before GitHub), move to Review.
7. **Review by Astra.** Read-only:
   `codex exec -m gpt-6-astra -s read-only --skip-git-repo-check --ephemeral -C <worktree> -o <answer.md> - < prompt.txt`.
   The verdict is `ready` or `fix-required` with numbered blockers. Fixer
   rounds: add a failing test per blocker first, fix only the blockers,
   re-capture only the named views. Up to 3 review rounds; round 2+ checks only
   the previous blockers and the new diff.
8. **Merge.** The merger takes the merge lock, merges sequentially (shared
   contracts first, dependants rebased and re-checked against that commit),
   runs the merge tier once after the last merge, applies repins and version
   bumps, releases the lock.
9. **Done** only when acceptance is met. A merge alone does not satisfy
   visual, asset or device acceptance; those stay open on the issue.
10. **Retire** the branch and worktree after merge (`git worktree remove`,
    `git branch -d`). Held branches are retired only by their creator or the
    owner.

## Locks (all `mkdir`-atomic directories)

| Lock | Path | Held for |
| --- | --- | --- |
| Merge lock | `C:/LLM/IWSDK/universe-atlas-wt/.main-merge-lock` | any git write on `main`; `rmdir` after |
| GPU/browser lock | `C:/LLM/IWSDK/.gpu-browser-lock` via `tests/helpers/gpu-lock.mjs` | each browser or capture batch; keep holds short, use `--only` |
| Test slot | `C:/LLM/IWSDK/.atlas-test-slot` via `tests/helpers/test-slot.mjs` | full or large test runs (`npm test`, `test:full`, `test:perf`) |

GPU-heavy generators and browsers are serialized per physical GPU across all
projects on the machine.

## Lean test tiers

From `IWSDK docs/agent-round-prompts-2026-10-03.md` (measured: ~50-64% of
agent-minutes were verification; reviewers re-running suites caught nothing).

| Tier | Who, when | Runs |
| --- | --- | --- |
| Working | implementer, inner loop | the minimal test (`--test-name-pattern` allowed); `npx tsc --noEmit` once per batch of edits and before each commit; captures only with `--only`. No `npm test`, digests, golden or full captures. Never re-run a command when no file changed. |
| Hand-off | implementer, once | tsc; `npm run test:affected -- --base <base>` (prints which tests and why) or every test importing a changed module; the digest covering touched files (skip life-cpu-digest when `git diff --quiet main -- <LIFE_FILES>`, see `npm run test:life-guard`); one full AFTER capture plus Luna; `npm run test:full` once, reporting only NEW failures against `tests/known-failures.json` |
| Merge | merger, once per merge batch | tsc, `npm run test:full`, digests, `npm run test:golden`; rewrites `tests/known-failures.json`; `npm run test:perf` once under the CPU-quiet gate |

Other tools: `npm run test:pkg -- <files>`, `npm run test:smoke`. Round start:
the coordinator captures one shared BEFORE set from `main` under one lock hold.

## Hand-off file

Path: `test-results/<round>/<ID>/handoff.md` in the task worktree (the PR
body carries the same content once GitHub is live). Sections match
`.github/pull_request_template.md`: branch, base and head sha; files changed;
every command with its exit code; tests NOT run and why; Luna questions and
verdicts or "visual check NOT done"; merger items (version bumps, repins,
registration, known-failures); open owner items; next step. Never claim a pass
that was not observed.
