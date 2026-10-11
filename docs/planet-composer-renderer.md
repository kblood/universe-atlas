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

Only one worker request can run. Abort, errors, timeout and disposal terminate
the worker. Resident source arrays are copied by structured clone and never
detached. A near request returns the original source; reduced requests run the
anatomically constrained Kit Composer reducer off the render thread. Every LOD
vertex keeps its original position, normal, bone indices/weights, gloss and all
four crisp-coat attributes. Adoption validates that mapping. A loaded tier stays
visible during a pending finer-tier request. Original sources are retained only
for the nearest six eligible source keys; derived tiers and their variable graph
can outlive the full source. Reacquiring an evicted original uses the same complete
definition and versioned builder. It does not invent another animal.

Bone palettes compose absolute model-space poses with inverse rest translation
**and rotation**, including radial and chord scales. Identical source/tier animals
share a geometry draw with independent matrix and palette rows. Lit, directional,
spot and point-light shadow shaders use the same deformation. Full crisp material
instancing needs 15 attributes, checked against the device limit.

This is a correctness baseline, not a completed planet performance gate. Unique
individuals still produce separate source/tier draw groups. A merged geometry
atlas for reduced tiers is the next performance step; no low draw-count claim is
made for unique individuals. Cold animals are explicitly pending, and admission
failures are reported. Those gaps must be resolved before replacing the normal
world renderer; this module is not wired into PlanetRenderer yet.

Default resident admission is 32 MiB, with a separate declared 16 MiB worker
reserve and 8 MiB result ceiling. These are configurable limits, not measured
worker heap peaks or Quest qualification. CPU typed arrays are counted by unique
backing buffer; uploaded geometry and palette GPU copies, instance CPU/GPU
buffers, pose arrays, inverse binds, and serialized graph/definition/key storage
are reported. JavaScript object overhead is estimated by serialization, not an
exact heap measurement. Pending payload bytes are separate. A source result may
cross the 3 ms adoption target; one result is adopted per frame and overruns are
reported, not hidden. Actual worker heap and GPU timing remain integration gates.

Focused test: `node --test tests/fauna-composer-renderer.test.mjs`.
