# Opt-in runtime LOD controller prototype

Production remains unchanged: `PlanetRendererOptions.faunaLodPrototype` is
absent from its normal construction. The new option supplies a structural
worker/render adapter plus exact source and appearance versions. It does not
select another generator or enable an unreviewed material.

The controller takes the existing stable camera-first distance/ID order. It
can replace at most 128 unique camera-visible members through 200 m. Six full
near skins remain authoritative; shadow-only and out-of-range members keep
the existing fallback. Renderer policy currently reserves 16 close candidates
at 1500 triangles and 112 middle candidates at 750; close/middle hysteresis is
65/95 m. These are requested targets, not claims every source reaches them or
passes quality. Excess/unsupported candidates remain present as fallback;
unused close slots never force a distant animal into that tier.

One cold build runs at a time. Jobs carry the exact existing member genome,
optional cloned loaded near-body data, individual ID, tier/target and
planet/life/source-date-version/appearance context. Ordinary advancing pose
time does not regenerate an immutable body. New source/world/life context,
hidden life or disposal invalidates old results and signals cancellation.
Even an adapter ignoring abort cannot cause a second simultaneous job.
Only the cloned job buffers may be transferred. No geometry/LOD generation
occurs in the frame path. Pending results are capped at one and 2 MiB.

Adoption is a bounded adapter operation with a 2 ms cooperative budget and
an explicit measured over-budget diagnostic. The adapter must preflight and
replace atomically: a false return preserves the old bound draw. Tier upgrades
and downshifts retain that old draw until successful replacement; failed jobs
keep it. Initial adoption fades over 0.25 s and the range fades over 175–200 m.
Full-near, pool and fallback coverage sum to one. Opt-in fallback instance
coverage reaches both colour and depth alpha-hash shaders; paused replay writes
the current coverage. Async ready messages invalidate the paused frame cache.

## Ownership and budgets

- `adapter.ownedBytes`: packed/prepared/cache CPU typed arrays plus estimated
  GPU buffers/textures, including index storage.
- `adapter.transientBytes`: additional adapter staging; excludes both cold
  worker ownership and the result transferred to the controller.
- A returned result transfers ownership to the controller. Its deduplicated
  typed `byteLength` is counted once until adoption or discard.
- `workerReserveBytes` bounds cloned typed inputs, transport copies, source
  field/cell grids, source arrays and reducer/build scratch. It must include
  both transport copies when cloning rather than transferring. Kit's 200,000
  point grid ceiling alone permits about 1.6 MiB of field/cell-vertex arrays;
  a 1 MiB total worker promise is insufficient.
- Exact cloned backing-buffer bytes are checked before cloning. Ordinary
  genome/plan object clone overhead has a separate conservative serialized
  size estimate; ordinary JS allocation is not a byte-exact typed metric.
- Default resident pool/staging/result ceiling is 16 MiB; the separately
  bounded cold typed worker ceiling is 32 MiB. Their incremental peak ceiling
  is 48 MiB. This explicitly does **not** claim to fit the legacy 16 MiB
  `LIFE_RESERVE_BYTES`. Actual adapter/job bounds remain an acceptance gate.

Diagnostics report these scopes, optional live worker typed/JS measurements
(missing instrumentation is unknown), blocked admission reasons and the whole
flora + full-near + fallback + LOD + forest estimate. Worker reserve replaces
the live worker measurement for peak accounting rather than adding it twice.
The production reserve must be reconciled with actual receipts before enabling
this option.

## Validation and remaining gates

Controller tests cover serialization, stale cancellation, rejected/oversized
results, cloned-buffer transfer safety, atomic tier changes, complementary
coverage, hysteresis and cache/budget bounds. Fallback tests guard unchanged
default buffers/shader, colour/depth coverage, resource ownership and paused
replay. A real PlanetRenderer route at 80 m clearance submits actual camera
members beyond the old 95 m near window, preserving complete canonical IDs,
genomes, positions, near membership and counts on refused adoption.
The historical life CPU identity scenario also passes with the option off.

The concrete packed worker adapter, per-specimen target/feature quality,
actual colour/shadow shader compilation, whole-world CPU/GPU/memory, same-pose
arrival/near/revisit captures and source/LOD coat coherence remain acceptance
gates. Mock adapter tests are not a claim those rendering gates have passed.
