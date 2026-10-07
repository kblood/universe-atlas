# Truth-scan chunking (O3, 2026-10-07)

Branch `tests/truth-chunks`. Decision: `docs/fable-test-review-2026-10-07.md` O3 (agent B). Pattern:
`tests/helpers/lod-coarse-frame.mjs` (worker per world inside the test slot). Policy: `docs/test-policy.md`.

**Rule kept.** Titles, pins, thresholds, sample sets, body sets and asserts are unchanged. Only where the per-body loop
runs changed: in-process (level 0, `npm test`) or across worker threads (carved truth, `test:full`).

## 1. What changed

| Piece | What |
|---|---|
| `tests/helpers/body-chunks.mjs` (new) | `BODY_SETS` (the body lists, moved unchanged from the four files), `SCANS` (one function per serial loop body: `coastline`, `hypsometryWindow`, `heightBound`, `colour`, `agreement`, `floorWindow`, `continental`, `floorBase`; asserts verbatim, each returns plain numbers plus a sha256 digest of every per-direction value it read), `scanBodies(scan, set, mode, {workers})`, `inOrder`, `logScan`. Also the worker entry. |
| `tests/terrain-relief-hypsometry.test.mjs` | coastline, window invariant and height bound call `scanBodies`. Truth: coastline 1 worker per body (6), window 1 per body (9), height bound **6 workers** over the 60 bodies. |
| `tests/terrain-climate-colour.test.mjs` | colour identity: truth 1 worker per water world (4). The snow identity (1 world, 4096 directions, 16 s) stays in-process. |
| `tests/acceptance/climate-agreement.test.mjs` | agreement: truth 1 worker per water world (4). The `# <world>: land ...` log and the non-vacuity assert stay in the test, in world order. |
| `tests/terrain-floor-window.test.mjs` | window scan, continental sign and floor = base: truth 1 worker per body (6 / 4 / 9). The gas-giant check stays in-process. |

The level-0 tests run the same `SCANS` functions in-process (`workers: 0`), so each loop exists once. The two
byte-identical `grainOf` copies (colour, agreement) became one copy in the helper. It is still written out and
independent of `src/`.

### Semantics kept

- **Combination.** The test combines per-body results in body order exactly as the serial loop did: sums (`flips`,
  `ocean`, `outside`, `violations`), report rows and the per-body asserts. `inOrder` rethrows the first failing body's
  error at its position, so the reported failure is the one the serial loop would have hit first. A worker's
  AssertionError is rebuilt on the main thread with the same message; the worker stack is attached.
- **Chunk cover (asserted on every truth run).** Each worker returns exactly the indices it was handed. The union of the
  chunks is every body index exactly once. Each record's id equals the main thread's id at that index, so the worker
  rebuilt the same body. For the height bound the test also asserts 60 bodies and 6 workers.
- **Pull queue, not a fixed deal.** The review proposed 6 workers x 10 bodies. The measured truth cost per height-bound
  body is very uneven: 14 bodies (the water/oceanic worlds) take 50-202 s each and 46 take 12-40 ms. Fixed strided
  chunks of 10 would give a worst worker of ~333 s. Contiguous chunks of 10 would give ~624 s. So the 6 workers pull
  indices in body order from one queue (simulated ~252 s, measured 278 s; one body alone is 202 s). Per-body results do
  not depend on which worker ran them (proof below). The assignment is logged (`chunks`, `worker-ms`).

## 2. Wall times

Each file was run alone as `ATLAS_TEST_FULL=1 node tests/helpers/test-slot.mjs -- node --test <file>`. Wall time is
measured inside the exclusive slot (acquire to release). "Before" is `main` 5bce32b; its test files are identical to
d08ab6b.

| File | Before | After | Truth tests, before -> after |
|---|---|---|---|
| `terrain-relief-hypsometry` | 1885.8 s | **481.8 s** | coastline 224.3 -> 94.6; window 460.9 -> 93.0; height bound **1185.8 -> 277.9** |
| `terrain-climate-colour` | 595.5 s | **255.0 s** | colour identity 575.8 -> 237.7 (snow identity in-process 17.9 / 15.5) |
| `acceptance/climate-agreement` | 570.8 s | **232.2 s** | agreement 569.8 -> 231.2 |
| `terrain-floor-window` | 417.2 s | **210.4 s** | window 172.7 -> 87.9; continental 168.1 -> 84.9; floor = base 65.4 -> 24.7 |
| sum | 3469 s | 1180 s | |

The longest single file on the `test:full` critical path drops from ~31 min to ~8 min.

What limits each file now: the slowest single body. Maithea's truth is 230-260 s for the 60k-direction colour and
agreement scans and 85-95 s for a 20k scan. Running in parallel also costs about 10-40 % per body, because the
summed worker ms grows under contention. Going lower would need direction-range chunks inside a body (not done; the
review scoped O3 per body), or O10 dedup. Colour and agreement evaluate the SAME truth samples: `terrainSampler`,
4 water worlds, `fib(i, 60000)`. Coastline, the two window scans and the height bound also share Maithea's 20k truth
directions.

Under `test:full` the four files now start 4 + 6..9 worker threads each, at the same time as other files. The machine
has 32 threads. Peak memory was not measured separately; every run above completed with exit 0.

## 3. Identity proof

**Method.** The "before" runs used copies of the four original files with logging only added: per body, a sha256
(first 16 hex digits) of the Float64 values of every direction the loop reads, plus the loop's own aggregates. The
"after" files emit the same values through `logScan` (they stay in the committed tests: one `# scan <scan>:<mode>`
line per scan). A scratch compare script matched every row by body id and compared every field with `Object.is`, ignoring `ms`.

Digested values per direction:

| Scan | Values |
|---|---|
| coastline | relief ocean flag, base ocean flag |
| window scans (both files) | groundHeightM, floorM, windowM |
| height bound | groundHeightM (plus minM, maxM, outside, min/max h per body) |
| colour | index, groundHeightM, colour r/g/b (land only) |
| agreement | index, h, colour r/g/b, classifier snow weight, climate snowFraction, classifier effectiveMoisture, forestSuitability01 (land only) |
| continental | continentalM, ocean flag |
| floor = base | floorM, groundHeightM, ocean flag |

**Result: ALL IDENTICAL**, level 0 and truth, every body:

```
IDENTICAL coastline:level0 / coastline:truth          6 bodies   (flips/ocean/digest)
IDENTICAL hypsWindow:level0 / hypsWindow:truth        9 bodies   (bad/max/bound/digest)
IDENTICAL heightBound:level0 / heightBound:truth     60 bodies   (minM/maxM/outside/hMin/hMax/digest)
IDENTICAL colour:level0 / colour:truth                4 worlds   (land/snowy/forested/digest)
IDENTICAL agreement:level0 / agreement:truth          4 worlds   (land/snowLabel/forest/partialSnow/digest)
IDENTICAL floorWindow:level0 / floorWindow:truth      6 bodies   (bad/min/max/bound/digest)
IDENTICAL continental:level0 / continental:truth      4 worlds   (mismatch/land/digest)
IDENTICAL floorBase:level0 / floorBase:truth          9 bodies   (n/digest)
```

The original diagnostic lines are also byte-identical before vs after: hypsometry 7 (`# Maithea relief`, 4x
`# seabed`, `# dry worlds`, `# corpus snow`) and agreement 12 (`# <world>: land ...`). All 31 tests pass in both
versions: hypsometry 11, colour 7, agreement 4, floor-window 9.

Example truth rows (after):
`heightBound:truth workers 6 chunks [[2,28,32],[0,31],[5,7,10,...,29],[3,26],[1,27,33],[4,6,8,...,59]] worker-ms
[234956,185694,172192,251023,274732,171021]`. The rows are the same as the serial run's, for example Maithea
`G001/C2128,0,1/0/planet/1` with the same digest and outside = 0.

## 4. Not done / follow-ups

- No `test:full` run (by brief). `tests/tiers.json`, `package.json` and the runner were not touched (agent A).
- Direction-range chunks inside Maithea (~230 s floor in colour/agreement) and O10 dedup of the shared truth samples
  (section 2) are the next levers.
- Workers are created per test, not prefetched per file. Overlapping the three hypsometry truth tests would save
  another ~90-180 s, but it also starts ~21 threads at once inside `test:full`.
