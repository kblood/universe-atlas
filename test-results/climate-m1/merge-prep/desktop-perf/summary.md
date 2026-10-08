# Desktop perf harness summary

- **CONTENDED — not acceptance evidence**: user browser open (may hold WebGL/video): opera.exe
- Commit `0bda2a0e7b7e1b4c8870197f5ebd9587852e3b46` (climate/m1), dirty: false, built 2026-10-08T12:02:15.662Z
- Browser: 149.0.7827.55 · WebGL: ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 (0x00002B85) Direct3D11 vs_5_0 ps_5_0, D3D11) · crossOriginIsolated: true
- Host: AMD Ryzen 9 9950X3D 16-Core Processor (8 logical), harness affinity 0xFF · GPU NVIDIA GeForce RTX 5090 driver 617.14, power limit 400 W
- Viewport 2560×1440 DPR 1 · repeats 1 · conditions native
- GPU-lock waits before runs (not contention: the lock is exclusive while held): native r1 0 s
- Host CPU load before runs (max of 3 s): 8 % · GPU util before: 1 %
- GPU clock lock declared: none · observed graphics clock p50 per run: 2520 MHz
- CPU proxy: 9950X, CDP throttle 1.7×, browser affinity 0xFF (NOT the 0xFFF proxy mask; harness 0xFF) · native runs: all cores, CPU rows ×1.7 · GPU ratio proxy ×5.4 (bracket 4.5–6.5×)

**Overall: FAIL (CONTENDED)** (CPU FAIL, GPU FAIL, contended)

## CPU — S1 ground paused — native (host ×1.7)

| System | Budget ms | Host p95 ms | Target-equiv. p95 ms | Verdict | Note |
|---|---:|---:|---:|---|---|
| Terrain | 1.8 | 0.12 | 0.20 | PASS |  |
| Forest near (LOD0 detailed) | 1.6 | 0.47 | 0.79 | PASS | CPU near+middle combined (0.6+1.0): forest update is not separable by tier |
| Forest middle (LOD1 + handoff) | — | — | — | n/a | see forest near (combined) |
| Forest far (canopy, far atlas) | 0.5 | 0.01 | 0.02 | PASS |  |
| Understory flora | 0.7 | 0.19 | 0.32 | PASS | includes shared life scatter/ground queue |
| Fauna | 1.4 | 0.01 | 0.01 | PASS |  |
| Clouds | 0.2 | 0.05 | 0.08 | PASS |  |
| Rocks | 0.5 | 0.02 | 0.03 | PASS |  |
| Sky / atmosphere / ocean / lights | 0.4 | 0.00 | 0.01 | PASS |  |
| Overhead (submission + app / composite) | 4.8 | 12.05 | 20.49 | FAIL | submission 3.8 (incl. shadow) + app 1.0 |
| **Total (frame work / pass sum)** | 11.9 | 12.69 | 21.57 | FAIL | frame interval p95 host 12.83 → 21.81 ms (FAIL vs 16.7) |

## CPU — S1 100 m paused — native (host ×1.7)

| System | Budget ms | Host p95 ms | Target-equiv. p95 ms | Verdict | Note |
|---|---:|---:|---:|---|---|
| Terrain | 1.8 | 0.95 | 1.61 | PASS |  |
| Forest near (LOD0 detailed) | 1.6 | 0.32 | 0.54 | PASS | CPU near+middle combined (0.6+1.0): forest update is not separable by tier |
| Forest middle (LOD1 + handoff) | — | — | — | n/a | see forest near (combined) |
| Forest far (canopy, far atlas) | 0.5 | 0.01 | 0.02 | PASS |  |
| Understory flora | 0.7 | 0.19 | 0.31 | PASS | includes shared life scatter/ground queue |
| Fauna | 1.4 | 0.21 | 0.36 | PASS |  |
| Clouds | 0.2 | 0.04 | 0.07 | PASS |  |
| Rocks | 0.5 | 0.02 | 0.03 | PASS |  |
| Sky / atmosphere / ocean / lights | 0.4 | 0.00 | 0.01 | PASS |  |
| Overhead (submission + app / composite) | 4.8 | 11.82 | 20.10 | FAIL | submission 3.8 (incl. shadow) + app 1.0 |
| **Total (frame work / pass sum)** | 11.9 | 12.13 | 20.62 | FAIL | frame interval p95 host 12.45 → 21.16 ms (FAIL vs 16.7) |

## CPU — S2 turning 90°/s — native (host ×1.7)

| System | Budget ms | Host p95 ms | Target-equiv. p95 ms | Verdict | Note |
|---|---:|---:|---:|---|---|
| Terrain | 1.8 | 1.65 | 2.81 | FAIL |  |
| Forest near (LOD0 detailed) | 1.6 | 0.47 | 0.80 | PASS | CPU near+middle combined (0.6+1.0): forest update is not separable by tier |
| Forest middle (LOD1 + handoff) | — | — | — | n/a | see forest near (combined) |
| Forest far (canopy, far atlas) | 0.5 | 0.01 | 0.02 | PASS |  |
| Understory flora | 0.7 | 0.21 | 0.35 | PASS | includes shared life scatter/ground queue |
| Fauna | 1.4 | 4.33 | 7.36 | FAIL |  |
| Clouds | 0.2 | 0.04 | 0.08 | PASS |  |
| Rocks | 0.5 | 0.13 | 0.21 | PASS |  |
| Sky / atmosphere / ocean / lights | 0.4 | 0.00 | 0.01 | PASS |  |
| Overhead (submission + app / composite) | 4.8 | 6.25 | 10.62 | FAIL | submission 3.8 (incl. shadow) + app 1.0 |
| **Total (frame work / pass sum)** | 11.9 | 9.37 | 15.93 | FAIL | frame interval p95 host 9.96 → 16.92 ms (FAIL vs 16.7) |

## CPU — S3 flight 40 m/s @120 m — native (host ×1.7)

| System | Budget ms | Host p95 ms | Target-equiv. p95 ms | Verdict | Note |
|---|---:|---:|---:|---|---|
| Terrain | 1.8 | 2.21 | 3.77 | FAIL |  |
| Forest near (LOD0 detailed) | 1.6 | 0.83 | 1.42 | PASS | CPU near+middle combined (0.6+1.0): forest update is not separable by tier |
| Forest middle (LOD1 + handoff) | — | — | — | n/a | see forest near (combined) |
| Forest far (canopy, far atlas) | 0.5 | 0.20 | 0.34 | PASS |  |
| Understory flora | 0.7 | 0.86 | 1.45 | FAIL | includes shared life scatter/ground queue |
| Fauna | 1.4 | 0.42 | 0.71 | PASS |  |
| Clouds | 0.2 | 0.04 | 0.06 | PASS |  |
| Rocks | 0.5 | 0.20 | 0.34 | PASS |  |
| Sky / atmosphere / ocean / lights | 0.4 | 0.00 | 0.01 | PASS |  |
| Overhead (submission + app / composite) | 4.8 | 9.30 | 15.82 | FAIL | submission 3.8 (incl. shadow) + app 1.0 |
| **Total (frame work / pass sum)** | 11.9 | 12.28 | 20.88 | FAIL | frame interval p95 host 12.70 → 21.59 ms (FAIL vs 16.7) |

## CPU — S3 walk 1.6 m/s — native (host ×1.7)

| System | Budget ms | Host p95 ms | Target-equiv. p95 ms | Verdict | Note |
|---|---:|---:|---:|---|---|
| Terrain | 1.8 | 0.51 | 0.87 | PASS |  |
| Forest near (LOD0 detailed) | 1.6 | 0.41 | 0.69 | PASS | CPU near+middle combined (0.6+1.0): forest update is not separable by tier |
| Forest middle (LOD1 + handoff) | — | — | — | n/a | see forest near (combined) |
| Forest far (canopy, far atlas) | 0.5 | 0.01 | 0.02 | PASS |  |
| Understory flora | 0.7 | 0.29 | 0.48 | PASS | includes shared life scatter/ground queue |
| Fauna | 1.4 | 0.38 | 0.64 | PASS |  |
| Clouds | 0.2 | 0.05 | 0.08 | PASS |  |
| Rocks | 0.5 | 0.13 | 0.21 | PASS |  |
| Sky / atmosphere / ocean / lights | 0.4 | 0.00 | 0.01 | PASS |  |
| Overhead (submission + app / composite) | 4.8 | 6.94 | 11.79 | FAIL | submission 3.8 (incl. shadow) + app 1.0 |
| **Total (frame work / pass sum)** | 11.9 | 8.03 | 13.64 | FAIL | frame interval p95 host 8.32 → 14.14 ms (PASS vs 16.7) |

## GPU ratio proxy — hide-one-system at frozen pose low100 (native, ×5.4)

| System | Budget ms | Host Δp95 ms | ×5.4 ms | Bracket 4.5–6.5× | Verdict | Host Δp50 ms (×5.4) | Note |
|---|---:|---:|---:|---|---|---|---|
| Terrain | 3.0 | 0.000 | 0.00 | 0.00–0.00 | PASS | 0.000 (0.00) |  |
| Forest near (LOD0 detailed) | 1.5 | 0.456 | 2.46 | 2.05–2.96 | FAIL | 0.239 (1.29) |  |
| Forest middle (LOD1 + handoff) | 2.0 | 1.437 | 7.76 | 6.47–9.34 | FAIL | 1.280 (6.91) |  |
| Forest far (canopy, far atlas) | 1.0 | 1.577 | 8.52 | 7.10–10.25 | FAIL | 1.319 (7.12) |  |
| Understory flora | 1.2 | 0.675 | 3.64 | 3.04–4.39 | FAIL | 0.599 (3.24) |  |
| Fauna | 0.5 | 0.000 | 0.00 | 0.00–0.00 | PASS | 0.163 (0.88) |  |
| Clouds | 2.5 | 3.052 | 16.48 | 13.73–19.83 | FAIL | 3.180 (17.17) |  |
| Rocks | 0.4 | 0.105 | 0.57 | 0.47–0.68 | FAIL | 0.124 (0.67) |  |
| Sky / atmosphere / ocean / lights | 1.2 | 0.101 | 0.55 | 0.46–0.66 | PASS | 0.051 (0.28) |  |
| Overhead (submission + app / composite) | 1.6 | 1.356 | 7.32 | 6.10–8.81 | FAIL | 0.099 (0.53) | frame pass sum with every attributable system hidden |
| Total (frame work / pass sum) | 14.9 | 7.217 | 38.97 | 32.47–46.91 | FAIL | 6.656 (35.94) |  |

Row = p95 of the frame pass sum with nothing hidden (median of before/after) minus p95 with that system hidden, clamped at 0. Single-system deltas are noisy (about ±0.3 ms host), so Δp50 is shown alongside. Overhead = pass sum with every attributable system hidden; Total = unhidden pass sum.

## GPU ratio proxy — hide-one-system at frozen pose groundEye (native, ×5.4)

| System | Budget ms | Host Δp95 ms | ×5.4 ms | Bracket 4.5–6.5× | Verdict | Host Δp50 ms (×5.4) | Note |
|---|---:|---:|---:|---|---|---|---|
| Terrain | 3.0 | 0.000 | 0.00 | 0.00–0.00 | PASS | 0.000 (0.00) |  |
| Forest near (LOD0 detailed) | 1.5 | 0.603 | 3.26 | 2.71–3.92 | FAIL | 0.579 (3.13) |  |
| Forest middle (LOD1 + handoff) | 2.0 | 1.340 | 7.23 | 6.03–8.71 | FAIL | 1.215 (6.56) |  |
| Forest far (canopy, far atlas) | 1.0 | 1.431 | 7.73 | 6.44–9.30 | FAIL | 1.390 (7.51) |  |
| Understory flora | 1.2 | 0.547 | 2.95 | 2.46–3.56 | FAIL | 0.711 (3.84) |  |
| Fauna | 0.5 | 0.229 | 1.24 | 1.03–1.49 | FAIL | 0.203 (1.10) |  |
| Clouds | 2.5 | 3.035 | 16.39 | 13.66–19.73 | FAIL | 2.963 (16.00) |  |
| Rocks | 0.4 | 0.168 | 0.91 | 0.76–1.09 | FAIL | 0.151 (0.82) |  |
| Sky / atmosphere / ocean / lights | 1.2 | 0.000 | 0.00 | 0.00–0.00 | PASS | 0.069 (0.37) |  |
| Overhead (submission + app / composite) | 1.6 | 1.748 | 9.44 | 7.87–11.36 | FAIL | 0.104 (0.56) | frame pass sum with every attributable system hidden |
| Total (frame work / pass sum) | 14.9 | 7.617 | 41.13 | 34.28–49.51 | FAIL | 7.074 (38.20) |  |

Row = p95 of the frame pass sum with nothing hidden (median of before/after) minus p95 with that system hidden, clamped at 0. Single-system deltas are noisy (about ±0.3 ms host), so Δp50 is shown alongside. Overhead = pass sum with every attributable system hidden; Total = unhidden pass sum.

## Scenario frame distribution (median over repeats)

| Condition | Scenario | Frame interval p50/p95/p99/max ms | CPU frame work p95 ms | GPU pass sum p95 ms | >33 / >50 ms frames | Long tasks | Signals |
|---|---|---|---:|---:|---|---:|---|
| native | S1 ground paused | 6.9 / 12.8 / 14.1 / 19.7 | 12.69 | 7.58 | 0 / 0 | 0 | forest writes (sampled) 0 |
| native | S1 ground realtime | 7.4 / 14.2 / 14.9 / 340.3 | 14.01 | 7.97 | 2 / 1 | 1 |  |
| native | S1 100 m paused | 3.9 / 12.4 / 58.0 / 343.7 | 12.13 | 7.17 | 27 / 21 | 21 |  |
| native | S2 turning 90°/s | 7.9 / 10.0 / 12.2 / 131.1 | 9.37 | 8.47 | 1 / 1 | 1 | origin changed: false |
| native | S3 flight 40 m/s @120 m | 6.6 / 12.7 / 15.9 / 65.1 | 12.28 | 7.42 | 2 / 1 | 0 | selection applies max ms 21.9 |
| native | S3 walk 1.6 m/s | 7.5 / 8.3 / 9.2 / 22.2 | 8.03 | 7.97 | 0 / 0 | 0 | selection applies max ms — |
| native | S5 traverse out | 7.5 / 11.1 / 16.7 / 83.5 | 10.19 | 8.17 | 5 / 2 | 1 |  |
| native | S5 traverse back | 7.8 / 10.8 / 14.3 / 33.7 | 9.96 | 8.43 | 1 / 0 | 0 |  |
| native | S6 descent | 4.9 / 8.9 / 14.1 / 284.0 | 8.19 | 5.84 | 3 / 2 | 2 | first seen: forest 3437 m, trees 547 m, flora 121 m, fauna 346 m, rocks 831 m |

## S0 cold/warm load (ms from navigation)

| Condition | Repeat | Cache | ready | surface | forest | flora | fauna | rocks | settled | >33/>50 in first 10 s | long tasks 10 s |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|
| native | 1 | cold | 4421 | 7178 | 4749 | 8135 | 4421 | 4421 | 20192 | 12/10 | 10 |
| native | 1 | warm | 4228 | 5695 | 4537 | 5928 | 4228 | 4228 | 17773 | 0/0 | 7 |

## S4 date seek A→B→A (plan: staleWaterPatches → 0 within 3 s; reserved ≤ budget)

| Condition | Repeat | Site | Step | Stale→0 & pending→0 ms | Stale max / at end | Peak reserved MiB / budget | >50 ms frames | Max frame ms |
|---|---|---|---|---:|---|---|---:|---:|
| native | 1 | inland | A→B | 5124 | 109 / 0 | 323 / 416 ✓ | 1 | 97 |
| native | 1 | inland | B→A | 2833 | 110 / 0 | 323 / 416 ✓ | 1 | 95 |
| native | 1 | shore | A→B | 2951 | 93 / 0 | 326 / 416 ✓ | 1 | 84 |
| native | 1 | shore | B→A | 2953 | 105 / 0 | 319 / 416 ✓ | 1 | 85 |

## S6 descent 15 km → 1.7 m: clearance at first appearance (plan: forest ≤ 3,500 m; life/rocks ≤ 350 m and before 125 m)

| Condition | Repeat | Forest any tier m | Trees LOD0/1 m | Flora m | Fauna m | Rocks m | 125 m at ms | Touchdown ms | >50 ms frames | Max frame ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| native | 1 | 3437 | 547 | 121 | 346 | 831 | 16133 | 27313 | 2 | 284 |
