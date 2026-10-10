# Palette upload experiment

Source `4127a38`, test-only desktop laboratory; the production renderer is unchanged.
`FaunaSkinnedBatch` supports one, two or three palette texture pairs and full or
adaptive row uploads. Defaults retain one pair and full uploads. Every colour,
depth and distance shader references the same current pair. Unchanged frames
skip rotation/upload. Reused pairs compare against the complete current CPU
snapshot, so omitted or released members cannot resurrect older data.

Sparse RGBA ranges fit individual rows. More than one quarter of rows changing
uses one full upload. An initial/unconsumed full upload remains full until Three's
texture `onUpdate` confirms consumption. The estimated budget includes canonical
CPU arrays, each retained texture copy, GPU copies and typed tracking arrays;
it is a candidate pool limit, not the whole game's life budget.

Seven focused tests and TypeScript pass. Hardware browser comparisons use the
same six exact genomes, 128 actors, 500-triangle QEM geometry, approximate gait,
camera, two draws including ground, and 64,002 reserved triangles. Each window
has 120 CPU/render samples and 119 valid GPU queries after warmup. Results:

| Ring / upload | Moving CPU median / p95 ms | Moving GPU median / p95 ms | GPU max ms | Conservative typed budget |
|---|---:|---:|---:|---:|
| 1 / full | .195 / .480 | .141 / .156 | 3.090 | 6,026,824 B |
| 1 / adaptive | .195 / .345 | .138 / .147 | 3.387 | 6,026,824 B |
| 3 / full | .200 / .430 | .141 / .183 | 3.037 | 6,979,144 B |
| 3 / adaptive | .200 / .385 | .141 / .155 | 2.626 | 6,979,144 B |

All four fixed-rest PNG captures are byte-identical, SHA256
`8a459e50f9aa5496a69371fded27cd4a01ecd928358c79025927e39452d705c6`.
Browser/shader errors are absent; unchanged frames schedule zero palette bytes.
Moving bones change all rows in this corpus, so adaptive mode correctly falls
back to the full 180,224 B bone upload. Sparse workload benefits remain unmeasured.

The three-pair ring adds 952,320 B and shows no convincing moving GPU p95
improvement. It is **not selected for production**. Individual maximum-frame
differences do not diagnose the previous GPU tail as an upload hazard. The
single-pass order and short windows do not establish a universal performance
ranking. No physical Quest acceptance is claimed.

Raw reports and captures: `Assets/_assetctl/animal-system-20261010/palette-streaming/`.
Input data SHA256 `70127c3347c68cfeef9f2b82c5527542709762707f75d4999cc2c5257319e69f`
is the preserved same-source body LOD dataset under
`Assets/_assetctl/derived-fauna-20261010/body-lod-assets/data.json`.
The renderer, genotype metadata and exact source options are retained there;
no checkpoint, private asset upload or newly generated biological identity was used.
