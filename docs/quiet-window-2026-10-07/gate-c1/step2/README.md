# GATE-C1 step 2: golden + probe pair (evidence only)

Run 2026-10-07 12:36:42Z to 12:41:47Z. This step was run as evidence under Fable addendum 2d (main bf1184b). Step 1 STOPped on the Raiva orbit median of 5.02 % (see `../analysis.txt`). b84bcf9 was not re-measured.

- **Branch:** `mountains/carving-c1` @ `b84bcf92de8198661b4cfa87e547ea4367ba5afa`, src tree `9f7446ef`. It was built from a separate detached checkout `universe-atlas-wt/c1-probe`, not from the implementer's worktree.
- **Main:** 581a484, src identical to bf1184b. It was built from a detached checkout `universe-atlas-wt/q-main-c1`.
- **Locks:** the exclusive test slot (`tests/helpers/test-slot.mjs`, no `--shared`) was taken first. Inside it, one real GPU lock was held for the whole sequence by `provenance/hold-gpu.mjs`. The children ran with `ATLAS_GPU_LOCK_DIR` set to an inner private dir, so their own lock calls did not re-enter the real lock. The locks were released in reverse order. The full sequence and timestamps are in `step2-locks.log`, and every command exited 0.

## 1. Cross-engine golden (HARD)

| arm | Node vs fixture | chromium | firefox | webkit | verdict |
|---|---|---|---|---|---|
| branch b84bcf9 | match | MATCH | MATCH | known faunaKnownUnstable only (`ed5d56a2…`) | PASS WITH KNOWN MISMATCH |
| main 581a484 | match | MATCH | MATCH | known faunaKnownUnstable only (`ed5d56a2…`) | PASS WITH KNOWN MISMATCH |

**0 new mismatches.**

The branch's `golden.json` deliberately re-pins four terrain-dependent digests in commit 3da3584 (terrain-1.9.1-carving-c1): `biomes`, `placeQuery`, `census` and `rocks`. All three engines reproduce the re-pinned Node values.

Reports: `golden-branch-report.json`, `golden-main-report.json`. Logs: `golden-*.log`.

## 2. Probe pair: Maithea frozen axis station

The probe script is `provenance/probe-c1.browser.mjs` and its command list is `provenance/cmds2.json`.

**Fixture and station**
- Fixture: seed LETHRA-001, date `435084631200000032044300000`, body Maithea.
- Station: axis station `tileSetIndex 0` from `tests/helpers/mountain-tile-set.mjs` (GATE-1 tile set, base 9dcb1cf). It is the highest sun elevation within [5°, 15°].
- Sun elevation: **11.77°**.
- Lighting: side-lit, view azimuth = sun azimuth + 90°. Pitch 35°, viewport 1920×1080, clouds hidden.

**Captures**
- **Stills:** both arms use identical poses at clearance 6000, 4200, 3000, 2100, 1500, 1050, 750, 520 and 360 m. Each still is captured after the backlog settles (surfaceReady, terrainPending 0) plus 3 s.
- **Descent:** 6000 to 360 m in 3 s at a minimum of 1880 m/s, 7 frames, 0.5 s apart. The branch replayed main's descent plan.

**Levels reached**
- Every still and every descent frame reports targetLevel 11, maxLevel 12, frontierMaxLevel 12, terrainPending 0.
- **L13 was never reached.** The app's screen-error LOD rule stops at L12 at these clearances, so the probe covers L11–L12, not L11–L13.

**Page errors:** 0 in both arms.

**Build stamp:** the branch's build-info shows `dirty: true`. The only cause is this untracked evidence directory, which existed at build time. `git status` in the checkout showed only `docs/quiet-window-2026-10-07/gate-c1/` untracked, and src was unchanged.

### Frames

The full-resolution 1920×1080 PNGs (32 files, about 51 MB) are **not committed**, to keep the repository small.
- They are kept in main's ignored `test-results/gate-c1/step2/frames/`.
- `maithea-c<clearance>-<main|branch>.png` are the stills.
- `maithea-descent-0<k>-<main|branch>.png` are the descent frames.
- `probe-<tag>.json` holds the per-frame metadata and poses.
- `frames-png.sha256` holds their sha256. It is verified 32/32 against that copy.

The committed `compare/sbs-*.jpg` files are side-by-side crops at 60 % scale, JPEG quality 85: **main on the left, branch on the right**. Each crop is x 160–1760, y 0–900 of the frame. There is one for each still and each descent frame.

### Visual assessment (Opus, by eye; Luna not consulted, advisory only)

**Before (main): promotion verdict = YES, the grid artifact is visible.**
- From 6000 m down to about 750 m, every bench or scarp edge carries a regular, evenly spaced sawtooth of triangular teeth. In the stills they show as lit/shadow "fangs" along each bench lip.
- They are most obvious at 1050 and 750 m, where 4–5 identical teeth hang under one bench edge.
- At 360 and 520 m they appear as periodic dark lobes in the foreground snow.
- The regularity reads as a lattice imprint rather than natural erosion.
- The tooth spacing was not measured in metres, so "200 m" is inferred from the regularity, not measured.

**After (branch b84bcf9): visual STOP = NOT triggered.**
- **Residual axis grid:** none visible. The sawtooth teeth are gone at every clearance and in every descent frame. The bench lips become smooth, continuous scarps (see the 1050, 750 and 360 m frames).
- **Bench/contour striping:** present in both arms at similar strength. The large-scale parallel bench/ridge banding is a macro-terrain feature and C1 does not change it. It is **not visibly stronger** on the branch.
  - With the teeth gone, the long straight scarp lines at 2100 and 3000 m read as a little cleaner and more continuous.
  - That is now the most noticeable remaining regularity, and is worth a later look. It is not an increase.
- **Blocky steps:** none new. The branch faceting is softer than main's.
- **Seams:** no tile seams, cracks or popping between levels in the stills or across the 7 descent frames, in either arm.
