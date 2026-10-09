# Bounded ground-cover range

Dense canonical2m flora demand previously ended at34m even though its
instancing LODs support120m. Extended presentation retains that dense near
region and requests farther representatives from existing canonical2m cells.
Each8m presentation cell selects its nearest canonical2m anchor; identity,
direction, body seed, recipe and population presence remain unchanged.

A fixed5200-cell fineflora demand ceiling prevents a120m dense-grid explosion.
At crowded cube corners, stable cell-ID priority distributes the remaining
representative budget across the range. Shrubs keep their existing24m grid.
GPU candidates retain the6000-slot ceiling and existing per-kind LOD budgets;
an added Float32 coverage buffer costs24,000bytes at that capacity. Extended
CPU resident retention is capped at12,000 records, with nonrepresentative fine
cells keeping their old70m retention window. Far/shrub demand is prioritized
after fauna so it does not wait behind dense near grass.

Nonrepresentative fine plants fade over26–34m horizontal distance. Far
representatives keep existing108–120m render-distance fading. No geometry,
population grid/version, model seed, habitat or species rule changes.
`PlanetRendererOptions.extendedFlora` follows continuity mode by default
(enabled by the production app); explicitfalse retains legacy demand and
presentation for frozen renderer identity gates.

Focused checks cover axes, cube corners and seams, canonical identity, stable
representatives while moving, complete near demand, fixed caps, smooth near
fading and actual100m LOD2 instancing with the120m endpoint fade. The existing
flora GC-counted allocation check passes. Visual/native-device acceptance is
recorded separately by the coordinating browser harness.
