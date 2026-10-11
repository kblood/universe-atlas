# Planet Composer renderer baseline

`FaunaComposerRenderer` accepts the complete replayable Kit definition and its
exact source key. Its asynchronous provider builds the standard Composer graph
and skin 6; it never builds a quadruped replacement. The injected pose callback
is the shared Kit `posePlanetComposer` solver. Matrices already place +X-forward
metre-space animals in the planet's origin-relative frame. There is no camera
altitude or ground-only gate. The caller supplies visible candidates in stable
camera-first order and attaches lighting through `onMeshAdopted`.

The worker entry is intentionally supplied by the integration layer:

```ts
import {buildPlanetComposerSource} from '#creature-kit/planet';
import {installFaunaComposerSourceWorker} from './fauna-composer-worker-provider.ts';
installFaunaComposerSourceWorker(self, buildPlanetComposerSource);
```

Only one worker request can run. By default each completed request retires its
worker. An explicit `maxJobsPerWorker` (1..64) permits bounded reuse after a
platform measurement; abort, errors, timeout and disposal also terminate it. Resident source arrays are copied by structured clone and never
detached. A near request returns the original source; reduced requests run the
anatomically constrained Kit Composer reducer off the render thread. Every LOD
vertex keeps its original position, normal, bone indices/weights, gloss and all
four crisp-coat attributes. The worker strictly validates every attribute and
emits a SHA-256 receipt bound to the complete definition, graph, original skin,
source version and transferred payload. The provider independently hashes the
actual received arrays; a version tag alone never authorizes adoption. The
renderer recognizes only results verified by this provider. Custom providers
retain strict local checking in their completion task. Upgrades must match the
original graph and skin digests as well as the definition. A loaded tier stays
visible during a pending finer-tier request. Original sources are retained only
for the nearest six eligible source keys; derived tiers and their variable graph
can outlive the full source. Reacquiring an evicted original uses the same complete
definition and versioned builder. It does not invent another animal.

Bone palettes compose absolute model-space poses with inverse rest translation
**and rotation**, including radial and chord scales. Identical source/tier animals
share a geometry draw with independent matrix and palette rows. Lit, directional,
spot and point-light shadow shaders use the same deformation. Full crisp material
instancing needs 15 attributes, checked against the device limit.

`mergedTiers` enables explicitly sized middle/far geometry arenas. Each arena
draws any mix of unique anatomy and coats in one draw, using an actor-row vertex
attribute and a root/coat texture. All seven original crisp mask branches use a
flat per-animal selector; seeds retain all 32 bits, and original float attributes
remain unquantized. Phenotype roughness and eye gloss remain separate channels.
The nearest originals keep source instancing. Released index blocks become
degenerate until reused; diagnostics disclose active and reserved triangles.
Unused middle levels are discarded for far-only members. Reduced attributes
become views of the arena's exact copied vertices, eliminating duplicate CPU
position/normal/colour/joint/weight/gloss/coat buffers. Compact local triangle
indices and original sourceVertex proof remain owned separately. Arena buffers
are counted once. Invisible cached actors retain their blocks and palette rows;
LRU source eviction or row pressure releases them. A tier release transfers a
shared source view to another resident copy, or invalidates that tier before its
block can be reused. Reacquisition uses the retained original or exact definition.

Geometry copies are sliced at 128 vertices / 768 indices with deadline checks.
A partial block stays invisible while an existing tier continues to draw. Source
preparation and integrity hashing happen outside update(); admission uses the
prepared byte counts. The update reports admission time and actual copy time.

This is a correctness baseline, not a completed planet performance gate. Cold
animals are explicitly pending. Every missing source receives a first far job
before any detail upgrades. Completed results survive brief visibility changes,
and budget-blocked completed sources remain in a bounded staging LRU. Evicted
staged sources retain actual byte requirements; a retry requires a resource
revision and successful preflight, preventing a timed rebuild/discard loop.
Admission gaps remain reported. Those gaps must be resolved before replacing the normal
world renderer; this module is not wired into PlanetRenderer yet.

Default resident admission is 32 MiB, with a separate declared 16 MiB worker
reserve and 8 MiB result ceiling. These are configurable limits, not measured
worker heap peaks or Quest qualification. CPU typed arrays are counted by unique
backing buffer; uploaded geometry and palette GPU copies, instance CPU/GPU
buffers, pose arrays, inverse binds, and graph/definition/key storage are
reported. Plain graph objects use their serialized-size equivalent; this is an
estimate, not exact heap ownership. Staging has a separate 8 MiB ceiling. An active
request additionally reserves its maximum 8 MiB incoming result; these allocations
are not concealed inside the declared worker reserve. Deadline overruns are
reported. Definitions are serialized once per admission/reference, compared again
at completion, and recursively frozen after admission. No per-frame definition
stringification or same-source candidate filtering occurs.

The synthetic 289-definition target1000 probe admitted 170 under 64 MiB with a
174k-vertex/867k-index arena: 48,810,688B arena CPU+GPU, 3,145,728B palette CPU+GPU,
13,869,840B source/identity/graph, plus poses/writers. The 119 remaining definitions
were explicitly pending. Actual far vertices ranged 534–665, so 128k vertices
cannot cover 289 far animals. This demonstrates a budget gap, not acceptance of
1000-triangle visual fidelity or the real planet distribution. Evidence is under
Assets/_assetctl/planet-composer-cold-20261011/profile289/.

Focused tests: `node --test tests/fauna-composer-renderer.test.mjs tests/fauna-composer-merged.test.mjs tests/fauna-composer-cold.test.mjs`.
Paired GPU capture: serve the worktree on port 5194, then run
`node tests/fauna-composer-merged.browser.mjs` (uses the shared GPU lock).
The eight-animal/all-pattern paired capture was pixel-identical, including
directional shadows, and reduced animal draws from eight to one. This does not
substitute for full-planet timing, cold-arrival coverage or headset checks.

For an actual browser-worker cold-load/heap sample, serve
`npx vite --config tests/fauna-composer-cold.vite.mjs` then run
`node tests/fauna-composer-cold.browser.mjs`. The test-only Kit path is explicit;
production dependency pins are untouched. CDP Runtime.getHeapUsage is sampled
when the worker accepts commands, so the reported peak is a sampled lower bound,
not a hard heap limit. Typed-result byte counts are reported separately.

The initial unbounded-reuse browser24 run (far1500, actual pinned Kit source) measured first
visible at308ms, all24 at6.363s, zero main long tasks, zero admission overruns and
maximum geometry-copy slice0.39ms. The persistent worker sampled103 times via CDP
reached usedSize50,997,728B, totalSize90,673,152B and backingStorage23,669,921B
(separate peaks). These measurements invalidate the tentative16 MiB worker
reserve. This change exposes the result; it does not silently raise the planet's
shared256 MiB budget. Browser evidence: Assets/_assetctl/planet-composer-cold-20261011/browser24/report.json.

A subsequent bounded-reuse comparison uses the same24 real definitions and no
forced GC. One job per worker took7.548s overall (first visible291ms), with115
samples and24 worker lifetimes. Four jobs took7.489s (first visible344ms), with119
samples and6 worker lifetimes. Concurrent sampled usedSize+backingStorage peaked
at25,447,667B versus54,079,401B; totalSize+backingStorage at33,770,169B versus
73,638,985B. The negligible latency difference does not justify the extra memory,
so default recycling is one job. A proposed40 MiB reserve has headroom over the
sampled one-job committed total, but no shared world budget is increased here;
root integration must approve that allocation and broader hardware coverage.
Evidence: browser24-jobs1/report.json and browser24-jobs4/report.json in the same
review directory. Set COMPOSER_WORKER_JOBS to reproduce either cap.

Merged arenas may explicitly opt into `storage: 'packed-1'`; float storage
remains the default. Packed runtime data has its own
`composer-arena-packed-1` representation and `composer-quantization-proof-1`.
It is never supplied to raw-source/GLB export or declared equal to original
floats. The original worker source and LOD sourceVertex proof remain exact.

| Attribute | Arena representation |
| --- | --- |
| Position / coat noise sample | Float32, unchanged |
| Normal | normalized Int16 |
| Colour / three coat colour layers | normalized Uint16, fixed linear RGB 0..2 domain decoded in shader |
| Bone indices / gloss | Uint8 / normalized Uint8 |
| Bone weights | normalized Uint16; all lit/shadow shaders renormalize the four decoded weights |
| Actor row | Uint16 |
| Local triangle indices / original sourceVertex | Uint32, unchanged |

The colour domain deliberately preserves existing values above 1 (a tested
giraffe coat layer is 1.014506); values are not clipped to display white. Each
bounded copy slice checks quantization against its raw input, and ownership is
published only after the complete error proof passes. Packed-to-packed copies
retain encoded bytes and their original proof. The independent validator checks
actual decoded arrays against raw source; raw validators cannot accept packed
integer arrays by pretending they are original floats.

Vertex storage is 73 B versus 120 B (39.17% less). The normalized-size twelve-preset,
eight-pattern GPU pair measured maximum channel difference 1/255 and mean
0.0000299043/255, with no channel differing by more than 2. Identical 184,312 animal
triangles were rendered; animal draws fell from 12 to 1. The test includes eyes,
horns, trunks, limbless and many-legged layouts, directional shadows, and a raised
instance. Lit, depth and distance shader paths share the weight decode.

An independent actual Kit source 2 / planet pose 2 CPU probe sampled 24 definitions
on a sloping ground plane over 12 dated phases: 17,961 deformed stance-sole vertex
observations, maximum packed foot-height change 0 m, maximum body-vertex change
6.95 micrometres. Existing maximum stance gap 0.658 mm was unchanged. These are
source-vertex measurements, not contact-marker substitutes. Evidence:
Assets/_assetctl/planet-composer-packed-20261011/{paired-normalized,world-feet}.

The far-only 289-definition probe with Kit compact identity keys and target 1000
admitted all 289 under 64 MiB: 59,954,740 B accounted resident, 32,454,688 B packed
arena, zero pending/drops/failures, one draw and 288,900 triangles.

The mixed 289-definition probe admitted 6 original near animals, 6 middle animals
and 277 far animals under 80 MiB: 76,226,186 B resident, 8 draws, 399,770 active
triangles, zero pending upgrades/drops/failures. Far arena 174k vertices/867k
indices; middle arena 16k vertices/96k indices; actor/source capacity remains 512,
full-source cache remains 6. All coarse animals were built first; 12 upgrades then
used the same definition and original source. The source-plus-LOD jobs total 301.
The standalone CPU probe retains the old declared worker reserve field; it is
not a worker-heap measurement or approval of that 16 MiB value. Root integration
owns the measured 40 MiB worker allowance and the shared 256 MiB total.

These results are not Quest qualification: the triangle totals exceed the broader
150k Quest scene target. Geometry typed allocations are exact; plain JavaScript
object overhead (including small quantization-proof records) still needs
whole-process heap measurement, as described above. Profiles are under
Assets/_assetctl/planet-composer-packed-20261011/{profile289,mixed289}.
