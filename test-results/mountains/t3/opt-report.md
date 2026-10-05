# T3 value-preserving cost follow-up (unofficial)

No test slot, network, package installation, commit, version change, pin replacement or budget change. Main was read-only. All timings below are unofficial; the coordinator owns official acceptance.

Retained: belt seed memoization in `src/terrain.ts`; dense halo-aware lattice caches, one raw-grid lookup per correction, single-face vector selection, and direct texel stores in `src/planet-tiles.ts`; eight tile and full-output sampler guards in `tests/lod-carving-reduction.test.mjs`. Evidence scripts/logs/snapshots are under this directory.

The default and mountain fields retain their values. The tile optimisations also apply with mountains off. No sampler cache or terrain-core rewrite remains.

## Quick benchmark: before and after

| World | Level | Before main/on ms | Before growth | After main/on ms | After growth |
|---|---:|---:|---:|---:|---:|
| Maithea | 0 | 26.01/32.54 | +25.1% | 26.93/28.13 | +4.5% |
| Maithea | 1 | 23.5/26.28 | +11.8% | 23.9/23.32 | -2.4% |
| Maithea | 2 | 22.02/26.24 | +19.2% | 23.79/22.69 | -4.6% |
| Maithea | 3 | 26.98/27.81 | +3.1% | 24.95/23.94 | -4.0% |
| Maithea | 4 | 24.27/27.62 | +13.8% | 25.26/25.28 | +0.1% |
| Maithea | 5 | 25.2/27.99 | +11.1% | 25.05/23.24 | -7.2% |
| Raiva | 0 | 23.65/27.84 | +17.7% | 24.48/24.58 | +0.4% |
| Raiva | 1 | 23.6/26.5 | +12.3% | 23.88/23.12 | -3.2% |
| Raiva | 2 | 22.72/28.23 | +24.3% | 21.99/21.39 | -2.7% |
| Raiva | 3 | 23.49/27.05 | +15.2% | 23.19/21.64 | -6.7% |
| Raiva | 4 | 24.17/28.95 | +19.8% | 22.85/22.2 | -2.8% |

## Contract protocol (five rounds, fresh process per world)

| Level | Maithea | Selawyn | Raiva | Lethuris |
|---:|---:|---:|---:|---:|
| 0 | +0.2% | -3.6% | -3.1% | -1.0% |
| 1 | +2.8% | +3.5% | -1.5% | +1.2% |
| 2 | +2.7% | -0.5% | -1.3% | +1.6% |
| 3 | -1.8% | -1.4% | +2.9% | +1.3% |
| 4 | -0.3% | -2.7% | +3.5% | -1.6% |
| 5 | +3.7% | -2.0% | — | -0.2% |
| 6 | — | -5.4% | — | -3.0% |

Every measured coarse level is <= +10% on this unofficial run.

## Mountains-off control

Maithea L0..5: -15.2%, -17.0%, -14.4%, -17.8%, -18.1%, -19.0%.
Raiva L0..4: -11.4%, -19.1%, -14.9%, -19.2%, -18.3%.

## Identity (captured before changes)

All eight complete tile hashes below are unchanged. Hashing covers all fields and buffers, using binary doubles including signed zero. The full sampler ledger covers truth and L0..22 on 259 directions per world, including three massif sites; all 96 hashes are unchanged.

| World | L(cut-1) SHA-256 | L(cut) SHA-256 |
|---|---|---|
| Maithea | 05a0aea70e33e2b0c36594f69041d4dbb86bfbd57db25280569ab91a894384af | 2e3759c5235bb8fb179ff6a6dd7d8c62cf7c4445785165977f3f5e091ae44194 |
| Selawyn | 565f77b3c215ccc08d22bff6dcadd8988775f63515329e3ed6e98ba1638c321d | 59cac04c2bdc58b6e5cf3a616995e4fe7d0faf9cfb2962fb4f861fbe24e5f558 |
| Raiva | fc27a747f83127b7ec7ad5c9d8b5d8cc3684906b1232f74f41c88494aa0a474e | d1b2089dec6817c5bfa4104305b43f46699f46e7fb55b46fdd8661c401d42d55 |
| Lethuris | 2640201199c1f4523b0b8a10a7d148104cc37526298e16f1d4412e468b530557 | 26e7faa3c55e995b2b6d0b3c8defa35a1d8aa3e80fddf4488b60b0d5b05a89d9 |

Truth comparison: 15,120 directions per world, zero mismatches on all four worlds. BASE is the saved pre-optimisation ea0c802 source with only the staging constant enabled, whose truth is the unoptimised T3 truth. A92 is a read-only git archive of 92afaa3; its historical pre-T2 differences remain INFO.

| World | Equal before/after truth SHA-256 |
|---|---|
| Maithea | 76c0b6686ed2217aab8b00399917d5b4f791f3b92b8d09d51a17ece70fc72ef8 |
| Selawyn | 0256128b34d2123679c939ed47125af76ca04bcdc20d265c2fab023ebf7bd905 |
| Raiva | 1d8107d3ba7ad491cb373898fcea26b5e4d785564234102963f657a736cf17be |
| Lethuris | d57e728bef60eb0f195ebd8d86d29ce48c980cb8ff4d51f95c7f42524126d3a2 |

## Commands and exit codes

```text
npx tsc --noEmit -p .
node --test tests/lod-carving-reduction.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/mountain-carving.test.mjs tests/mountain-carving-pin.test.mjs tests/terrain-mountains-assembly.test.mjs tests/terrain-elevation-identity.test.mjs tests/lod-consistency.test.mjs tests/planet.test.mjs
node test-results/mountains/t3/truth-identity.mjs test-results/mountains/t3/opt-baseline test-results/mountains/t3/opt-a92 test-results/mountains/t3/opt-truth-identity.json
node test-results/mountains/t3/opt-identity.mjs test-results/mountains/t3/opt-identity-before.json
node test-results/mountains/t3/opt-identity.mjs test-results/mountains/t3/opt-identity-after.json
```

Final tsc and suite: exit 0; 91/91 tests pass. Truth and both identity captures: exit 0. This report generator asserts equality of the before/after ledgers and the four truth comparisons.

Before and after (exit 0): `node test-results/mountains/t3/tile-bench-arms.mjs Maithea C:/LLM/IWSDK/universe-atlas 0,1,2,3,4,5 main,on`

Off control (exit 0): `node test-results/mountains/t3/tile-bench-arms.mjs Maithea C:/LLM/IWSDK/universe-atlas 0,1,2,3,4,5 main,off`

Before and after (exit 0): `node test-results/mountains/t3/tile-bench-arms.mjs Raiva C:/LLM/IWSDK/universe-atlas 0,1,2,3,4 main,on`

Off control (exit 0): `node test-results/mountains/t3/tile-bench-arms.mjs Raiva C:/LLM/IWSDK/universe-atlas 0,1,2,3,4 main,off`

Exit 0: `node test-results/mountains/t3/contract-build-bench.mjs Maithea C:/LLM/IWSDK/universe-atlas 5 test-results/mountains/t3/opt-after-contract.json`

Exit 0: `node test-results/mountains/t3/contract-build-bench.mjs Selawyn C:/LLM/IWSDK/universe-atlas 5 test-results/mountains/t3/opt-after-contract.json`

Exit 0: `node test-results/mountains/t3/contract-build-bench.mjs Raiva C:/LLM/IWSDK/universe-atlas 5 test-results/mountains/t3/opt-after-contract.json`

Exit 0: `node test-results/mountains/t3/contract-build-bench.mjs Lethuris C:/LLM/IWSDK/universe-atlas 5 test-results/mountains/t3/opt-after-contract.json`

## Discarded experiments

- Seed memo alone was insufficient (Maithea quick +7.9% to +21.9%); retained to remove the known per-tile hashing.
- Out-of-line mountain helper, early grid rejection, numeric argument buffer, partial/full mountain prepasses, optional precomputed ridge parameter, and extracting the whole ridge expression: no reliable budget win. All removed.
- Reusing tile samplers improved the quick test but missed the contract protocol (Maithea +11.0% to +18.5%); removed, including body-input invalidation logic.
- Routing grid-rejected directions through a real mountains-off sampler also missed the contract (+13.7% to +21.5%); removed.
- Numeric Map keys helped, then were replaced by a dense halo array. Texture stores and lattice indexing supplied the material gain; no mountain arithmetic changed.

Candidate logs use `opt-<variant>-*`. The earlier `opt-final-contract-*` files are intermediate evidence (numeric/dense cache transition), not the final set; use `opt-after-contract.*` for final measurements.

Not run: official quiet-slot measurements, full repository suite, browser/headset checks. No requested check was skipped.
