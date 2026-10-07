# Fair cost protocol harness (O5, 2026-10-07)

Lane C of `docs/fable-test-review-2026-10-07.md`, branch `tools/cost-fair-harness` from main `5bce32b`.
O5: make the fair protocol cheaper to run **without changing the counted protocol** (decisions addendum (6) Q-A,
`docs/mountains-opus-decisions-2026-10-05.md`). The pre-registration line is addendum (7) there. The shorter protocol
(O13: F1/F2) is a separate, unsigned draft: `docs/cost-fair-shorter-protocol-draft-2026-10-07.md`, not implemented.

## Hand-off header

- Verdict: implemented; unit tests 6/6; N = 2 dry run with a forced interruption and a resume: no record recomputed,
  point sets byte-identical to GATE-1's (section 6). The first dry-run attempt found and fixed a stdout bug in
  `points.mjs`.
- Files: `scripts/cost-fair/run.sh` (rewritten driver), new `precheck.mjs`, `precheck.test.mjs`, `slot-held.mjs`,
  `points.mjs`. Unchanged: `c1-ab.mjs`, `c1-points.mjs`, `orbit-ab.mjs`, `analyze.mjs`.
- NOT run: a counted (citable) protocol run; `npm test` (no shared code touched: nothing outside `scripts/cost-fair/`
  and docs changed).
- needs: `package.json` `scripts.test` may register `scripts/cost-fair/precheck.test.mjs` (owned by lane A; the test
  uses no live slot, sandbox dirs only). Optional.

## 1. What changed and what did not

| | Before (GATE-1 driver) | Now |
|---|---|---|
| Slot | `node test-slot.mjs -- node …` per process: 480 acquisitions, each re-racing other agents' 1 s pollers | the batch takes the **exclusive** slot **once**; children run without the wrapper |
| Resume | none: a kill meant a restart or hand-editing `c1.jsonl` | per-(kind, world, i) record files; a rerun skips finished ones |
| Pre-check | gate1 hook: any NEW python/strong process waited up to 10 min (55 of 127 min were waits on idle python MCP servers) | same checks, but a new contender counts only if it used > 5 % of one CPU over 500 ms |
| Point sets | computed into each OUT | cached by REF sha, fingerprint-verified |
| Counted protocol | addendum (6) | **unchanged**: same commands (`c1-ab.mjs`, `orbit-ab.mjs` with the same arguments), same 16 processes per iteration in the same order, same N, same analysis |

## 2. One slot level per batch (never nest)

`run.sh` asks `slot-held.mjs` whether `ATLAS_TEST_SLOT_TOKEN` names the live **exclusive** owner of the slot
(`owner.txt` token, this host, pid alive):

- **exit 10, exclusive:** run the batch here and take nothing more. This is the case after re-entry, and also when a
  coordinator starts `run.sh` inside its own exclusive hold.
- **exit 11, none:** `exec node tests/helpers/test-slot.mjs -- sh run.sh` once (env `COST_FAIR_SLOT_ENTERED=1`). The
  slot CLI injects its token into the child's env (`runCommand`/`slotEnv`), so the re-entered script sees exit 10.
  If it does not (entered flag set but no exclusive hold), it refuses (exit 2) instead of taking a second level, which
  would deadlock against its own parent while `ATLAS_SLOT_SHARED` is off.
- **exit 12, shared:** refused (exit 2). An exclusive run inside a shared holder violates never-nest.

Every child (`c1-points`, `c1-ab`, `orbit-ab`, `precheck`) runs plain `node …` and inherits the token. The pre-check
re-asserts before every counted process that the batch still holds the exclusive slot (`--in-batch`; hard, exit 3).
Interrupting the batch (Ctrl-C, or `taskkill /T` on the batch's `sh`) lets the slot CLI release normally; killing the
slot-holder node itself leaves `owner.txt` with a dead pid, which the next caller reaps (existing takeover rule).
Cost: one slot wait per batch instead of 480. While the batch runs no other agent can test, exactly as during the 480
single acquisitions, minus the gaps another agent could slip into.

## 3. Resume

Each counted process writes its record to `OUT/rec/<seq>-<type>-<kind>-<world>-<first>-i<i>`:

- `.tmp` while running (`c1-ab.mjs` gets it as its out file; `orbit-ab.mjs` stdout goes to it);
- renamed to `.json` only after exit 0 with exactly one line; otherwise `.fail` (exit code and output).
- `seq = 16 (i − 1) + position`, so the name of every (kind, world, i) is fixed by the schedule, not by the session.

A rerun with the same `OUT` and the same `N REF REF2 CAND` (checked against `OUT/protocol.txt`; a mismatch refuses
with exit 5):

- skips every `.json` (`skip=done` in `exits.log`);
- skips every `.fail`: every run counts and none is repeated (to retry a failure you would have to delete its `.fail`,
  which a citable run must record);
- discards a `.tmp` (an interrupted attempt that never became a record; logged `discarded interrupted attempt`) and
  runs that process at its position, with a fresh pre-check.

At the end of each session `c1.jsonl` and `orbit.jsonl` are assembled from `rec/` in schedule order, so
`analyze.mjs` reads exactly what it read before. `exits.log` keeps the old line format (`c1 AB Maithea cand i=1
exit=0`) and adds `SESSION`, `skip=` and `DONE c1=… orbit=… failed=…` lines. `run.sh` exits 0 only with no `.fail`.

An interrupted C1 process usually leaves no `.tmp` (`c1-ab.mjs` writes its record only at the end); it is simply run
again, and its trace is a `precheck.jsonl` line without an `exit=` line. Limit: a kill in the few milliseconds between a child's exit and the rename discards a complete attempt and re-runs it;
the discarded attempt is never part of the records (and `exits.log` shows the discard).

## 4. Pre-check (`scripts/cost-fair/precheck.mjs`)

Promoted from `docs/quiet-window-2026-10-07/gate1/precheck.mjs`. Flag, never drop, never kill. A baseline is taken at
the first session start (`OUT/baseline.json`, kept across resumes so the check stays strict).

- **HARD** (exit 3, the driver stops before measuring): `<slot>.shared` holds a holder file; or (`--in-batch`) the batch
  no longer holds the exclusive slot.
- **Host idle** over 500 ms (`os.cpus` deltas) below 85 %: wait.
- **Contenders:** perf-host `classifyProcess` over `tasklist`, diffed against the baseline. A NEW process whose name is
  strong (codex, chrome, chrome-headless-shell, blender, ffmpeg, ollama_llama_server, llama-server, comfyui, python*)
  **counts only if it used more than 5 % of one logical CPU over a 500 ms sample** (`CPU_ACTIVE_FRAC = 0.05`). Idle
  ones are recorded as `quiet` with their percentage. The CPU time is read with one PowerShell `Get-Process` call over
  the candidate pids (about 0.8 s, run concurrently with the idle sample, and only when a candidate exists). A pid
  whose CPU time cannot be read counts (fail closed); one that exited during the sample is `gone`.
- **GPU:** a new nvidia-smi compute app classified as a contender counts (unchanged).
- Wait 15 s steps up to `PRECHECK_MAX_WAIT_MS` (default 600000 = 10 min, as GATE-1), then proceed FLAGGED. The record
  (`OUT/precheck.jsonl`) keeps the GATE-1 fields plus `slot`, `active`, `quiet`, `gone` and `waitReasons`.

"5 % CPU" is read as 5 % of **one** logical CPU (25 ms of CPU time in 500 ms), the strict reading: on this 32-thread
host the Task-Manager reading (5 % of the machine) would let a contender use 1.6 full cores before it counted.
Windows updates process times at the clock tick (~15.6 ms), so the threshold is about 1.6 ticks: a process that used
two ticks counts. Live probe: a spinning node child read 99.0 %, an idle node child and three idle python.exe
processes 0.0 %, a non-existent pid `gone`.

Unit tests: `node --test scripts/cost-fair/precheck.test.mjs` (6 tests: idle new python is quiet; > 5 % counts and
exactly 5 % does not; fail-closed unknown CPU / missing sample / failed sampler; exited = gone; baseline and node.exe
never count; idle 85 % boundary, shared holders, GPU contender; `slotHolding` exclusive / shared / dead / foreign /
stale token, in a sandbox dir).

## 5. Point sets cached by REF sha (`scripts/cost-fair/points.mjs`)

- Cache: `POINTS_CACHE` (default `<checkout>/test-results/cost-fair/points`, git-ignored) `/<sha>/`, holding the eight
  `.f64` files, the four `points-<world>.json` and `manifest.json`.
- The sha: `REF_SHA` (full 40 hex) is required for a `git archive` export; for a checkout it is its `HEAD` (and must
  match `REF_SHA` if given; `src/` and `tests/` must be clean).
- **Verified on every use:** `manifest.json` stores a fingerprint of REF's `src/` + `tests/` (sha256 over sorted paths
  and LF-normalised contents, so an export and a CRLF checkout of the same sha agree) and the sha256 of each file.
  Reuse requires both to match; otherwise it is a hard error (exit 4), never a silent recompute.
- A missing cache is built by the unchanged `c1-points.mjs` (one process per world, inside the batch's slot) in a temp
  dir and renamed into place.
- OUT gets the evidence: `points-<world>.json`, `points-f64.sha256` (same format as GATE-1's) and a line per session
  in `points-source.jsonl` (`sha`, cache dir, fingerprint, `reused`).

## 6. Dry run (N = 2, NOT citable)

Scratch only (session scratchpad, not in the repo); **not citable**: N = 2, `PRECHECK_MAX_WAIT_MS=60000`, other
agents' processes on the host. Arms: `git archive` exports REF = REF2 = `9dcb1cf` (as GATE-1), CAND = `772cad3`, one
`node_modules` junction in their parent. Driver: start `run.sh`, wait for 6 finished records with an orbit attempt in
flight, `taskkill /F /T` the batch's inner `sh` (not the slot holder), then rerun the same command.

**Attempt 1 found a bug and is not counted as the verification.** `points.mjs` let the children's stdout into the
`PC=$(…)` capture, so every C1 process got a broken prefix and exited 1 (orbit was fine). The resume mechanics behaved
as designed even so: the second session logged `skip=failed` for the 8 C1 `.fail` records, `skip=done` for the 6 orbit
records, and discarded the in-flight orbit `.tmp`. Fixed (child stdout goes to stderr; `run.sh` also requires
`$PC/manifest.json`), the bad session stopped, a fresh OUT and a fresh cache used for attempt 2.

**Attempt 2** (slot taken 10:13:54 after about 23 min of waiting behind other lanes' runs; held until 10:21:08):

- Session 1: points cache **built** (4 worlds, about 3 s), then 6 records (`c1 AB/AA Maithea`, `orbit AB/AA Maithea`,
  `c1 AB/AA Selawyn`, all exit 0). Killed at 10:16:17 with `orbit AB Selawyn ref i=1` in flight. The slot CLI then
  released normally.
- Session 2 (same command, took the slot again at once): `points-source.jsonl` `reused: true`; `skip=done` for the 6;
  `orbit AB Selawyn ref i=1 discarded interrupted attempt (0 lines)` and re-run at its position; the remaining 25
  processes ran; `DONE c1=16 orbit=16 failed=0`, exit 0.
- **No record recomputed:** every one of the 32 (kind, world, i) keys has exactly one `exit=` line in `exits.log`; the
  sha256 and mtimes of the 6 records from session 1 are unchanged after session 2.
- **Point sets byte-identical to GATE-1:** the eight `.f64` sha256 equal `docs/quiet-window-2026-10-07/gate1/points-f64.sha256`,
  and `points-<world>.json` (share, sites, counts) equal GATE-1's apart from the `root` path. Cache checks by hand: the
  same sha against the CAND export fails with a fingerprint mismatch (exit 1, no recompute); a CRLF worktree checkout
  of `9dcb1cf` (`t6-refmain`) matches the export's fingerprint and reuses the cache.
- Records: A/B = `terrain-1.8.1-grain` vs `terrain-1.9.0-mountains` wired, A/A = 1.8.1 vs 1.8.1, first arm alternating;
  A/A orbit bakes byte-identical, A/B differ, 0 block solves in the timed bakes (as GATE-1).
- `analyze.mjs` runs on the assembled files (n = 2 gives NaN CIs, as expected; the numbers mean nothing at n = 2).
- Pre-check: 33 calls (32 + the interrupted attempt), 6 flagged with one 15 s wait each (host idle 85-87 % from other
  lanes' work outside the slot); no contender counted. Since then the record also carries `waitReasons` (the reasons
  that caused the waits; the final `reasons` are those still present when it proceeded), and a lost slot aborts at once
  instead of after the wait.
- Wall: 32 processes in 7 min 14 s, including the kill and the resume.

Also checked in a sandbox slot dir (`ATLAS_TEST_SLOT_DIR`): self-entry (`exec node test-slot.mjs -- sh run.sh`, holder
named `sh scripts/cost-fair/run.sh`); `run.sh` inside an existing exclusive hold runs through (slot-held exit 10);
`COST_FAIR_SLOT_ENTERED=1` without a hold refuses (exit 2); a resume with a different N refuses (exit 5); the script
also runs with CRLF line endings (main's checkout has `core.autocrlf=true`).

## 7. Running a counted gate

```sh
# from the repo root of main (the harness and test-slot.mjs of the checkout you run from are used)
REF=<export of main> REF2=<second identical export> CAND=<candidate export> REF_SHA=<main sha> \
  OUT=test-results/<gate>/fair N=30 sh scripts/cost-fair/run.sh
node scripts/cost-fair/analyze.mjs test-results/<gate>/fair
```

If it is interrupted, run the same command again: it resumes. Do not change `N`, the arms or `OUT` between sessions
(refused). Arms with a `node_modules` junction in their parent: remove the junction with `cmd /c rmdir` before
deleting the arms, never `--force`.
