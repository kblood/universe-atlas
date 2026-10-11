# Actual renderer collector contract

`planet-composer-migration.browser.mjs` imports a QA-only collector through `PLANET_COMPOSER_COLLECTOR`. This adapter is filled after the new public Kit APIs and production debug hooks are frozen. It may read application objects and drive actual UI/session lifecycle, but cannot substitute a test renderer or generate its own population to fake a runtime pass.

Required methods:

- `enterOrdinaryHabitat(page, base, scenario, policy)`: use the real ordinary Finder/Visit/Find habitat UI. Return ordinary-UI and airborne evidence. No experiment opt-in or forced walking.
- `collect(page, scenario, policy)`: read current canonical resident census, submitted IDs, actual bound source/LOD/fallback data, updated draw hooks/pixels, deformed mesh/real ground samples and scoped allocations. Return `automaticComposer`, `airborne`, `session`, `canonical`, separately acquired `control`, `sources`, `ownership`, `measured`, and optional `feet`.
- `independentKitSource(definition, id, policy)`: independently build through the pinned public Kit source, using the full source genome/resolved phenotype/style, not recipe-only data or renderer helpers. Return the source-comparison fields required by `auditPlanetComposerSource`.
- `replaySeeks(...)`: pause and perform A-B-A including a genuine-motion B. Return independent canonical/rig receipts and actual motion change. Include transition/rebase cases through the focused source/pose tests, not an unbounded browser date corpus.
- `moveObserver(...)`: move a measured airborne distance while paused; report canonical identity retention, not only draw-count similarity.
- `sessionTransition(page, mode, ...)`: transition actual renderer/session resources; collect Composer source and fallback receipts for simulated XR and desktop resume, plus disposed worker/binding proof. Do not label this a physical headset run.
- `disposeAndRevisit(...)`: exercise repeated planet/context entry, late worker results and disposal. Return actual stale-adoption count, lifecycle counters and coordinator-pinned residency plateau observations.

A source receipt contains `id`, `generator`, `layout`, `recipeText`, complete `definition`, resolved `individual`, `resolutionPolicy: resolved-phenotype-neutral-recipe`, `newVariationApplications`, `newGrowthApplications`, actual `versions`, `sourceBufferDigests`, `boundBoneNames`, palette bone count/stride/max JOINT index, actual packed-decoding error, and actual current main-camera draw/pixel evidence. Names are the auditor's normalized receipt format; the adapter maps real production hooks into it.

Canonical controls contain `bodyId`, exact `worldNs`, and all tested resident members with ID/member seed/species/variant/stage/anchor data, dated root positions and full activity including `revolutionS`. Do not compare old/new visibility-selected subsets as population equality.

Foot evidence uses actual deformed production-mesh vertex indices and signed ground distances in the caller's local metre frame, with real sampled ground heights. Contact markers, a flat fixture labelled terrain, and the reference Kit actor standing in a separate scene cannot serve as production foot evidence.

Budget evidence names actual-main-camera geometry and owned typed/GPU allocations with transients. Requested triangle targets, active counts without allocated capacities, or invented whole-heap estimates cannot serve as measurements. Timing/device gates are separate and must use the coordinator's serialized measurement window and approved pins.

Startup deliberately fails before creating a server/browser if the explicit start flag, real collector or owner-approved policy is missing. Pure negative-control auditor tests passing means only that the auditor rejects known bad evidence; it does not establish migration acceptance.
