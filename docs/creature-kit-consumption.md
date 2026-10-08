# How Atlas consumes creature-kit

Date: 2026-10-07. Branch `infra/creature-kit-consume` (from main `ab6042c`). Written and implemented by Claude Opus 5.5.
Owner decision: Kasper, 2026-10-07, the creature kit is its own repo (`C:/LLM/IWSDK/creature-kit`) that Atlas consumes
(`docs/owner-decisions-2026-10-04.md`, "Owner answers 2026-10-07", A18 Q6). Plan:
`C:/LLM/IWSDK/docs/creature-kit-extraction-plan-2026-10-04.md` (question 6 default: a vendored, sha-pinned build with
`VENDOR.json`, a sync script and a drift test, not a `file:../` link).

## Constraints for this step

- No download, no `npm install`/`ci`, no change to `node_modules`.
- No digest may move: skin digests (`composer-skin4-links`), export `V1_PINS`, the golden set (which includes the fauna
  composer), `life-cpu-digest` (lineage B imports `fauna-coat-*`).
- A fresh Atlas clone must still build, test and deploy with nothing else on disk.

## Options compared

| Option | Download / node_modules change | Digests and source hashes | Fresh Atlas clone | Verdict |
|---|---|---|---|---|
| A. **Vendor in place**: the kit's files sit at their original Atlas paths, byte-identical; `vendor/creature-kit/VENDOR.json` pins kit commit + sha256 per file; `scripts/sync-creature-kit.mjs` refreshes; a drift test fails on any mismatch | none | unchanged by construction: not one byte of `src/` changes, and the export sidecar's `generator.sourceSha256` hashes `src/<file>` paths, which stay the same | self-contained | **chosen** |
| B. Vendor the kit's `dist/` under `vendor/creature-kit/dist/` and turn the 14 `src/` modules into re-export shims | none | the shims change the bytes of `src/fauna-composer*.ts`, so `generatorSourceHash` (and every export sidecar) moves, `V1_PINS.core` no longer matches and the v1 byte pins skip; the tests that hash or parse `../src/fauna-composer-*.ts` by path (eyes, face, eye-catalogue, lod, export boundary) read shims | self-contained | the plan's phase-4b shape; deferred: it moves pinned values and needs a documented re-key |
| C. Relative import `../../creature-kit/src/...` | none | unchanged | **breaks**: the kit must sit next to the clone; Vite `fs.allow`, `tsconfig` `include` and the deploy build all need edits; worktrees under `universe-atlas-wt/` resolve a different relative path | rejected |
| D. `"creature-kit": "file:../creature-kit"` dependency or `npm link` | changes `node_modules` (and the lockfile) | Node refuses to type-strip `.ts` inside `node_modules`, so Atlas would have to run the kit's `dist/` | needs the kit on disk at install time | rejected (forbidden this round, and the plan rejects `file:../`) |
| E. git submodule | none, but a fresh clone needs `--recurse-submodules` and the kit has no remote | unchanged if mounted at the same paths, which a submodule cannot do for single files | breaks without the submodule fetch | rejected |

## What A means in practice

- **The kit is the source of truth for the vendored files** (`VENDORED_PATHS` in `scripts/sync-creature-kit.mjs`, also
  listed in `vendor/creature-kit/VENDOR.json`): the 12 core modules, `fauna-composer-export.ts`,
  `fauna-composer-lod.ts`, `scripts/export-creature.mjs`, the quest-3 brief template, the 18 Atlas-free
  `tests/fauna-composer-*.test.mjs`, their helper, `tests/fauna-face-specimens.json` and the 8 composer fixtures.
- **Atlas-owned and NOT vendored:** the Creature Lab (`creature-lab*.ts`, `fauna-review-*`), `tests/fauna-composer.test.mjs`
  (imports `creature-lab-state.ts`), `tests/fauna-coat-fields.test.mjs` (its asymmetry test also checks the lineage-B
  `sampleFaunaCoat`; the kit's copy drops that half) and `tests/creature-core-boundary.test.mjs` (the kit's copy adds a
  `src/**` rule).
- **Changing composer code:** edit and commit in `C:/LLM/IWSDK/creature-kit`, then in an Atlas worktree run
  `node scripts/sync-creature-kit.mjs --write --kit C:/LLM/IWSDK/creature-kit` and commit the changed files with
  `VENDOR.json`. An edit made directly in Atlas fails `tests/creature-kit-vendor.test.mjs`.
- **Check without writing:** `node scripts/sync-creature-kit.mjs --kit <dir>` (exit 1 on drift). With
  `CREATURE_KIT_DIR` set, the vendor test also compares a kit checkout.
- **Line endings:** sha256 is over LF-normalised text, so the CRLF Windows checkout and the LF blobs hash the same.

## Sync 2 (2026-10-08, branch `infra/creature-kit-sync-2`, task R7)

- `node scripts/sync-creature-kit.mjs --write --kit C:/LLM/IWSDK/creature-kit` at kit main `c5b0cde` (was `6ca5e18`):
  coat crisp v1 (`fauna-composer-skin-5`, `fauna-composer-coat-crisp-1`), export v3 (`fauna-composer-export-3`,
  `fauna-composer-skeleton-1`), the re-keyed export `V1_PINS` and the kit README. 15 vendored files changed.
- Two paths added to `VENDORED_PATHS` (44 -> 46): `tests/fixtures/composer-skin5-links.json` (the vendored
  `fauna-composer-skin4-links.test.mjs` now reads it) and `tests/fauna-composer-coat-crisp.test.mjs` (Atlas-free, so
  vendored like the other composer tests).
- **Licence: `UNLICENSED`** (owner decision A13, 2026-10-07: "Den licens skal være den samme som resten"). The sync
  script copies the kit's `package.json` licence, so it needed no change; `tests/creature-kit-vendor.test.mjs` now
  expects `UNLICENSED` with the message "owner decision A13, 2026-10-07" (it expected `NOASSERTION` while A13 was open).
- Gates (through `test-slot.mjs --shared 4`): tsc 0; `creature-kit-vendor` 3 / 3 with `CREATURE_KIT_DIR` set;
  `life-cpu-digest` 2 / 2 against `e6a0b39`, unchanged (lineage B imports `fauna-coat-*`), which is also guarded by
  the kit's `coat-lineage-b-guard.json`.
- **Golden: not re-pinned.** The four-engine run (`run-cross-engine.mjs --strict --update`) FAILED: Chromium 149 and
  Firefox 151 equal Node on every key; WebKit 26.5 differs on `fauna` only (WebKit a8e59237... vs Node fefcb903...).
  Cause, measured: ostrich skin positions, two coincident `round eyes` vertices (3654 and 3674, head-weighted), off
  by up to 8.1e-6 m (over the 1e-6 fauna quantum); every other skin array of all specimens is within the quantum.
  `golden.json` is left as on main (fauna still pins skin-4); `placeQuery` is confirmed: all four engines equal Node and
  main's pin. Open for the kit; cause not yet isolated (hypothesis: an eye-seating ray near-tie on the skin-5 unfolded blend, like the earlier ocellus seam).
- `needs: package.json` "test": register `tests/fauna-composer-coat-crisp.test.mjs`. `needs: tests/tiers.json`: tier it
  with the other composer tests.

## Moving to the plan's phase 4b later

Option B (vendored `dist/`, `creature-kit/three` and `creature-kit/gltf` entry points, the Lab as a kit app) stays the
target of phase 4b. It needs a documented re-key of `V1_PINS.core` and of the sidecar `generator.sourceSha256`, and the
boundary test's rule becomes "Atlas imports creature code only through the kit's entry points". Option A does not block
it: the sync script and `VENDOR.json` carry over, only the vendored paths change.

## needs:

- `needs: package.json` "test": register `tests/creature-kit-vendor.test.mjs` (package.json is merger-owned). Until then
  `npm run test:affected` selects it, `npm test` does not.
- `needs: tests/tiers.json`: put `tests/creature-kit-vendor.test.mjs` in the fastest tier (it reads 46 small files, < 1 s).
