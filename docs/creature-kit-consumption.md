# How Atlas consumes creature-kit

Migration branch, 2026-10-11: Atlas consumes the built, self-contained Kit 0.8 public
planet entry through `#creature-kit/planet`, pinned in `vendor/creature-kit/PACKAGE.json`.
Existing genomes, population IDs and dated activity remain canonical. Normal
planet visits use the Kit's shared Composer source and terrain pose; desktop
and immersive updates retain that backend. Reduced tiers use the same anatomical
LOD constraints as realism-1 GLB export, with packed storage confined to runtime
arenas. The old quadruped renderer is selected only by the explicit
`fauna-generator=archive-quadruped` compatibility option. Kit also owns the
independent Lab. The primary `/animal-lab/` entry opens the advanced
Composer with visual controls for limbless animals, insects, turtles, dinosaurs
and proboscis heads. Planet links carry a complete resolved definition in the
fragment, preserving the actual animal's metre dimensions and coat without
another seeded variation or growth pass. `/animal-lab/planet-skin.html` is the archived quadruped inspector;
it retains tools for the planet compatibility pipeline. The old Atlas Lab remains
available with an archive label for historical inspection links.
`npm run update:creature-kit -- --kit C:/LLM/IWSDK/creature-kit` atomically preflights
and updates committed sources, built package and Lab bundle; `npm run check:creature-kit`
checks drift. No sibling-repository runtime import or npm link is required.
Authored deer references and old inspection tools remain historical resources;
they are not a second normal planet generator. The migration branch still needs
its final ordinary-world visibility/resource acceptance and deployment. Desktop
functional evidence is not a physical Quest performance result.
The following 2026-10-07/08 options and receipts are historical.

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
- First attempt at `c5b0cde` (commit `031f4b5`): golden NOT re-pinned. The strict four-engine run failed on `fauna` only:
  WebKit 26.5 built the ostrich's two coincident `round eyes` vertices (3654, 3674) up to 8.1e-6 m away from Node
  (WebKit a8e59237... vs Node fefcb903...). Cause, found in the kit (`docs/fauna-eye-seat-tie-2026-10-08.md`): the
  catalogue eye patch's `surfaceZ` fallback took the first strict minimum of `closestPointOnSoup` on an exact tie
  across a shared quad edge, so 1 ULP of engine noise picked the triangle (and the lift normal). Fixed in the kit as
  R7a-KIT-EYE-TIE (lowest-index tie within 1e-9, catalogue patch only; Node golden corpus byte-identical; 3 eye-catalogue
  entries re-pinned with `eyeTieDrift`), merged to kit main `aa89701`.
- **Re-sync at kit main `aa89701`** (the R7 commit after `031f4b5`): 5 vendored files moved (`src/fauna-composer-eye.ts`,
  `tests/fauna-composer-export.test.mjs` (V1_PINS `core` re-key only), `tests/fauna-composer-mesh-stability.test.mjs`,
  `tests/fixtures/composer-eye-catalogue-links.json`, `VENDOR.json`); still 46 paths, licence `UNLICENSED`.
- Gates at `aa89701` (through `test-slot.mjs --shared 4` unless noted): `creature-kit-vendor` 3 / 3 with
  `CREATURE_KIT_DIR`; `life-cpu-digest` 2 / 2 against `e6a0b39`, unchanged; tsc 0; `test:affected --base main` (takes the
  slot itself): 1208 tests, 1190 pass, 0 fail, 16 skipped, 2 todo; `tests/golden/perturbation.test.mjs` 5 / 5 (`fauna`
  655 records, golden flips 0).
- **GOLDEN-FAUNA-2 folded back into `fauna`; the `faunaKnownUnstable` key is dropped** (D2's next-round plan,
  `docs/fauna-composer-stability-2026-10-07.md`): `tests/golden/generator.ts` loses `FAUNA_KNOWN_UNSTABLE` and the key;
  `tests/golden/perturbation.test.mjs` drops the key from its section list and `EXACT_FLIP_FINDINGS` (an empty key
  fails its "section is non-trivial" check); the stale fold note in `run-cross-engine.mjs` is updated. Records:
  `fauna` 625 + 30 = 655.
- **Golden re-pinned** (`run-cross-engine.mjs --strict --update`): "GOLDEN CROSS-ENGINE GATE: PASS (all four engines
  equal)"; Node, Chromium 149, Firefox 151 and WebKit 26.5 equal on every key. `golden.json` diff, with its ledger:

  | Key | Was | Now | Why |
  |---|---|---|---|
  | `fauna` | `6bf5d085...` (skin-4) | `75a59833...` | skin-5 coat crisp v1 (kit `c5b0cde`, gives `fefcb903...` on all four engines with the eye-tie fix, proved by a strict `--fixture` run before the fold), then GOLDEN-FAUNA-2 folded in (`fefcb903...` -> `75a59833...`) |
  | `faunaKnownUnstable` | `61e258fc...` | dropped | the fold above |
  | counts | `faunaRecords` 625, `faunaKnownUnstableRecords` 31 | `faunaRecords` 655 | the fold above |

  No other key moved: the R5/R6 `climate`, `biomes`, `census`, `placeQuery` and `terrain` pins already on main equal
  all four engines. Evidence (local, `test-results/` is ignored): `test-results/round-2026-10-08/golden-kit-sync-2/`.
- `package.json` "test" now registers `tests/fauna-composer-coat-crisp.test.mjs` (after the gloss test).
- `needs: tests/tiers.json`: tier `tests/fauna-composer-coat-crisp.test.mjs` with the other composer tests.

## Historical phase 4b proposal (planet entry and independent Lab now implemented)

Option B (vendored `dist/`, `creature-kit/three` and `creature-kit/gltf` entry points, the Lab as a kit app) stays the
target of phase 4b. It needs a documented re-key of `V1_PINS.core` and of the sidecar `generator.sourceSha256`, and the
boundary test's rule becomes "Atlas imports creature code only through the kit's entry points". Option A does not block
it: the sync script and `VENDOR.json` carry over, only the vendored paths change.

## needs:

- `needs: package.json` "test": register `tests/creature-kit-vendor.test.mjs` (package.json is merger-owned). Until then
  `npm run test:affected` selects it, `npm test` does not.
- `needs: tests/tiers.json`: put `tests/creature-kit-vendor.test.mjs` in the fastest tier (it reads 46 small files, < 1 s).
