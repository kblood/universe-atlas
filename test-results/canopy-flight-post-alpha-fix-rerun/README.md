# Canopy flight acceptance snapshot

`report.json` records a local browser run against the Vite server on 2026-09-28. The browser identified an NVIDIA GeForce RTX 5090 through ANGLE / Direct3D11 at 1440×1000. It exercised low flight, a turn, touchdown into walking, a walking turn, more than 300 m of lateral travel in both modes, and a settled canopy. The default framebuffer readback was fully opaque at MSAA 0, 2, and 4.

The run loaded commit `e32d8d7a23a852a59ca1da70648bafd45a3dc180`. The report says the worktree was dirty because review documents were untracked at launch; the tested runtime module hashes are recorded under `environment.sourceFilesSha256`, and the matching Vite-served module hashes are in `environment.servedModuleSha256`. These identify the canopy, forest, and cloud source snapshot used by this run.

This is point-in-time local acceptance evidence for that source snapshot. Later watchdog, prefetch, shader, or cache fixes are not covered unless their source hashes match the report. Upload figures are sampled current-frame counters at 100 ms intervals, not exact totals. Screenshots show test checkpoints, not a visual approval of the existing tree forms.
