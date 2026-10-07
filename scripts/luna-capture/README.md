# Luna capture tooling (preserved 2026-10-07)

Copied from the git-tracked-on-branch-only evidence in `universe-atlas-wt/t6/test-results/mountains/t6-wiring/`
(`capture-sheet.browser.mjs`, `luna-capture.sh`) so the GATE-5 massif Luna sheet does not depend on a worktree that
will be removed. Changes against the originals: free ephemeral preview port through `tests/helpers/free-port.mjs`
(docs/test-fixes-2026-10-07.md section 3), paths from env, no scoring or pose change. Needs the test slot and the
machine GPU lock; see docs/evidence-index-2026-10-07.md.

**Gate policy (O6, 2026-10-07): capture only, no vote** until a question is calibrated on
`tests/visual-controls/<feature>.json` with at least 2 good and 2 bad controls. See
`docs/luna-gate-policy-2026-10-07.md`. `luna-capture-massif.sh` therefore builds, captures, archives
(`$OUT/archive/`: capture reports, logs, exits, window, `luna-sheet-png.sha256`) and does not call Luna;
`LUNA_VOTE=1 LUNA_PROMPT_FILE=<prompt>` adds an advisory vote, `ARCHIVE_ONLY=1` re-archives an existing `$OUT`.
`luna-capture.sh` (standard sheet) never voted and is unchanged.
