# Luna at the gate: capture only until calibrated (2026-10-07)

Decision O6 of `docs/fable-test-review-2026-10-07.md`, decided by Fable 5.1 on Kasper's instruction (2026-10-07),
overrulable. This document is the Luna section for the gate; `docs/test-policy.md` (VISUAL-ADVISORY rules) is
unchanged and still governs how a vote is taken, parsed, diagnosed and calibrated. Agent A owns
`docs/test-policy.md` and links this file from it (see `docs/test-tidy-d-2026-10-07.md`, "needs").

## Why

Every Luna vote so far is uncitable. The mountain question failed the reference arm as often as the candidate:
GATE-5 (`docs/quiet-window-2026-10-07.md`) recorded wired 0 PASS of 6 images (0/18/0 asks) and refmain 0 of 6
(0/18/0); the earlier assembly and T6 sheets were 0/24 and 0/23/1. The question is UNCALIBRATED (3 of 6 positives in
the CPU-path calibration) and the app capture path was never calibrated. A vote at the gate costs about 9 min of
GPU/agent time (5-6 min of it the asks) for a result the policy itself forbids citing. `tests/visual-controls/` does
not exist yet, so no question is calibrated today.

## Rule

1. **At a gate (GATE-5 and any assembled-sheet gate), Luna is CAPTURE ONLY: build, capture, archive, hash. No vote.**
   The images and their hashes are the gate's visual evidence; a human or a later calibrated question reads them.
2. **The gate bar for voting a question.** A question may be voted at a gate only when `luna-vote --controls
   tests/visual-controls/<feature>.json` reports it `CALIBRATED` on the exact prompt text, with **at least 2 good
   (`expect: PASS`) and at least 2 bad (`expect: FAIL`) controls**. This is stricter than `luna-vote`'s own minimum
   (1 good and 1 bad), which stays the minimum for hand-off use. Controls are generated review renders only, never
   private assets; for a gate question at least one good and one bad control should come from the same capture path
   as the gate (the app, not only a CPU render), because the app path is the one being judged.
3. **A calibrated gate vote stays VISUAL-ADVISORY.** It never blocks a gate by itself (test-policy result classes).
   Its PASS/FAIL is citable only when `luna-vote --calibration <result> --question <id>` stamps it `citable`.
4. **An explicit vote before calibration is allowed but never cited.** `LUNA_VOTE=1` (below) runs the vote; without a
   calibration it is `NOT-CHECKED`. A report writes "VISUAL-ADVISORY, NOT-CHECKED, not a verdict" next to it.
5. Exit 2 from `luna-vote` (Luna unavailable) is still "visual check NOT done", never a verdict.

## Tooling: `scripts/luna-capture/luna-capture-massif.sh`

| Mode | Env | What it does |
|---|---|---|
| default (gate) | `REF CAND OUT TILESET` [`VIEWS`] | build + capture per arm (one slot level each; the capture takes the GPU lock itself, slot -> GPU), then archive. Writes `vote skipped: capture only` to `luna-exits.log`. No Luna call. |
| re-archive | `OUT ARCHIVE_ONLY=1` | archive and hash an existing `$OUT` (no build, capture or vote). |
| advisory vote | `+ LUNA_VOTE=1 LUNA_PROMPT_FILE=<prompt>` [`LUNA_ASKS` >= 3, `LUNA_ELEMENTS`, `LUNA_CALIBRATION` + `LUNA_QUESTION`] | after the capture, `luna-vote` per arm (`luna-vote-<arm>.json/.log`) and a `gate-bar met` / `gate-bar NOT met (<why>)` line in `luna-exits.log` (calibrated status, same prompt, >= 2 good and >= 2 bad controls). `LUNA_VOTE` other than 0/1 and `LUNA_CALIBRATION` without `LUNA_QUESTION` fail closed (exit 64). |

Archive (`$OUT/archive/`): `luna-exits.log`, build and capture logs, `window.txt` (UTC start and end), the capture
reports `capture-<arm>-*.json` (picks, poses, build commit, tile-set provenance), any vote json/log, `archived-at.txt`
and `luna-sheet-png.sha256` (`sha256sum -b` of every PNG, paths relative to `$OUT`, the format of
`docs/quiet-window-2026-10-07/gate5/luna-sheet-png.sha256`). The PNGs themselves stay in `$OUT/luna-sheet/` (usually a
git-ignored `test-results/` directory); a gate doc commits the archive directory and, if wanted, a downscaled contact
sheet.

Verified without a browser or GPU (stub slot, capture and vote scripts in a scratch REPO): default run (4 PNG hashes,
no vote), `ARCHIVE_ONLY=1`, `LUNA_VOTE=1` with and without a calibration, and the fail-closed cases. The real
capture path is unchanged and was not re-run here.

## Getting a question to the gate bar

1. Write `tests/visual-controls/<feature>.json` (format in `docs/test-policy.md`) with >= 2 good and >= 2 bad controls
   per question, e.g. for massifs: two app captures of real massifs judged good by the owner, and two bad ones (the
   refmain flat-lowland axis tiles of GATE-5 are natural bad controls for "is this a mountain range").
2. `node scripts/luna-vote.mjs --controls tests/visual-controls/<feature>.json --json <result.json>`; keep the result
   next to the manifest's evidence.
3. If `CALIBRATED`: pass `LUNA_VOTE=1 LUNA_PROMPT_FILE=<the same prompt> LUNA_CALIBRATION=<result.json>
   LUNA_QUESTION=<id>` at the gate. If `UNCALIBRATED` or `INSENSITIVE`: reword the question or change the controls;
   the gate stays capture only.
