# One deterministic temporal universe

Design review with GPT-6 Astra, 2026-09-23. This turns the [cosmic history
plan](cosmic-history-simulation-plan-2026-09-23.md) and the existing [time and
coordinate contract](time-and-coordinates-contract.md) into one implementation
path. It is a design, not a claim that the early-universe or far-future scenes
are implemented.

## User-facing invariant

One universe seed, one date, one location and one named future scenario resolve
to one world. A direct seek, playback, reload and revisit must yield the same
galaxies, stars, planets, coastline, living species and animal positions at
that date. Rendering detail may vary with distance or device, but must not
change which things exist. The catalogue at 13.787 billion years remains an
anchor. Procedural planet and species histories are scenarios, not measured
histories of our Solar System or Earth.

## Authoritative context and dependency graph

```ts
type WorldContext = {
  seed: string;
  tNs: bigint;                 // current public axis, nanoseconds since hot Big Bang
  branchId: 'baseline';
  futureScenario: 'constant-dark-energy';
  modelManifestId: string;     // exact algorithms, tables and scenario parameters
  versions: WorldVersions;
};

type DatedState<T> = {
  address: string;             // canonical, stable identity
  existence: { fromNs: bigint; untilNs: bigint | null };
  interval: { fromNs: bigint; untilNs: bigint | null }; // current stage interval
  stage: string;
  value: T | null;
  modelId: string;             // physical model or labelled procedural scenario
  fidelity: 'calibrated' | 'approximation' | 'procedural' | 'scenario';
};
```

Every resolver receives the same context. The production dependency order is:

```text
cosmological background and primordial conditions
  → comoving density / gas / chemical-enrichment histories
  → galaxy assembly and mergers
  → stellar birth, evolution and remnants
  → disk, planet and moon formation
  → atmosphere, temperature, surface and water
  → biosphere origin, species and habitats
  → flora, fauna and local presentation
```

The canonical body address, including its body slot, must seed both the planet
history and its biosphere. The panel, renderer, walking/collision and exported
state must call the same dated snapshot or its child resolvers. A renderer may
choose a lower level of detail; it cannot generate a competing history.
Existence and stage intervals are separate: an accreting planet exists before
it has a solid or walkable surface. A merge may change a star's host galaxy
without changing that star's identity.

The production query boundary can be kept small:

```ts
backgroundAt(ctx): CosmicBackground;
historyFor(definition, address): EntityHistory; // date-independent schedule
entityAt(ctx, address): DatedState<EntityState>;
planetEnvironmentAt(ctx, bodyId): PlanetEnvironment;
surfaceSamplerFor(ctx, bodyId): SurfaceSampler; // reused for a frame/tile build
biosphereAt(ctx, bodyId): BiosphereState;
populationAt(ctx, bodyId, spatialCellId): PopulationState;
specimenAt(ctx, specimenId): SpecimenState;
eventsBetween(definition, scope, fromNs, untilNs, cursor?): EventPage;
```

`historyFor` resolves a bounded local schedule once. `entityAt` finds the
relevant interval by direct lookup. `surfaceSamplerFor` captures the dated
environment once, then supplies many terrain/clearance samples cheaply.

## Time and deterministic queries

- Keep `world-time.ts`'s BigInt nanosecond axis for all existing bookmarks and
  for every event from 1 ns onward. `t = 0` is a labelled explanatory origin;
  the current clock cannot represent sub-nanosecond events. If a researched
  early model needs those times, revise the clock schema with an exponent-based
  early-instant variant and conversion adapters. Keep it part of one canonical
  time axis; do not create a second independent clock or silently reinterpret
  stored nanosecond dates.
- Query destination state directly. Generate bounded, immutable events from
  `(seed, canonical address, model version, channel, ordinal)`; sort equal-time
  events by explicit priority and stable ID. Events use half-open intervals.
  Regional interactions need canonical parent-region summaries so visit order,
  worker scheduling and cache warmth cannot change outcomes. Long population
  histories use sparse, globally anchored epoch blocks and explicit terminal
  states; seeking to `10^100` years never scans every preceding year.
- Discrete outcomes such as birth, merger, ocean onset, extinction and species
  identity use the repository's deterministic math/quantization path. Floating
  cosmological curves, light color and interpolation may use ordinary doubles
  only when their rounded values cannot decide an existence branch. Exact
  reproducibility covers IDs, event dates, stages, counts and history digests;
  continuous geometry and shading may use documented tolerances.
- Cache immutable lifecycles by seed, address, scenario and relevant versions.
  Cache dated snapshots by those keys plus exact date or a documented time
  bucket. Bucketing may reuse presentation meshes, never a logically different
  existence or walkability result. Clear or key transient water, hydrology and
  life caches on seed/scenario/version changes.
- Separate the **world state at date `t`** from an optional **observed sky**.
  The latter requires past-light-cone queries, redshift and a correct particle
  horizon. The Hubble radius `c/(aH)` is not the observable-universe boundary.
  Bound galaxies, star systems and planets do not expand internally with the
  cosmological scale factor. At huge future dates, compute local time and
  log-scale differences before converting to floating-point numbers.

## Cosmic background and early structure

Use a versioned, radiation + matter + dark-energy expansion model anchored to
the catalogue epoch. Return `a(t)`, `H(t)`, radiation temperature and broad
opacity/chemistry state as continuous quantities with stated validity ranges.
At `t = 0`, show an explanatory state; avoid a central explosion or a rendered
physical singularity. At recombination, the field becomes transparent and the
CMB can be represented as a seeded whole-sky fluctuation field. The fluctuation
spectrum must be labelled illustrative until calibrated to measured data.
The simple `T ∝ 1/a` rule has transition limits, including changes in thermal
particle content and reheating; model validity must be attached to the result.

The current `src/cosmology.ts` matter-plus-Λ closed form is unsuitable for the
radiation era. The first-star checkpoint also cannot be populated from today's
catalogue stars: `src/stellar-evolution.ts` anchors all their births to recent
lookback ages, with the earliest around 4.9 billion years after the Big Bang.
Introduce an earlier stellar population and enrichment history with stable
lineage IDs, then connect later catalogue stars and planets to their host
galaxy's gas and metallicity history. Preserve existing catalogue identities
at the reference epoch; never regenerate them from a new global random stream.
Preserve the reference catalogue as one surviving cohort, and generate separate
primordial, extinct historical and later cohorts. Otherwise seeking backward
omits stars that lived and died before the reference date. Initial density and
enrichment fields only become causal models when their outputs actually
constrain the generated populations; seeded noise alone is visual illustration.

## Planets, life and local animals

For a host star and body, create one `PlanetSnapshotAt(t)` carrying lifecycle,
stellar forcing, surface availability, ocean level, atmosphere/climate class
and a canonical surface sampler. `surfaceAt`, terrain tiles, landing, walking,
flight clearance and map previews consume that sampler. Ocean and inland water
remain distinct. A star's giant/remnant transition changes climate and water;
engulfment ends the body. Habitable status is evaluated at the selected date,
not from the present-day profile alone.

`BiosphereHistoryFor(body)` is generated once from the canonical body identity,
formation/cooling time and dated environment. Its species records have stable
IDs and explicit birth/death intervals. `BiosphereAt(t)` supplies the inspector,
flora and fauna. Herds select actual living species IDs and inherit their
morphology or an explicitly recorded variant; filtering only by quadruped
archetype is insufficient. Use stable population and specimen IDs and integer
spatial-cell addresses for placement; floating direction strings are unsuitable
as persistent identities. Herd membership and home range come from stable
seeded IDs. Position and gait phase are functions of absolute world time via
bounded modular periods, so seeking to the same date restores the same poses.
Camera movement, LOD and cosmetic breathing may use frame time without
changing canonical presence or position.
The current biosphere's 20-billion-year local-age cap needs an explicit
extrapolation or terminal-state policy for very late dates; a silent clamp
would freeze evolution.

## Far future

Default to a labelled constant-dark-energy, continued-expansion scenario.
Local bound systems evolve through their own stellar and planetary lifetimes;
distant galaxies fade from an *observed* sky according to light-cone/redshift
rules. Later remnant and black-hole eras use coarse population state where
individual walkable systems no longer have supported models. `10^100` years is
the current navigation ceiling and a heat-death proxy, not a predicted moment
when the universe ends. Alternative Big Crunch or Big Rip scenarios require
their own parameter sets, versioned timeline bounds and visible assumptions;
they must not be folded into the baseline seed.
Statements that only black holes remain, that protons decay, or that all black
holes have evaporated depend on assumptions and must be labelled conditional.

## Existing seams to close before expanding visuals

1. `main.ts` passes `sys.ref.id` into `biosphereStateAt` while its formation
   panel calls `generateBiosphere(..., body.id, ...)`. These produce different
   seeded species/timing for the same body. Resolve a canonical body address
   once and use it at every call site, with an explicit biosphere version bump.
2. `main.ts` uses a dated, snapped `surfaceQuery` path while `world-surface.ts`
   exposes a separately gated `surfaceAt`. Consolidate these into a shared
   dated snapshot and document snap resolution so visual water and walkability
   agree at every date.
3. `planet-renderer.ts` accumulates `faunaTimeS` from frame `dt`. Pass a
   bounded absolute-world-time phase to `faunaMemberPoseAt`; keep decorative
   animation state outside the deterministic world snapshot.
4. Saved `WorldVersions` beyond the time key are written but not checked on
   restore. Compare all relevant loaded versions with the running generator,
   then migrate known changes or display a nonblocking mismatch notice. A
   manifest ID must identify exact model tables and scenario parameters. Add
   a separate build identity for consumer-only rendering changes.
5. Galaxy visibility currently treats the comoving Hubble radius as an
   observable edge. Separate lifecycle visibility from observational optics
   before presenting it as a scientific sky.

## Delivery sequence

| Step | Concrete result | Gate |
| --- | --- | --- |
| 1. Identity and snapshot seam | One body key, one biosphere history, one dated surface state shared by panel, terrain, landing, flora and fauna | Direct seek, reload and revisit resolve the same species, ocean and walkability. |
| 2. Local temporal life | Living species IDs drive plants and animals; herd pose derives from world date; climate responds to stellar stage | Exact-date local state is independent of frame rate and visit order. |
| 3. Early cosmic model | Radiation-aware background, opaque plasma, recombination/CMB, dark ages and first-star population | Present catalogue anchor is preserved; early readouts state their validity. |
| 4. Galaxy lineage bridge | Early gas/enrichment and galaxy histories lead to later stars and planet-forming material | Parent-child birth order holds at every address. |
| 5. Far-future baseline | Continued-expansion scenario with star/remnant/planet outcomes and coarse late eras | No fixed physical end is claimed; dates remain seekable through the UI ceiling. |
| 6. Optional observation/scenarios | Past-light-cone sky and separately parameterized alternate fates | State-at-date and observed-sky modes remain distinguishable. |

Review examples for each delivered step: direct seek versus playback; `A → B → A`
date travel; cold versus warm caches; shuffled address visits and reversed
worker completion; two planets in one system with distinct species IDs; dates
immediately before and at an event boundary; pre-ocean inland water versus
global ocean; extinct species absent from local herds; and the same specimen
pose after restoring an exact date. These examples must traverse the production
resolver and renderer boundary, since a pure function can be correct while a
different call path is still used by the app.

Keep each step versioned and reviewable before replacing a later step's
placeholder. The first vertical slice is step 1: it makes the planet and animal
history already visible in Atlas internally consistent before adding another
cosmic layer.

This decision supersedes the current contract's treatment of absent
radiation-era correction as permanent and its use of the Hubble radius as a
galaxy visibility boundary. The existing clock and catalogue reference anchor
remain in force until a versioned migration changes them.

Scientific anchors and limits: [NASA on the hot early universe and CMB](https://science.nasa.gov/universe/overview/),
[NASA on the Big Bang's lack of a centre](https://science.nasa.gov/mission/webb/big-bang-q-and-a/),
[Planck 2018 cosmological parameters](https://arxiv.org/abs/1807.06209),
[Davis and Lineweaver on distinct cosmological horizons](https://arxiv.org/abs/astro-ph/0310808),
and [Adams and Laughlin on conditional far-future evolution](https://arxiv.org/abs/astro-ph/9701131).
