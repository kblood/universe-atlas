# Incremental forest-work profile, 96997ec

Built from clean commit `96997ec2114dc4ccf207fd5f53700dea8823afc7` (`dirty=false`). Browser renderer was an NVIDIA RTX 5090 through ANGLE/D3D11. The same normal navigation fixture passed: 573 basic trees, then 632 detailed trees on first attach; one controlled Oak HTTP 503 preserved the basic forest and retry succeeded; date return preserved 16/16 matched tree identities; leave/revisit reused the 20-request package cache; 16/16 near/far presentation samples matched. No unexpected browser errors; WebGL error 0.

## Refresh work observed

The 6 s stationary profile, after a 2 s prewarm, had 0 full far-work refreshes/rebuilds (start and end remained 128). It processed 79 incremental broadphase queries, visiting 879 patch groups total (about 11 per query), and 72 incremental ordered-index membership updates. Canopy revision still advanced by 879. There were no selection, habitat, movement, or full-epoch changes in the window.

For comparison, the d5c5322 profile had 135 full refreshes/rebuilds and a 1,297 increase in canopy revision, with all refreshes attributed to canopy revision. The d5 instrumentation did not count visited groups; 135 × 5,621 groups gives an inferred upper work count of about 759k group visits. In 96997ec the measured visit count is 879, with zero full scans. This is direct evidence that local canopy changes now use the dirty-patch path while global resets retain full scans.

## Timing limits

The 969 profile p50/p95 values were planetUpdate 18.9/33.9 ms, frame work 32.1/54.3 ms, and instrumented GPU pass sum 7.37/16.95 ms. The d5 profile had 30.2/46.0 ms, 45.0/66.4 ms, and 9.77/19.16 ms respectively. These timing distributions are descriptive, not a causal performance claim: the same route reached different population counts and camera positions (632 vs. 767 detailed trees on the first attach), and the profile samples are not perfectly workload-matched. The visited-group and full-scan counters are the attributable result.

Artifacts: `report.json`, `stationary-6s.cpuprofile`, `committed-build.log`, and numbered route screenshots. The d5 baseline remains preserved in `../forest-work-refresh-d5c5322/`.
