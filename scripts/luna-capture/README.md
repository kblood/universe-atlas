# Luna capture tooling (preserved 2026-10-07)

Copied from the git-tracked-on-branch-only evidence in `universe-atlas-wt/t6/test-results/mountains/t6-wiring/`
(`capture-sheet.browser.mjs`, `luna-capture.sh`) so the GATE-5 massif Luna sheet does not depend on a worktree that
will be removed. Changes against the originals: free ephemeral preview port through `tests/helpers/free-port.mjs`
(docs/test-fixes-2026-10-07.md section 3), paths from env, no scoring or pose change. Needs the test slot and the
machine GPU lock; see docs/evidence-index-2026-10-07.md.
