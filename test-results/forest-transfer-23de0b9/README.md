# Forest selection transfer acceptance — 23de0b9

- Exact runtime source: 23de0b9ff5d1d28244b7548fa1530d09d0670766, validated in an isolated detached worktree.
- Build: pass. Focused suites: 75 passed, 0 failed across 15 files, including transfer protocol validation, receiver direction-length and negative-zero checks, cache, retention, habitat, patch, species, flora, aerial, profile, population, cloud, and detail tests.
- Hardware: NVIDIA GeForce RTX 5090 through ANGLE/D3D11 with ATLAS_HARDWARE=1. Desktop acceptance passed at 1440×1000 with 0 browser errors; clearance 99.13 m, 2020 trees, 1631 flora, 128 fauna, all 19 local aerial hooks attached, floraRecipeBuilds 0, worker failures/restarts 0/0. AA 0/2/4 resolved to 0/2/4; at 2560×1440 requested 4 resolved to 2 at native resolution and restored to 0.
- Movement/cache/transfer: 110.74 m geodesic ground displacement; 2 selection-worker responses after movement. Latest packet contained 18,051 cells / 1,732,896 transferred bytes; worker pack 15.3 ms and main-thread decode 4.5 ms. Cache reported 6,655 hits, 32 misses, 17,348,174 of 33,554,432 bytes, 0 evictions. Worker failures/restarts 0/0; terrain surface ready; browser errors 0.
- One-run production-preview frame profile (470 samples): frame interval p50/p95 16.8/20.8 ms; CPU planet update 11.0/14.1 ms; GPU pass sum 4.38/6.74 ms. Transfer diagnostics for desktop acceptance were 18,064 cells / 1,734,144 bytes, pack 35.8 ms, decode 2.7 ms.
- Sequential production-preview comparison on the same RTX 5090 and browser fixture, with no concurrent workloads: baseline 66c frame interval p50/p95 17.6/24.3 ms, CPU planet update 11.6/16.5 ms, GPU pass sum 4.76/7.33 ms. The 23de0b9 capture was slightly faster in this run; this is a single-run observation.

Primary reports and screenshots: desktop-rendering-production-preview and browser-movement-hardware. Comparable baseline: desktop-rendering-baseline-66c-production-preview. The earlier Vite development-server captures are retained in desktop-rendering-hardware for completeness.

## Reports

- [Development-server desktop acceptance report](desktop-rendering-hardware/report.json)
- [Production-preview desktop acceptance report](desktop-rendering-production-preview/report.json)
- [Production-preview 66c baseline report](desktop-rendering-baseline-66c-production-preview/report.json)
- [Movement and cache transfer report](browser-movement-hardware/report.json)

## Screenshots

- [Movement after lateral traverse](browser-movement-hardware/after-move.png)
- [23de0b9 near-ground production preview](desktop-rendering-production-preview/near-ground-warmed.png)
- [66c baseline near-ground production preview](desktop-rendering-baseline-66c-production-preview/near-ground-warmed.png)
