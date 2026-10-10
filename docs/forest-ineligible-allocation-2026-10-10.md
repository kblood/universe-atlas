# Avoid forest allocations on physically ineligible bodies

`PlanetRenderer` opts into `PlanetForest`'s `skipIneligibleResources` constructor
option. The constructor captures the existing `forestBodyEligible(body)`:
nonzero catalogue water, temperature from 250 through 325 K, and nonvolcanic
type. This is the same physical gate captured by `biomeClassifier`; no new
climate, population, terrain or date rule is introduced. Catalogue physical
inputs are immutable for this renderer's lifetime.

When that predicate is false, the forest keeps its small controller/group but
creates no legacy geometry/material/instance batches, no placeholder meshes,
no full-canopy host and no selection worker. It declines tree-family loading.
Update, diagnostics, profiling, disposal and revisit remain valid. Diagnostics
report `resourceState: body-ineligible` and zero owned typed-array/image CPU
bytes and estimated GPU buffer/texture bytes. These estimates exclude ordinary
JavaScript objects, driver padding, shader state and allocator overhead.

Eligible bodies retain eager construction, including dates before complex
flora. Later dated enable uses the same resources and existing material,
local-aerial and shadow hooks; no late-allocation hook is needed. Near/far tree
IDs, silhouettes, instance channels and canopy handoffs remain unchanged.
Standalone fixtures preserve the prior eager behavior unless they explicitly
request the production option.

Validation: 37 focused tests pass, including zero workers/assets/buffers across
four ineligible physical variants, repeated dates and disposal/revisit; default
fixture allocation; and eligible dated enable, near/far movement and replay
digests against prechange Atlas `ca3a92b`. Existing family, census and resource
accounting tests pass. TypeScript and production build pass. Browser two-world
resource receipts are a separate harness handoff before integration.

Logs: `Assets/_assetctl/planet-core-migration/forest-allocation-tests.log` and
`forest-allocation-build.log` in the shared workspace.
