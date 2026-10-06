BLOCK-CONFIRMED

Fidelity checks passed on `terrain-1.8.1-grain`:

- Point versus buildTile: **0 mismatches / 2,028,000 bytes**, 30 tiles covering L5–L9 and both worlds.
- Harness corner versus retained draft buildTile: **0 / 811,200 bytes**, 12 tiles at L6/L7.
- Parent interpolation, gutters, child offsets and p99 aggregation match `crossPairTile`.

Independently recomputed RGB p99 below. Each tuple is **L5→6 / L6→7 / L7→8 / L8→9**.

| Estimator | Maithea | Lethuris |
|---|---|---|
| Point | 20.922 / 11.323 / 4.832 / 1.963 | 27.238 / 17.152 / 9.481 / 4.033 |
| corner_L67 | 12.948 / 11.860 / 7.728 / 1.963 | 16.034 / 13.421 / 12.870 / 4.033 |
| box8_L678 | 17.307 / 10.478 / 4.983 / 2.230 | 20.431 / 13.054 / 8.656 / 4.910 |

Required L6→7: **≤10.19026 / ≤15.43691**. Corner fails Maithea and worsens both L7→8 pairs. Box8 fails Maithea, worsens its L7→8, and worsens both L8→9 pairs. `corner_L67` leaves L5 point-sampled; its L5 result is not the retained L≤7 draft’s result.

My refutation attempts:

| Estimator | Maithea | Lethuris |
|---|---|---|
| Adaptive quadrature, L6 | 19.002 / 12.143 / 4.832 / 1.963 | 22.919 / 17.844 / 9.481 / 4.033 |
| Adaptive quadrature, L5–L9 | 19.938 / 10.948 / 4.974 / 2.016 | 23.114 / 15.708 / 9.096 / 4.165 |
| Remove grain, L6 | 19.968 / 14.364 / 4.832 / 1.963 | 26.023 / 16.569 / 9.481 / 4.033 |
| Remove grain, L6–L7 | 19.968 / 10.097 / 12.223 / 1.963 | 26.023 / 14.280 / 13.856 / 4.033 |
| Remove grain, L6–L8 | 19.968 / 10.097 / 4.305 / 12.728 | 26.023 / 14.280 / 7.023 / 13.714 |
| Remove grain, L5–L9 | 19.146 / 10.097 / 4.305 / 1.823 | 25.421 / 14.280 / 7.023 / 2.948 |
| Retain 25% grain contrast, L5–L9 | 19.271 / 10.177 / 4.352 / 1.820 | 25.574 / 14.376 / 7.068 / 2.965 |

Adaptive quadrature replaces the 845 highest-curvature texels per texture with four midpoint samples: **1.20 colour samples/texel**. Neither configuration passes; selection overhead would also need benchmarking.

**There is a numerical loophole:** broad grain attenuation passes all four requested pair checks. But multiplying land colour by `[1+a(g−1)]/g`, with `a=0` or `0.25`, suppresses resolved grain rather than estimating its footprint mean. It fails M0’s literal structural requirement; limiting suppression to coarse levels exposes severe transition regressions. These are harness diagnostics, not buildTile-integrated or +10%-timing-certified candidates.

Thus I found no qualifying footprint estimator—not a proof that none exists. Scratch reproduction: [probe.mjs](test-results/mountains/M0-v3/astra/probe.mjs).

**Satisfied-by-grain: no.** Metric 2 compares reduction against point sampling on the same current field. Decision (b) explicitly requires rerunning M0 without threshold changes. Step G’s old→new ratios, **0.584 / 0.491**, cannot substitute for that comparison; unchanged point sampling scores **1.000 / 1.000** against the new baseline.

No tracked files modified; no git, browser, GPU, download or npm test commands run.