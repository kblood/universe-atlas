# Shared animal system release, 2026-10-10

The native website now serves clean build `e6fa29b6fe3583912fac48ea1d8770c5de4698bb`.
It consumes the built creature-kit 0.3.0 package from committed Kit source
`8aecf223547ff00d56cfc902ac0acf2094d1f5a4`, with runtime, source and standalone
Lab receipts kept under `vendor/creature-kit/`.

The independent canonical Animal Lab is available at
`https://dionysus.dk/webxr/IWSDK/universe-atlas/animal-lab/planet-skin.html`.
Atlas's existing Lab defaults to the same Kit skin inspector. Original animal
identities, body generation versions, dated poses and habitat placement are
preserved. The composer and historical deer/anatomy galleries remain explicitly
labelled references or experiments.

Update all three Kit deliveries atomically from a committed local Kit checkout:

```powershell
npm run update:creature-kit -- --kit C:/LLM/IWSDK/creature-kit
npm run check:creature-kit
```

The release also avoids forest resource construction on physically ineligible
planets. In the measured Daunune scene this recovered 34,398,072 combined
CPU/GPU estimated bytes; the Anitar forest allocation and dated identity replay
remained unchanged. This is a measured scene improvement, not a claim that the
whole game fits a 16 MiB life allocation.

Validation: the full standard tier executed all 282 steps, with 1,801 passed
tests, 17 skipped and 4 todo. It exposed two test-gate failures: a stale landing
signature expectation and unclassified compiled Lab code. Both were repaired;
all 20 tests in those affected files then passed, including negative checks for
changed, missing and unlisted Lab code. Lab code is checked against the same
LF-normalized source/artifact receipt used by its updater; binary asset hashes
and licence gates are unchanged. Type checking and a clean production build
passed. Browser acceptance covered habitat arrival without landing, dated
identity/pose replay, eligible/ineligible forest disposal and revisit, and
standalone Lab definition export/import.

Deployment verified all 900 release files by size and SHA-256 before the atomic
promotion. Subsequent HTTPS checks verified 39 entry/bundle/Lab files by SHA-256,
the current build identity, and both retained preview routes. Rollback remains
at `/var/www/html/webxr/IWSDK/.backup-universe-atlas-e6fa29b-20261010-kit03`.
Receipts are under
`Assets/_assetctl/animal-system-20261010/deploy/`, with browser evidence under
`release-final-route/`, `release-final-lab/` and `life-memory-forest-ineligible/`.

Better animal LODs remain an active follow-up. Atlas-owned compact pools,
palette upload options and source-derived LOD methods are experimental and are
not enabled by this release. The packed coat shader, real-world appearance,
128 distinct animal admission, aggregate resource accounting, and complementary
near/LOD/fallback transitions still require acceptance. No physical Quest
validation has been claimed.
