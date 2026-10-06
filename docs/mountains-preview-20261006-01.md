# Mountains T6 preview stage: mountains-preview-20261006-01

Published 6 October 2026 at Kasper's explicit request ("Kan du deploye det så jeg kan teste det?").
Status: **UNREVIEWED T6 PREVIEW: final gate not run, Luna uncalibrated.**

**Open:** <https://dionysus.dk/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01/>

This is a separate stage folder next to the live Atlas. The live root
(`https://dionysus.dk/webxr/IWSDK/universe-atlas/`) was **not** touched. Its
build stamp is still `68dc9e7d6c7b3744a1c0269cc10025f4502e038f`. That stamp was
verified byte-identical after the publish.

## Release identity

| Item | Value |
| --- | --- |
| Source commit | `40bddd795f7d7f9eb35752e3ec93be41f4acffdf` ("Re-pin golden once for terrain-1.9.0-mountains (T6)") |
| Branch | `mountains/t6-wiring` (not merged to `main`) |
| Terrain version | `terrain-1.9.0-mountains` (`src/terrain.ts` `TERRAIN_VERSION`) |
| Build time (`builtAt`) | `2026-10-06T16:03:08.824Z`, `dirty:false` |
| Upload | started `2026-10-06T16:04:05.823Z`, promoted live `2026-10-06T16:04:44.553Z` |
| Remote directory | `/var/www/html/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01/` |
| Content | 895 files, 268,340,938 bytes (full Atlas `dist/` + `.htaccess` + stamped `build-info.json`) plus `preview-manifest.json` |
| Stamp | [build-info.json](https://dionysus.dk/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01/build-info.json) carries commit, branch, `terrainVersion`, `stage` and the UNREVIEWED status string |
| Manifest | [preview-manifest.json](https://dionysus.dk/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01/preview-manifest.json) (SHA-256 of every served file) |

## What is included

The full Atlas build of 40bddd7 includes the mountain milestones **M1–M5 wired into the
runtime terrain** (`terrain-1.9.0-mountains`), plus the guide, the labs (biome, biosphere and
creature) and the docs that the build publishes. Mountains are viewed in the main Atlas
(`index.html`) on a planet, so this stage ships the whole app. It is not a single-lab stage like
`fauna-preview-20261002-01`. The Atlas header's "../" link leads to the live universe-atlas root.

## What is NOT verified

- The T6 **final gate** was not run. `npm test`/`test:full` were not run on this export, and the
  **cross-engine golden** (`test:golden`) was not run.
- **Luna calibration**: not done (uncalibrated).
- **Headset / XR**: no device test.
- Performance: no frame-rate or profile claim. The single browser check used a headless desktop browser.
- Known open T6 findings: see `docs/mountains-t6-wiring-2026-10-06.md` in the commit. For example, Raiva R1
  fails on fresh seeds (7.72 vs bound 8), and colour consistency is over tolerance on Maithea and Lethuris
  at and after the switch level.

## Commands run and exit codes

Scratch root: `C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/deploy-t6/`
(`$S` below). Nothing was built in the t6 worktree.

| # | Command | Exit |
| --- | --- | --- |
| 1 | `curl -s https://dionysus.dk/webxr/IWSDK/universe-atlas/build-info.json > $S/evidence/root-build-info-before.json` (sha256 `46284991…66734a`) | 0 |
| 2 | `git -C C:/LLM/IWSDK/universe-atlas archive 40bddd7 \| tar -x -C $S/src-40bddd7` | 0 |
| 3 | In `$S/src-40bddd7`: `git init`, `git fetch --depth 1 file:///C:/LLM/IWSDK/universe-atlas refs/heads/mountains/t6-wiring` (FETCH_HEAD = 40bddd795f…), `update-ref` + `symbolic-ref` the branch, `git reset` (index only). Workaround, see Problems. | 0 |
| 4 | `cmd /c mklink /J $S\src-40bddd7\node_modules C:\LLM\IWSDK\universe-atlas\node_modules`. package-lock is identical to main; package.json differs only in scripts. | 0 |
| 5 | `npm run build` (`tsc --noEmit && vite build`, `base: './'`), log `$S/evidence/build.log`. Only the known >800 kB rapier chunk warning. | 0 |
| 6 | `node $S/build-preview.mjs`: copies `dist/`, rewrites `build-info.json` with the UNREVIEWED status, adds `C:/LLM/IWSDK/deploy/.htaccess` (same SHA-256 as the live root's), writes the manifest | 0 |
| 7 | `node $S/deploy-preview.mjs --publish`: same mechanism as `fauna-opus-modular-001/deploy-preview.mjs`. SSH key `C:/Devstuff/GCloud/caldor_nopass` → `kaspersolesen@35.228.204.127`; precheck that the destination is absent; `tar czf`; `scp` to `/tmp`; extract to a fresh `.staging-…-e0cfe9a8`; `mv` to the absent destination; remove the remote tarball. Receipt `$S/evidence/deploy-receipt.json`. | 0 |
| 8 | `node $S/verify-live-preview.mjs` checks that the live root `build-info.json` is byte-identical to step 1 and that the root `index.html` is 200, that the live manifest matches, and that `.htaccess` matches over SSH. It then fetches **all 894 public files over HTTPS: every one HTTP 200 with matching size + SHA-256** (895 verified incl. `.htaccess`, 0 failures). Report `$S/evidence/live-byte-verification.json`. | 0 |
| 9 | Under the GPU lock (`mkdir C:/LLM/IWSDK/.gpu-browser-lock`, released after): `webxr-test check.js --url=<Maithea deep link below> --timeout=15000` (log `$S/evidence/webxr-test.log`, screenshot `maithea-live.png`) | 1 (see Problems) |

The step-9 result: navigation returned 200 and the page opened the Maithea body view (title "Universe Atlas · IWSDK").
There were 0 page errors and 0 request failures. The **only 4xx was `https://dionysus.dk/favicon.ico`**, a domain-root
request outside the stage. No stage asset failed. The harness reports FAIL for two reasons: that favicon 404, and
`crossOriginIsolated:false`. The live root has the same favicon 404 and the same isolation state. The root's
`.htaccess` sets no COOP/COEP headers, and this stage uses that same file.

## Viewer URL options for testing mountains

All URLs are relative to the stage URL. Add `?…` to `https://dionysus.dk/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01/`.
The seed defaults to `LETHRA-001`. The bookmarks are the T6 fixture worlds from `tests/helpers/render-bounds-suite.mjs`.

| World | URL |
| --- | --- |
| Maithea (snowy, main reference) | `?seed=LETHRA-001&g=G001&system=G001%2FC2128%2C0%2C1%2F0&body=G001%2FC2128%2C0%2C1%2F0%2Fplanet%2F1` |
| Selawyn | `?seed=LETHRA-001&g=G001&system=G001%2FC2142%2C3%2C4%2F0&body=G001%2FC2142%2C3%2C4%2F0%2Fplanet%2F0` |
| Raiva | `?seed=LETHRA-001&g=G001&system=G001%2FC2143%2C4%2C3%2F0&body=G001%2FC2143%2C4%2C3%2F0%2Fplanet%2F1` |
| Lethuris (snowy) | `?seed=LETHRA-001&g=G001&system=G001%2FC2142%2C6%2C1%2F1&body=G001%2FC2142%2C6%2C1%2F1%2Fplanet%2F1` |

Only the Maithea link was browser-checked. The other three addresses come from the fixture, using the same
`<system>/planet/<index>` scheme. If one opens the system view instead of the planet, pick the planet in the panel.

Once the planet is open, use **Fly over terrain** or **Land and walk** to see mountains up close. WASD moves.
After you move, the app writes `walk=x,y,z` and `heading=qx,qy,qz,qw` into the URL, and that link reopens the same spot.

Other parameters read in `src/main.ts` and `src/time-nav.ts`:

- `date=<date>` (+ `wv=`): the planet date (`resolveTimeFromUrl`). Use the in-app Time panel to produce valid values, then copy the URL.
- `detail=0`: ground detail off. `lighting=0`: surface lighting off. `trees=0`: detailed forest off, which makes bare relief easier to judge.
- `horizon=0`: atmospheric horizon assist off. `quality=<mode>`: render quality. `shadowCache=0`: disables the shadow cache.
- `profile=1`: render profiling overlay. `follow=<planetId>` / `observe=1` / `fate=`: system-view options, not needed for mountains.

## How to remove the stage

The stage is self-contained. Removing it does not affect the live root or `fauna-preview-20261002-01`:

```bash
ssh -i C:/Devstuff/GCloud/caldor_nopass kaspersolesen@35.228.204.127 \
  "rm -rf '/var/www/html/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01'"
```

Then confirm that `curl -s -o /dev/null -w '%{http_code}' https://dionysus.dk/webxr/IWSDK/universe-atlas/mountains-preview-20261006-01/`
returns 404, and that the root `build-info.json` is still `68dc9e7…`. Local scratch (`$S`) can be deleted freely. Run
`cmd /c rmdir $S\src-40bddd7\node_modules` first, which removes **only the junction**, before any recursive delete. Otherwise the
delete would follow the junction into the main checkout's `node_modules`.

## Problems and workarounds

- **`git archive` export has no `.git`**: `vite.config.ts` stamps `build-info.json` by running `git rev-parse`, `git status` and `git log`,
  so a plain export cannot build. Workaround (step 3): a throwaway scratch repo inside the export, shallow-fetched from the
  local repo (read-only for the source). The fetched HEAD is exactly `40bddd795f…`, and `git status` is clean, so `dirty:false` is
  genuine: the export equals the commit tree. No ref or file in the real repo or worktrees was modified.
- **webxr-test exit 1**: caused only by the domain-root `favicon.ico` 404 and the site-wide absence of COOP/COEP. Neither is a stage defect.
- `href="../"` in the Atlas header points at the live root, not at a site landing page. This is harmless for testing.
- No git commits were made to the source repo for the deployment itself. Only this record was added to `main` as
  `docs/mountains-preview-20261006-01.md` (docs-only branch, merged `--no-ff` under the main-merge lock). Nothing was pushed.
