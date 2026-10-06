# Evidence index, 2026-10-07 (lane L6)

Written before any worktree is removed (plan critic item "removing the t6 worktree would destroy GATE-5's tooling and the
fair evidence", docs/parallel-development-plan-2026-10-07.md). Nothing in the source worktrees was changed; every file was
read and hashed. Branch `docs/evidence-2026-10-07`, from main 2250d1e. Not merged.

## 1. Totals

| | files | MB |
|---|---|---|
| Listed in the manifest | 1140 | 132.72 |
| Copied into `docs/evidence/2026-10-07/<worktree>/` (text under 200 KB) | 1098 | 4.79 |
| Hash only (binary, or text of 200 KB or more) | 42 | 127.92 |

**Manifest of every file** (worktree, path, bytes, sha256, status, source): `docs/evidence/2026-10-07/manifest.tsv`.
Paths in it are relative to the source worktree under `C:/LLM/IWSDK/universe-atlas-wt/<worktree>/`; a copied file sits at
the same relative path under `docs/evidence/2026-10-07/<worktree>/`. Verify a hash-only file with `sha256sum` on the
original. Hash-only files exist only in the worktree: **removing that worktree deletes them** (see section 5).

## 2. Capture tooling now tracked

`scripts/luna-capture/capture-sheet.browser.mjs` and `luna-capture.sh`, copied from
`t6/test-results/mountains/t6-wiring/` (on main since aa3a2c7 only inside the git-ignored `test-results/` tree, force-added
there). The copy has the free-port drop-in of docs/test-fixes-2026-10-07.md section 3 (ephemeral port through
`tests/helpers/free-port.mjs`, `builtAt` ownership check kept; poses and scoring unchanged; `luna-capture.sh` takes
REF/CAND/OUT from the environment and no fixed ports). Syntax-checked only (`node --check`, `sh -n`); not run, because this
lane runs no browsers. Run it only with the GPU lock and the test slot free (lock order: merge, slot, GPU).

Note on the plan's wording: in `t6` the scripts and 102 small t6-wiring files are tracked on the branch and already on main
via aa3a2c7; `git status --ignored` lists only the files below as ignored.

## 3. By directory

| worktree | directory | status of source | files | MB | copied | hash only | hash-only MB |
|---|---|---|---|---|---|---|---|
| asm1 | `test-results/mountains/assembly-1` | git-ignored | 15 | 0.17 | 15 | 0 | 0.00 |
| baked | `test-results/mountains/t6-baked` | git-ignored | 1021 | 4.95 | 1017 | 4 | 1.54 |
| baked | `test-results/mountains/t6-margin` | git-ignored | 43 | 1.23 | 40 | 3 | 0.97 |
| m0c | `test-results/mountains/M0-v3` | tracked on branch mountains/m0c only (not on main) | 16 | 1.03 | 12 | 4 | 0.81 |
| t6 | `test-results/fauna-composer-gait` | git-ignored | 1 | 0.02 | 1 | 0 | 0.00 |
| t6 | `test-results/fauna-opus-modular-001` | git-ignored | 1 | 0.12 | 1 | 0 | 0.00 |
| t6 | `test-results/fauna-variation-2026-10-02` | git-ignored | 1 | 0.08 | 1 | 0 | 0.00 |
| t6 | `test-results/mountains/t6-wiring/(loose log files)` | git-ignored | 7 | 5.16 | 1 | 6 | 5.01 |
| t6 | `test-results/mountains/t6-wiring/fair` | git-ignored | 17 | 112.60 | 8 | 9 | 112.30 |
| t6 | `test-results/mountains/t6-wiring/luna-sheet` | git-ignored | 18 | 7.35 | 2 | 16 | 7.30 |

Build outputs, regenerable, not copied and not listed per file (one aggregate hash = sha256 over sorted "relative path, NUL, file sha256" lines):

| worktree | directory | files | MB | aggregate sha256 |
|---|---|---|---|---|
| t6 | `dist` (git-ignored) | 894 | 255.91 | `c0e0b1441f7f799f3c3ed21d4f2da058df7b40493b5ae5a56cca71190b845b01` |
| t6 | `tests/golden/dist` (git-ignored) | 2 | 0.37 | `cf7c8fa76b1236609fa2b6d9a33f947e4b14d1a5edf3cfee061f5750eea15e4c` |

`node_modules/` in every worktree is a junction to the main checkout and is not evidence.

## 4. What the groups are

- **t6 / fair/** (`c1.jsonl`, `orbit.jsonl`, `orbit.err`, 8 `points-*.f64`): the fair cost protocol on the wired build, **killed at
  i=19 of 30**, not analysed, not citable (handoff section 0 and 4). Kept so the partial run is not silently lost.
- **t6 / luna-sheet/** (16 PNG, refmain and t6, `mountainV3` with and without clouds): the standard T6 Luna sheet, 0 PASS
  (uncalibrated, advisory). Needed to compare a later massif sheet against 0/24 and 0/48.
- **t6 / astra-*.log, golden-update.log, luna-build-*.log, l0-prebuilt.log, frame-wired.err**: logs of the T6 round.
- **t6 / test-results/fauna-***: three small fauna review output folders, ignored in `t6` (the `gate` worktree has the same
  three folder names; not hashed there).
- **baked / t6-baked, t6-margin**: route A (baked coarse band field) rounds 1-3 and the margin fair run behind handoff
  section 3.1 (`t6-margin/fair-analysis.txt`, 480/480 exit 0, C1 and orbit numbers).
- **m0c / M0-v3**: M0 round 3 evidence (addendum (1) item 5). These 16 files are **tracked on branch mountains/m0c**, which is
  not merged, so they are not on main; they are copied here so `m0c` can be removed later. (The branch itself also keeps
  them while the branch exists.)
- **asm1 / test-results/mountains**: 15 small ignored files of the superseded assembly-1 branch, included because the lane found
  them; asm1 was not in the task's list.

## 5. Hash-only files (exist only in the source worktree)

| worktree | path | bytes | sha256 | why |
|---|---|---|---|---|
| baked | `test-results/mountains/t6-baked/astra-fix.log` | 353501 | `c62a1e811c849ff8dcc5e8f48680f41bb75ec701fdfd9d5ec05351c0794f182b` | text >= 200 KB |
| baked | `test-results/mountains/t6-baked/astra-implement.log` | 661797 | `dfa6b6baf47455729b4eb20087244e48f15f644fc06bfb2339b6146b854be322` | text >= 200 KB |
| baked | `test-results/mountains/t6-baked/c1-noscratch/Maithea-2.log` | 326796 | `ad9f505951a91345784d4df78e53818922e1a2581c1773ec600e126a550a402a` | text >= 200 KB |
| baked | `test-results/mountains/t6-baked/r2/astra-implement.log` | 272888 | `774fd4de620c82af730816807c4c9de1137ffd98aec6e1f64f12f006ab785773` | text >= 200 KB |
| baked | `test-results/mountains/t6-margin/astra-implement.log` | 569692 | `e989c08554806722cf49b79a7d935b465c19ec11fc45cbf328397374213d9d6a` | text >= 200 KB |
| baked | `test-results/mountains/t6-margin/fair/c1.jsonl` | 233271 | `a512e16cbba6b8c9d5d4b7cca998bb74d8b4244f1476f9499a5181c64111fad3` | text >= 200 KB |
| baked | `test-results/mountains/t6-margin/fair/orbit.jsonl` | 217204 | `07dd5e831fa92a2bd72a5d54c1ba52a045d7892bfa48b7b170ad188fe4f514cf` | text >= 200 KB |
| m0c | `test-results/mountains/M0-v3/corner-L7/Lethuris-L6.png` | 331585 | `da9ddcd2390ab50349e3d87721366b07e5a60f4946ffa0ef7e92852b3f3ae2a9` | binary |
| m0c | `test-results/mountains/M0-v3/corner-L7/Lethuris-L8.png` | 122126 | `dde05b51fc575f4848b60b2913be530b68ab71ca36aa8925c7bf2a3491001fe8` | binary |
| m0c | `test-results/mountains/M0-v3/corner-L7/Maithea-L6.png` | 294762 | `0ac04e68549504c89fa1a88deadd2f9f57b5b33fb5cec71f7b92bc5d117a3da6` | binary |
| m0c | `test-results/mountains/M0-v3/corner-L7/Maithea-L8.png` | 98159 | `771eaf5de9e15b9dfabdd2355e79ebeed670a95063e57eb1405ed27255714477` | binary |
| t6 | `test-results/mountains/t6-wiring/astra-fix-default.log` | 792168 | `3d9a53ef523aa12e28cc1f478116866ee2c86a09f788441b68a2728438e87f75` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/astra-review.log` | 489479 | `d718bae2d33396e7369475c1b8c94a928e7f55c82cb6cbfc3056bbc616f90796` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/fair/orbit.err` | 2023162 | `5fa00426ff5bb4ae44eb93fae442186783697cfe00c65aa41cbe39e10f792f46` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/fair/points-Lethuris-outside.f64` | 474432 | `027a394210cb7ecf36ea74f8a2b7fabcd0939982626f6e582b45f25079cacd60` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Lethuris-region.f64` | 28459200 | `5e56dca1076ae8c980764212b4f01964a490e417aed775abf8dc1fc0b1f31c62` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Maithea-outside.f64` | 469080 | `22af8a68e4fd3de91d4646a60ddc3ae09a9d998604b9190aaf71e8a3e33f4c24` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Maithea-region.f64` | 28459200 | `0d5fe1c04bfa60464aae2e14f9389449acfb339f214943fadd4aed3551c2b023` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Raiva-outside.f64` | 471744 | `d3d71720f5e0e610d0a239ac75a0c9e44149cf90a994bd943bfceabed7c4c7b8` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Raiva-region.f64` | 28459200 | `6130eea936f6713303f1e1ed4947a0fb5932de6e1affa3bd88ae531efa1d6cc8` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Selawyn-outside.f64` | 474672 | `b2784903814d352d9037e2cc64767ea052ae943cf5fa303d5bfdd7d8dd25e3bb` | binary |
| t6 | `test-results/mountains/t6-wiring/fair/points-Selawyn-region.f64` | 28459200 | `70cf9a1df41098f1d54278e6bd2ef779d279efff2450e0810f88e571004505a4` | binary |
| t6 | `test-results/mountains/t6-wiring/frame-wired.err` | 225300 | `f9f214dba90a59a321fa39eb15589269b8a67d52ebd48292749333a01756c053` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/golden-update.log` | 2053843 | `f52622eb977b48f76627da9be81a0de44372237bc091974ccc27f6d6c97cd227` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/l0-prebuilt.log` | 564397 | `0079d9d0257e9b91895f0565124bf1a0507c08ef28b1184d6738b192d123e2c2` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/luna-build-refmain.log` | 1128088 | `c216bbcd36d67abd1180110ea222890226d9909d02465bb1b1c4d3feaa1658ff` | text >= 200 KB |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/lethuris-mountainV3-noclouds-refmain.png` | 424281 | `4086b81bb328711eba0a14d4166515616f12b70cb69a9b0e95760eb33cd2fcf5` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/lethuris-mountainV3-refmain.png` | 551982 | `4b1433783b73fa05a466970bf0a95076e88f847f800dcbe8373d9d10f682c60b` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/maithea-mountainV3-noclouds-refmain.png` | 355351 | `4e5e1a5604ce545aa4f6efcec97e3cfb19aad664dbdc63cb7e874278374de8e0` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/maithea-mountainV3-refmain.png` | 521734 | `9429a2e53ebbebbb1f9351dc5d3596acc7b2bebf0c5d66b5c15377e193f53281` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/raiva-mountainV3-noclouds-refmain.png` | 400574 | `83a69fce35c4717bd2b084b48f3304ac30b64ec2f932e9dfbfdd85cbff2f10ab` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/raiva-mountainV3-refmain.png` | 580648 | `6b536d6afbe09b9bf9f8ec4da0224adec99d2933b0ea35d76121938040cfdcfc` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/selawyn-mountainV3-noclouds-refmain.png` | 427014 | `3559933e28c4a015ed2d8b617d01bea319e138c30d4c071bbfcf9a4848672df5` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/refmain/selawyn-mountainV3-refmain.png` | 646363 | `53c69830c4ecc2ded81909be8fc687cc8bcfc1579863fe5460f219b50b8d03ce` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/lethuris-mountainV3-noclouds-t6.png` | 366050 | `a1b188b1a57af8f9bcf43741e9c51ef476012f8e874bb0eb1feaaae50ba1ef6c` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/lethuris-mountainV3-t6.png` | 458371 | `f40813c9344603ea719c4d6a8e6dd357fee1e9b6788dfaef055778aa73da092e` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/maithea-mountainV3-noclouds-t6.png` | 355349 | `d5752f18ae559ef2e15b22bbcc559858e376056f564ae6b07d8628fe9c3b885d` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/maithea-mountainV3-t6.png` | 521931 | `cc3ae48b29c53fdb46816e14d1429c056893af56630ab849f9b779cd52f799d6` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/raiva-mountainV3-noclouds-t6.png` | 560759 | `bdc778461c25ff6f5cd1b6d631e449af41d1e42c9caca9d201422ef220c56d99` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/raiva-mountainV3-t6.png` | 680445 | `8b1cba30e59e73864f87167ca754ea577a0b227fdec48d8f931af9b9bc20d2cf` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/selawyn-mountainV3-noclouds-t6.png` | 439068 | `43e7a675605c5f425ef6a049ad3745595424024327edb8a26430ec76b5d5cf4c` | binary |
| t6 | `test-results/mountains/t6-wiring/luna-sheet/t6/selawyn-mountainV3-t6.png` | 360299 | `21e3478ca25004ae9a7b3144dd0a3b863e3882511a7f3c026db7819081eee4f0` | binary |

## 6. Not covered

- `_fair-t6/` (scratch git-archive arms, 1.4 GB with node_modules) and `t6-refmain`, `r2-relief-present` (only `dist/` ignored),
  `m0b` (nothing ignored), `gate` (same three fauna folder names as t6): not evidence; nothing hashed.
- The session scratchpad (`ec2-base`, Astra raw transcripts mentioned in the handoff section 9): not touched.
- Raw Luna PNGs of the older 0/24 and 0/48 sheets are not in these worktrees.
