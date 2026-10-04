# Universe Atlas migration preparation, 2026-10-04

Backlog task 21 (MIGRATION-AND-PROVENANCE-PREP), rollout step 1 of
`C:/LLM/IWSDK/docs/agent-collaboration-proposal-2026-10-03.md` ("Reconcile Atlas and
required tooling") plus the asset provenance gate.

**Nothing was pushed, no remote was changed, no issue or repository was created, nothing
was deleted.** Every disposition below is a proposal. The upload and the licence choice
need the owner (see section 7; all of them are OPEN).

Snapshot basis: local `main` = `b7d1df3` (checkout clean), 561 commits reachable from all refs. Counts were
taken on 2026-10-04 with `git rev-list --left-right --count` and **drifted while this document was written**
(`eye-round/EC4` moved from `a633587` to `0ebc88e`; several round-2 branches gained commits; three worktrees
appeared). The tables show the final snapshot. Re-run section 1 immediately before any upload.

## 1. Ref inventory

"Ref-only" = commits on the ref that are not on `main`. "Main-only" = commits on `main` not on the ref. A ref
with 0 ref-only commits is fully contained in `main`. `origin/main` is the Pi's `main` (`b8c00bf`).

| Ref | Tip | Ref-only | Main-only | Relation to `origin/main` | Last commit | Proposed disposition (nothing is deleted) |
|---|---|---:|---:|---|---|---|
| `main` | `b7d1df3` | 0 | 0 | 192 ahead, 0 behind | 2026-10-04 | The seed branch. Push only after the owner decisions in section 7. |
| `eye-round/EC4` | `0ebc88e` (was `a633587` earlier today) | 11 | 0 | 203 ahead | 2026-10-04 | **HELD for the owner** (proboscis triangle allowance 600 vs 800 undecided). Not touched by this task; someone else advanced it, now rebased on `main`. Worktree `universe-atlas-wt/eye-EC4` is clean. Its 11 commits exist only on this machine: when the owner decides, merge and retire; include the branch in an upload purely as preservation if the owner allows branches to be published. |
| `biome-round/W2-C-FOREST-C2-held` | `5f49777` | 1 | 116 | 77 ahead | 2026-10-03 | Held commit `W2-C C2: forest-census-4-climate`; merge base `81ce3b7` is 116 commits behind `main`. Backlog task 14 (BIOME2-FOREST) is its revival. Keep as is; rebase inside task 14, do not merge as is. Same preservation argument as EC4. |
| `work/github-pack` | `5baf263` | 1 | 0 | 193 ahead | 2026-10-04 | Another task's draft pack: `.github/` issue forms and PR template, 25+ issue drafts, `CODEOWNERS.draft`, a migration checklist. Separate from this task; not reviewed here. Drafts only: no issue exists. Coordinator merges; note that `.github/` is absent from `main` today. |
| `origin/main` (Pi) | `b8c00bf` | 0 | 192 | equal | 2026-10-02 | A strict ancestor of `main`: the Pi would fast-forward. Becomes the one-way backup after cutover (proposal step 3). |
| `origin/desktop-rendering-stage-c` | `81048c8` | 0 | 221 | **29 behind** (an ancestor of `origin/main`) | 2026-09-29 | Fully contained in `main`. Keep on the Pi untouched; no need to recreate it on GitHub. Retire only after cutover, by the owner. |
| `origin/opus55/render-submit-20260929` | `a8b98f3` | 0 | 231 | **39 behind** (an ancestor of `origin/main`) | 2026-10-01 | Fully contained in `main`. Same as above. |
| `round2/*` (11 branches) | various | `owner-decisions`, `harness-rerun`, `migration-prep`, `biome2-eco`, `biome2-replan`, `creature-export`, `golden-ext`, `landing-fixes`: 1 each; `biome2-grid`, `ocean-present`, `relief-present`: 0 (not yet committed) | 0 each | 192 to 193 ahead | 2026-10-04 | Round-2 task branches, each cut from `main` for one task. Ephemeral: the coordinator merges, then removes branch and worktree. Do not publish them. Three worktrees hold uncommitted work (see below): the coordinator must keep it until committed. |

`git ls-remote origin` (read-only) returned exactly `main` `b8c00bf`, `desktop-rendering-stage-c` `81048c8`
and `opus55/render-submit-20260929` `a8b98f3`, equal to the local remote-tracking refs, so the Pi has not
moved since the proposal. There is no stash. The remote is
`caldor@192.168.50.17:/srv/git/repositories/universe-atlas.git`; that LAN login is printed in `README.md`
(section 5).

### Worktrees (15 registrations)

| Worktree | Branch / HEAD | Uncommitted files | Proposed disposition |
|---|---|---:|---|
| `C:/LLM/IWSDK/universe-atlas` | `main` `b7d1df3` | 0 | Primary checkout (`test-results` is a link here). |
| `universe-atlas-wt/eye-EC4` | `eye-round/EC4` `0ebc88e` | 0 | **HELD.** Leave exactly as is. |
| `universe-atlas-wt/gh-pack` | `work/github-pack` `5baf263` | 0 | Merge or retire with the pack task. |
| `universe-atlas-wt/r2-biome2-eco`, `-biome2-replan`, `-creature-export`, `-golden-ext`, `-harness-rerun`, `-landing-fixes`, `-owner-decisions` | `round2/<id>` | 0 | Coordinator removes each after merging. |
| `universe-atlas-wt/r2-biome2-grid`, `-ocean-present`, `-relief-present` | `round2/<id>` at `main` | 2, 3, 2 | In-progress work. Do not remove before it is committed. |
| `universe-atlas-wt/r2-migration-prep` | `round2/migration-prep` | this task | Commit, then coordinator merges and removes. |
| `.../scratchpad/ec2-base` (under the Claude temp directory, outside the project) | detached `37e2663` | 0 | An old `main`, contained in `main` (0 ahead, 89 behind). Stale registration: after the temp directory is cleaned, `git worktree prune` (or `worktree remove`) clears it. |

`.gitignore` also ignores `.claude/worktrees/`.

## 2. Largest files

Working tree at `b7d1df3`: 2,026 tracked files, 475,426,668 bytes. History (all refs, measured earlier in
the run; one more blob has appeared since): 3,368 unique blobs, 445 MB raw, one 333 MiB pack plus about 10 MiB loose. The largest single blob is
7.4 MB, so **no file approaches GitHub's 100 MB per-file limit**. 129 blobs are at least 1 MiB
and add up to 224 MB.

Largest tracked files (bytes):

| Bytes | Path |
|---:|---|
| 7,393,482 on disk (7,391,635 as the committed blob; the difference is CRLF conversion under `core.autocrlf`) | `test-results/offline-foliage-mips/mid-pair-down-390m-rerun/report.json` (and an identical copy under `opus-near-far-family-review/`) |
| 5,865,816 | `public/assets/fauna/deer-doe-v1/revisions/757f6c47.../513c7766.../deer-doe.glb` |
| 5,761,612 | `public/assets/fauna/deer-doe-v1/deer-doe.glb` (byte-identical to the `23233caf...` revision copy: three deer paths but two distinct byte sets) |
| 5,592,064 | `public/assets/forest/desktop-v1/{spire,branching}/foliage-mips.rgba8` (two files) |
| 4,764,524 | `public/assets/forest/desktop-v1/spire/conifer-lod0.glb` |
| 3,969,868 | `public/assets/forest/desktop-v1/branching/oak-lod0.glb` |
| 3,643,636 | `test-results/tree-asset-lab-v7-color-a/lod0-population192.png` |
| 3,304,920 | `public/assets/forest/desktop-v1/spire/conifer-lod1.glb` |
| 2,603,256 | `public/assets/forest/desktop-v1/branching/oak-lod1.glb` |

By area at HEAD: `test-results/` 414 MB in 1,195 files (120 top-level evidence directories,
602 PNGs of 377 MB); `public/` 44 MB in 33 files; `assets/` 7.8 MB; `tests/` 4.7 MB; `src/` 3.1 MB;
`docs/` 2.2 MB. In history, `test-results/` accounts for 1,020 blobs and 346 MB, about 78% of all
blob bytes.

**Finding: `test-results/` is ignored yet tracked.** `.gitignore` lists `test-results/`, but
1,195 files under it were force-added (browser evidence, review sheets, reports). It is the
only large-asset question for the upload:

| Option | Effect | Cost |
|---|---|---|
| A. Push as is | About 333 MiB pack; all hashes and every doc citation of a commit or evidence path stay valid. | Large first push; evidence permanently in history. |
| B. A plus stop tracking (`git rm --cached`) going forward | New clones stop growing from evidence; history still carries the 346 MB. | Docs that cite `test-results/...` paths no longer resolve in a fresh checkout. Check each `tests/*.browser.mjs` default output path first. |
| C. Rewrite history to drop `test-results/` before seeding GitHub | Smallest repository. | Rewrites the hash of every commit from the first one that added evidence (`a755f1b`) onward, which is nearly all of them; docs and evidence directories cite hashes (`4c776b8`, `d751a09`, ...); conflicts with "preserve unpublished commits"; one-way. |

Recommended default: **A now, B after the first push**, because the repository is far below
GitHub limits, nothing needs LFS, and C breaks the hash citations the project relies on. This
is an owner decision and it is OPEN.

Eleven tracked evidence files under `test-results/` contain the local user path
`C:\Users\...`; `README.md` contains the Pi login. Decide whether that is acceptable for a
private repository (section 5).

## 3. Provenance and licence state

* **There is no project `LICENSE` file**, and no `AGENTS.md`, `CLAUDE.md`, `.github/` or
  `CONTRIBUTING` in the repository (the parent IWSDK repository has `AGENTS.md`). The choice of
  licence is an owner decision (backlog task 1, "the project licence"). OPEN.
* Third-party notices that are present: `public/three-LICENSE.txt`, `public/rapier-LICENSE.txt`,
  `public/river-geometry-LICENSES.txt`, `public/charactercreator-LICENSE.txt` (code provenance
  of the adapted `kblood/CharacterCreator` file), `public/assets/forest/desktop-v1/licenses/ez-tree-MIT-LICENSE.txt`
  and `src/vendor/three-ez-impostor/LICENSE`.
* Ground materials (`assets/ground-materials-v1/`) declare `CC0-1.0` with Poly Haven author
  records in the bundle metadata. This is the only shipped asset family with a real licence
  expression.
* **Nine shipped `public/` assets declare `NOASSERTION`** (all through their own sidecars):
  the four forest GLBs (EZ-Tree geometry is MIT, Atlas textures original, and the bundle says the
  original texture licence "remains NOASSERTION"), the two `foliage-mips.rgba8` payloads, and the
  three deer paths (`deer-doe.glb` and two retained revisions; two distinct byte sets), whose authoring manifest
  says "resolve original asset license ... before packaging for publication"). The deer is also
  status `proposal-needs-review`, so it is not a shippable asset under `AGENTS.md` until accepted.
* `src/tree-impostor-lab.ts` loads GLB pairs that are **not in this repository**. They live in the
  parent repository's ignored `Assets/_assetctl/`. The new sidecar
  `assets/briefs/tree-impostor-lab-inputs.sidecar.json` records each family's file names, sha256,
  size, canonical location, brief and licence state. The oak and conifer pairs are
  byte-identical to the shipped `public/` pair (hashes verified); `atlas-branching-v1` is not
  shipped. `atlas-branching-v1.*` provenance is the brief `assets/briefs/temperate-branching-tree-v1.json`.

### The gate: `tests/asset-provenance.test.mjs`

Reads only; changes no asset. It scans every file under `public/` and the four shipped ground runtime
textures in `assets/ground-materials-v1/runtime/` (13 assets in all). Rules, strengthened after the
Astra review (section 8):

* **Binding.** A sidecar binds an asset only through a structured `sha256` field equal to the file's hash,
  in a `.json` beside it (for the ground runtime textures, one directory up). A hash in prose or as a key
  does not bind; a missing binding is `no-sidecar`.
* **Licence.** The bound sidecars must declare at least one licence expression and none may be
  `NOASSERTION`, `NONE`, empty or malformed (a non-string `expression` is invalid). A bound record that
  declares no licence (a retained-revision record) is neutral only if another bound sidecar declares a good one.
  Residual limit: licence is read per sidecar file, not per asset record inside a multi-asset manifest.
* **Coverage.** Any extension that is neither an asset format nor `.json/.txt/.md` is a violation
  (`unclassified-extension`), as is a symbolic link; a missing scan root throws.
* **Allowlist.** Nine exact paths in the test file, no wildcards. Each pins the asset's sha256, waives only the
  licence rules (`noassertion`, `no-license`; never `no-sidecar`), is dated `2026-10-04`, names what it waits on
  (the owner licence decision) and expires `2026-12-31`. An expired, future-dated, non-calendar-date, unpinned,
  byte-changed, stale (file gone or already compliant) or malformed entry fails, so the list can only shrink.
  Retiring an entry means fixing the asset's sidecar with the owner's licence expression and deleting the line.
* **Clock.** The production gate always uses the real date; only the synthetic tests inject one.

Negative tests on synthetic trees prove every rule fires (no sidecar, `NOASSERTION`, absent licence, hash drift,
prose and key hashes, malformed licence, a bound `NOASSERTION` beside a licensed sidecar or an unrelated MIT,
unclassified extension, symbolic link (skipped silently where the OS refuses to create one), missing root,
ancestor-sidecar scope, and each allowlist failure including replaced bytes and a lost sidecar). The real scan
finds exactly the nine allowlisted assets and nothing else. While strengthening it, the tests caught two defects
in the gate itself (a thrown error on an impossible calendar date, and a fixture using an already-classified
extension).

Merger: register `tests/asset-provenance.test.mjs` in `package.json` (not edited by this task). It is **not in the
selection graph** (it scans directories dynamically, so `test:affected` will not select it for a new asset): run it
for any change under `public/` or `assets/ground-materials-v1/`, or keep it in every migration check. The expiry
means the suite will start failing on 2027-01-01 unless the entries are resolved or re-reviewed; that is intended.

## 4. Clone and reproducibility notes (proposal step 5)

A fresh clone of `universe-atlas` alone does **not** reproduce the full workflow:

* `tests/helpers/gpu-lock.mjs` and `tests/helpers/test-slot.mjs` default to
  `C:/LLM/IWSDK/.gpu-browser-lock` and `C:/LLM/IWSDK/.atlas-test-slot`. Both accept an environment
  override (`ATLAS_GPU_LOCK_DIR`, `ATLAS_TEST_SLOT_DIR`). Separate overrides do not coordinate
  between clones.
* `tests/fauna-template.browser.mjs` imports `../../tools/assetctl/third-party/charactercreator/glbpack.js`
  from the parent repository: the two-repository layout (`IWSDK/universe-atlas`) is a hard dependency
  for that test.
* Browser tests that montage images look for `C:/LLM/IWSDK/tools/bin/imagemagick/magick.exe` unless
  `MAGICK` is set.
* `scripts/luna-eyes.mjs` needs the Codex CLI and the `gpt-6-luna` model; Astra work needs the
  Codex CLI with `gpt-6-astra`.
* `Assets/_assetctl/` (tree and fauna source candidates, review renders, provenance) is ignored by
  the parent repository and is not transferred by any clone (section 3).
* The checkout uses `core.autocrlf=true`. `.gitattributes` marks only some paths `-text` (the forest
  bundle, fauna and some `test-results/` evidence); any other hash-pinned text file can change bytes on a
  new Windows clone. Review before relying on cross-machine hash pins.
* Node 24 is required by the test policy; `package-lock.json` is committed.

## 5. Sensitive-content scan

`git grep` over tracked non-evidence files found no credential-looking strings. It did find
the Pi login `caldor@192.168.50.17` in `README.md` and the local user path in eleven evidence
files. Commit authorship is a single identity (540 commits on `main`, `Kasper`) with an e-mail address in every
commit; that is published by any push. These are for the owner to accept or scrub before
any upload; no automated secret scanner was run.

Closure steps before an upload (all proposals): run a history-wide secret scan over every ref intended for
publication, including the evidence under `test-results/` (the scan above covered tracked non-evidence files at
`HEAD` only); decide the e-mail and path questions; and preserve uncommitted worktree content (section 1 lists
three worktrees with uncommitted files, and the untracked parent-repository docs are outside this repository).

## 6. Rollout step 1 checklist

| Step | Prepared here | Needs |
|---|---|---|
| Capture local and remote tips | Section 1 | Re-run immediately before upload. |
| Preserve unpublished commits | `eye-round/EC4` (11, after today's advance) and `biome-round/W2-C-FOREST-C2-held` (1) exist only locally | Owner: publish as branches, or bundle them (`git bundle`) as a local backup. |
| Record shared tooling version | Not done: the parent IWSDK revision that Atlas needs is not recorded | Record `git -C C:/LLM/IWSDK rev-parse HEAD` plus the assetctl version at upload time. |
| Review files and history for upload | Sections 2, 3, 5 | Owner decisions in section 7. |
| Large assets | Section 2: nothing near the limit; option A | Owner confirms A or B. |
| Root IWSDK `.github/` | Out of scope here | Needs an explicit re-include in the parent allowlist. |
| Agent contract for Atlas (step 4) | Not created: `AGENTS.md` is absent from Atlas | Separate task. |

## 7. Decisions this document cannot make (all OPEN)

1. Project licence (and its effect on the nine allowlisted assets).
2. Whether and when to upload; account, visibility, repository names.
3. `test-results/` policy: A (push as is), B (stop tracking later) or C (history rewrite).
4. Publish or bundle the two local-only held branches (`eye-round/EC4` stays HELD regardless).
5. Whether the Pi login in `README.md`, the local paths in eleven evidence files and the commit
   e-mail are acceptable in a private repository.
6. Who retires `origin/desktop-rendering-stage-c` and `origin/opus55/render-submit-20260929`
   after cutover.

Unrelated OPEN owner items from the backlog (Lethuris L6 name ceiling 6.9 to 7.0 %, strict
post-relief LOD class and colour targets, reduced seabed detail, landing no-summit, clouds deferred,
flooded ground bookmark, quiet-host performance, headset, EC4 proboscis allowance) are untouched.

## 8. Astra review, and what was and was not run

Astra (`gpt-6-astra`, Codex CLI, read-only) reviewed this change; its answer is kept at
`test-results/round2-2026-10-04/migration-prep/astra-review.md`. It confirmed all six external GLB hashes and
sizes. Its findings and what was done:

| Astra finding | Action |
|---|---|
| Hash binding and licence checks bypassable (hash in prose, masked NOASSERTION, malformed `expression`) | Fixed: structured `sha256` binding, any bound NOASSERTION or malformed licence fails; tests added. Residual per-sidecar (not per-record) licence reading is documented. |
| Allowlist hid replaced bytes and lost sidecars | Fixed: entries pin sha256 and waive only licence rules; a lost sidecar or changed bytes fails. |
| Gate not registered and not in the selection graph | Documented for the merger (section 3); registration is the merger's, not edited here. |
| Coverage gaps (GIF/AVIF/KTX/DDS/TGA/TIFF/SVG, symlinks, swallowed walk errors, ground runtime textures) | Fixed: unclassified extensions and symlinks fail, a missing root throws, ground runtime textures are scanned. |
| Expiry bypass (`2026-99-31`, clock override, `since` unchecked) | Fixed: real calendar dates, ordering, future-dated entries, no clock override in production. |
| Ref inventory wrong or stale (remote relationships reversed, EC4 moved, missing worktrees, drift) | Fixed: section 1 rewritten from a fresh snapshot with all 15 worktrees. |
| Document untracked | Committed with this change. |
| File claims (7.39 MB checkout vs blob, deer byte sets, `.gitattributes` scope, history-filter scope) | Corrected. |
| Risks need closure steps (secrets in history, dirty worktrees, toolchain revision, fresh-clone check) | Added to sections 5 and 6 and to the sidecar. |

Astra did not run the test file (its fixtures write temporary files) and ran no secret scanner. The corrected
version was not re-reviewed by Astra; the fixes are verified by the new negative tests only.

Run: `npm run test:pkg -- tests/asset-provenance.test.mjs` (8 of 8 pass, after the fixes); `npx tsc --noEmit`
(exit 0; no TypeScript changed); `npm run test:affected -- --base main` (exit 0; it ran only the new, still
unregistered test); read-only `git` queries; `git ls-remote origin`; sha256 of the shipped and parent-repository
GLBs.

Not run: the digests, any browser or capture, Luna (no visual change), a secret scanner, `git bundle`, `git gc`,
`test:full`, or any measurement of an actual upload. History byte totals come from `git cat-file --batch-check` over
`git rev-list --objects --all`. The symlink negative test is skipped silently where the OS refuses to create a link.
