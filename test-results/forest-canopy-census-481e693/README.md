# Forest canopy census cost probe — 481e693

This disposable benchmark measures CPU cost for complete 8×8 forest-patch coverage around a real near-ground forest location. It does not implement or validate a rendered canopy.

## Setup

- Source: isolated detached checkout `481e6936bbd84c68dd4de3b7bda810fab63ee455`.
- Ground direction: captured from the live Atlas app at clearance 99.1 m over body `G001/C2128,0,1/0/planet/1` (Maithea), using the same `LETHRA-001` forest fixture. Direction in body coordinates: `(0.7830496262, -0.2907992331, 0.5497900408)`.
- Grid cell: 18 m; patch side: 8 cells. Patch addresses derive from the production population-cell selector. Each included candidate is passed through the shared legacy habitat/slope logic.
- Canonical hydrology: 3 regions and 39,922 region-surface samples built for this body and supplied to terrain sampling.
- Execution: Vite-served module Worker from a minimal HTML host, with no Atlas renderer or WebGL scene loaded.

## Results

| Radius | Patches | Candidate cells sampled | Exact-circle candidate cells | Trees in exact circle | Habitat time cumulative |
|---:|---:|---:|---:|---:|---:|
| 250 m | 28 | 860 | 606 | 457 | 7.7 ms |
| 500 m | 96 | 2,950 | 2,435 | 1,856 | 14.6 ms |
| 1,000 m | 350 | 10,640 | 9,576 | 7,282 | 39.9 ms |
| 2,250 m | 1,666 | 51,092 | 48,975 | 37,214 | 158.7 ms |
| 4,500 m | 6,537 | 200,865 | 196,306 | 149,478 | 636.2 ms |

At 4.5 km, all 196,306 production-selected reference cells were covered; missing cells: 0. Complete patches added 4,559 candidates outside the exact circle. Maximum sampled distance was 4,625.4 m, or 125.4 m beyond the requested radius due to full-patch coverage.

The 4.5 km patch enumeration and patch data construction took 1,071.1 ms. Canonical hydrology construction took 244.8 ms. Full Worker roundtrip, including module startup and message handling, took 2,159.4 ms. These are one browser run and are a concrete census workload estimate, not a frame-time or GPU measurement.

## Verification and artifacts

- `build.log`: `npm run build` passed.
- `focused-tests.log`: 5 forest patch/habitat tests passed.
- `ground-direction.json`: browser-captured body, direction, hydrology, and fixture diagnostics.
- `worker-census.json` / `worker-census.log`: full Worker result and timing details.
- Disposable harness sources are in the isolated checkout under `tests/forest-census-*`; no runtime source was edited.
