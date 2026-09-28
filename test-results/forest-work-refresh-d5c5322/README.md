# Forest work refresh diagnostic, d5c5322

Production preview from clean commit `d5c532225095254e942b4a2beb252c329a53b63e`, built locally with `npm run build` (`dirty=false`). RTX 5090 via ANGLE/D3D11. The normal UI acceptance path passed: initial basic forest, package enable/disable, one controlled 503 and retry, day forward/back identity replay, leave/revisit cache reuse, and 16/16 detailed-to-far handoff samples. No unexpected browser errors; GL error 0.

During a 2 s prewarm plus 6 s stationary profile, `farWork.refreshes` and work-index rebuilds each rose by 135. All 135 refreshes were attributed to canopy revision; selection, habitat, movement, and selection-mismatch deltas were zero. The canopy revision rose by 1,297. At the start/end snapshots, the selection remained 18,066 cells in 5,621 groups; skipped groups rose 3,513 to 4,646 and skipped cells rose 8,776 to 11,289. This supports a targeted per-patch invalidation change: local canopy installs currently trigger full broadphase/work-index reevaluation. It is diagnostic evidence, not a performance improvement claim.

Profile timing in this run: planetUpdate CPU p50/p95 30.2/46.0 ms; frame work 45.0/66.4 ms; instrumented GPU pass sum 9.77/19.16 ms. These measurements include this exact route and its continued patch installation; they are not a before/after comparison or general FPS claim.

Artifacts: `report.json`, `stationary-6s.cpuprofile`, and the numbered phase screenshots. Source commit is pinned in the report's `servedBuild`.
