Changed four files:

- `src/terrain.ts`: restored `baseTerrainCore` exactly to `914d86f`; added a distinct relief-water mountain core and separate dispatch call site.
- `src/mountain-layout.ts`: added read-only `bandTagWithin`, using the exact T1 grid decision.
- `tests/terrain-mountain-core-split.test.mjs`: added identity, source-isolation and construction guards.
- `package.json`: registered the new test immediately after `sparse-consumer-levels`.

The mountain core lives in `terrain.ts`, preserves CoreSample property order, and is built only for eligible bodies with flagged massif cells. Out-of-band directions use the plain core. `terrainSamplerForceMountainCoreForTest` selects its forced predicate at construction; no per-sample test flag is checked.

Checks:

- `npx tsc --noEmit`: **exit 0**.
- Requested nine-file `node --test` command: **exit 0; 84 passed, 0 failed**, 53.8 seconds.
- New test alone: **exit 0; 7 passed, 0 failed**, 12.6 seconds using four parallel workers.
- Exact plain-core text comparison and CoreSample literal comparison: **exit 0**.
- `git diff --check`: **exit 0**.

All existing digests passed unchanged, including T3 wired identities and M1. Wiring remains false; version constants are unchanged. No benchmarks, downloads, browser/GPU work or Git writes were performed. Performance improvement remains unmeasured pending the coordinator’s benchmarks.