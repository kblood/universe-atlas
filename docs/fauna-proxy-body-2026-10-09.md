# Nearby fauna fallback bodies

Diagnosis at live `067084f`: only six camera-visible animals inside 80 m get
the full skinned body; the rest retain the primitive fallback even when idle
beside the observer. That fallback's upper-leg radius was only footWidth × .27,
and lower-leg radius × .20. A runner's roughly 3 cm thighs contrast with the
near plan's 15–17 cm load-bearing hip/muscle radii. Its one torso ball, one head
ball and thin neck also omit the chest, haunch and muzzle volumes.

`fauna-field-body-2` reuses the existing primitive geometry and near-body
proportions: intersecting pelvis/barrel/chest volumes, skull and muzzle,
two neck sections, proximal muscle volumes and knee/ankle support radii.
It builds no plan or per-animal geometry per frame. The same four instanced
draw batches handle every overflow animal; the six skinned-rig slots stay.
This remains an approximate body, with the existing proxy gait rather than
the near rig's IK/grazing and continuously joined skin.

Full detail applies through 95 m, eases over 95–150 m and emits exactly the old
far lanes beyond 150 m. This keeps distant triangle workload unchanged. The
body-detail weight joins the paused replay key, so a changing observer distance
cannot replay stale anatomy. Batch capacity grows from 4/10/4/10 to 11/11/4/10
parts per animal; even maximum armour/ears/horns use only 36 parts of the
existing 48-part record. No animal capacity, model, population, time, foot
trajectory, gait schedule or world version changes.

PlanetRenderer enables it by default. `faunaBodyPlan:false` explicitly retains
legacy presentation for the historic life CPU optimisation identity test;
the old reference renderer and optimisation implementation are not replaced
or added to the shared-presentation whitelist. Direct FaunaFieldRenderer
callers opt in with `{bodyPlan:true}`.

Validation:

- TypeScript and production Vite build pass.
- 31 focused tests pass, including actual triangle-ray thigh silhouettes for
  all four archetypes, all six authored morphology families in adult/juvenile
  stages, bit-identical idle/walk foot matrices, all 512 animals under maximum
  anatomy, translated paused replay and distance-band cache invalidation.
- Life CPU digest keeps its 416-frame legacy identity; hidden life passes.
  Continuity scenario: five pass, zero failures, one existing FAUNA-NEAR-DROP
  TODO at the pre-M1 site (same issue already documented on main).
- Canonical model/golden pins remain untouched.

`tests/fauna-proxy-body.bench.mjs` measures all 512 animals in the worst close
view, on Node v24.7.0. This is a renderer microbenchmark, not Quest or whole-game
performance acceptance. Report: `test-results/fauna-proxy-body-cost.json`.

| mode | legacy p50 | new p50 | legacy p95 | new p95 |
|---|---:|---:|---:|---:|
| realtime, 5 m | .500 ms | .695 ms | .703 ms | .769 ms |
| paused, 5 m | .171 ms | .226 ms | .189 ms | .270 ms |
| realtime, 150 m | .466 ms | .465 ms | .522 ms | .514 ms |

All-close triangles grow from 441344 to 885760 at the 512-animal ceiling;
beyond 150 m both submit 318464 triangles. CPU/GPU instance/geometry accounting
grows from 2190912 to 2813504 bytes: +622592 bytes, less than 4% of the existing
16 MiB life reserve. The existing allocatedBytes getter automatically counts
the expanded buffers; no new geometry cache or skeleton storage is added.

Visual replay completed with no browser/runtime errors. Paired results are in
`universe-atlas-wt/habitat-near/test-results/habitat-near-before/` and
`habitat-near-body-after/` in the shared workspace. Near20/30 views have the
same dates, animal IDs and population counts; camera-relative positions differ
by less than 6.2 micrometres. Anitar20 has 15 camera-visible animals, six rigs
and nine proxies, including three idle animals 25.66–31.74 m away. Anitar30
has 25 visible animals, six rigs and 19 proxies. These scenes exercise the
actual overflow case. Daunune20/30 has only five visible animals, all rigged,
so it checks the unchanged detailed bodies.

Arrival80 views have the same camera pose/date but different submitted resident
counts (Daunune 484 to 424, Anitar 512 to 504), reflecting finder-arrival versus
bookmark replay residency/streaming. They are same-view visual evidence with
that limitation, not proof of whole-frame population parity. The paired near
views provide the population parity check. Replay also shows a legacy-bookmark
warning; the exact model date/IDs were checked independently in the captures.
