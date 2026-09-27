# The 4D time and coordinate contract

## Rendering follow-on — 2026-09-28

The [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md)
builds on this contract. Its initial forest changes affect observer selection
and render-buffer maintenance only; canonical tree IDs, dimensions, placement
and the time model retain their existing rules. Proposed species asset recipes,
appearance manifests, seasonal variation and individual growth are future
extensions and must conform to the identity/lifecycle requirements below.
No new appearance or history version is introduced by the initial source slice.

Design, 2026-09-15. This is a contract other engineers implement against, not a
narrative proposal. It resolves the open questions in
[`living-worlds-and-time-roadmap.md`](living-worlds-and-time-roadmap.md) into
concrete types, formulas, versions, and file ownership. Where this document and
the roadmap disagree, this document wins for anything it decides explicitly;
the roadmap remains authoritative for milestones 5–7 (civilizations, wider
biosphere detail) that this document does not touch.

Two other changes are landing concurrently in this codebase and are treated as
**external dependencies, not part of this contract**: a deterministic
`det-math`-style helper module (replacing ad hoc copies of `expNeg`/`sine`/
`logPos` in `catalog.ts`), and making river existence a pure function of
`(seed, body address)`. This document specifies the interfaces it needs from
each so the packages below can be coded against a stub today and wired to the
real module later without a rewrite. Nobody implementing this plan should
touch `river-*.ts` or extract `det-math.ts` themselves — reuse what lands.

## 0. Summary of decisions

- **Clock**: one signed BigInt-nanosecond clock, origin = **the Big Bang**
  (`t = 0n`). The existing "catalogue reference epoch" (today, where the
  static 32-galaxy catalogue and all `epoch = 0n` fixtures already live)
  becomes a named constant offset, `CATALOGUE_EPOCH_NS ≈ 13.787` Gyr after the
  Big Bang. Declared navigable range: `[0n, UNIVERSE_END_NS]` — **closed**,
  `UNIVERSE_END_NS = 10^100` years in nanoseconds. The ceiling is itself a
  reachable, round-trippable instant, not an excluded limit: the whole point is
  travel from the beginning to the end, so the end must be addressable.
- **Existence**: every generated object (galaxy, star, planet, moon, biosphere
  species) carries a half-open `[birthNs, deathNs)` interval and a `state(t)`
  function. Rendering, collision, and biosphere queries are gated on this
  interval, and as of `world-surface.ts`'s `surfaceAt` this is **enforced at
  the query layer**: an `unformed` star, and a planet not yet `molten`/`solid`,
  both return `exists: false` with a null sample. Whether every renderer call
  site has switched from the older un-gated `surfaceQuery` to `surfaceAt` is a
  separate question, tracked in §2.6.
- **Space**: galaxies keep frozen **comoving** positions (as today), now
  multiplied by a deterministic scale factor `a(t)` to get proper position.
  Individual star systems stay frozen in their galaxy's comoving frame (no
  galactic rotation this iteration — explicit non-goal, justified below).
  Orbits, spin, and day/night remain analytic and continuous, as today.
- **Coordinates**: the fixed 32-galaxy array is replaced by a lazily generated,
  unbounded cluster → group → galaxy hierarchy, addressed the same way the
  existing sector → cell → system hierarchy already is. The legacy 32 galaxies
  become exactly "group `(0,0,0)`, cluster `(0,0,0)`" under the new scheme, and
  must regenerate byte-identical, so every existing bookmark and screenshot
  keeps working.
- **Work breakdown**: four packages (Cosmic & Stellar Time, Space & Address
  Hierarchy, Surface & Biosphere Unification, Time-Navigation UI), each with
  exclusive file ownership. `main.ts` and `catalog.ts` each have exactly one
  owner.

---

## 1. The core contract

### 1.1 Shape every generator follows

`living-worlds-and-time-roadmap.md` already proposed `worldAt(...)` and
`surfaceAt(...)` query shapes. This section makes that concrete and general:
there is no single giant dispatcher function — there is a **family** of
per-kind query functions that all satisfy the same shape and purity rules.

```ts
// src/address.ts (Package B)
export type BranchId = 'baseline'; // only legal value in v1; reserved for future branching

// src/world-time.ts (Package A)
export type Ns = bigint; // signed nanoseconds since the Big Bang (t = 0n)

// The generic shape. Not a literal function signature every module exports —
// every concrete query below (galaxyAt, starLifecycle, planetStateAt,
// surfaceAt, biosphereAt, ...) must conform to it.
type WorldQuery<Address, Result> = (
  seed: string,
  address: Address,
  t: Ns,
  branchId: BranchId,
  versions: WorldVersions, // see 1.3
) => Result;
```

### 1.2 Purity rules (non-negotiable, extends the existing "pure catalogue" rule)

1. **No wall-clock, no render/camera state, no worker completion order, no
   object-map iteration order** as an input. This already holds for
   `catalog.ts`; it must now also hold for every time- and history-producing
   module. `main.ts`'s `playing`/`autopilot`/`walker` state is a *client* of
   these functions, never an input to them.
2. A query result for `(seed, address, t, branchId, versions)` must be
   identical regardless of visit order, cache warmth, worker count, or which
   direction time was approached from (playback vs. direct seek). This is the
   **t-seek independence** acceptance test in §6.4.
3. **Two classes of math, two rules**:
   - *Discrete, branch-affecting decisions* — anything that gates existence,
     counts, or a threshold-crossing outcome (does this galaxy merge before
     `t`? is this planet engulfed? how many systems in this cell?) — **must**
     go through the deterministic fixed-point/det-math path already
     established by `catalog.ts`'s `expNeg`/`sine`/`logPos`/`poisson`, or the
     shared `det-math` module once it lands. Never call platform
     `Math.exp`/`Math.sin`/`Math.log`/`Math.random` for these.
   - *Continuous, non-branching quantities* — orbital phase, spin angle, the
     cosmic scale factor `a(t)`, interpolated color/luminosity — may use
     ordinary IEEE doubles and platform transcendentals, exactly as
     `orbitPosition` does today. These already have "tolerant comparison"
     status per the v1 spec's two-layer determinism contract (§3 there).
     `a(t)` in §4.1 is explicitly in this bucket.
4. Every module keeps its own version string (see §6.2 for the full bump
   table). A query's result must change if and only if its own version, or a
   version it explicitly declares as an input, changes — never a sibling
   module's version.

### 1.3 Versions and caching

```ts
export type WorldVersions = {
  time: string;       // world-time.ts, TIME_VERSION
  space: string;       // address.ts, ADDRESS_VERSION
  cosmology: string;    // cosmology.ts, COSMOLOGY_VERSION
  catalog: string;       // catalog.ts, VERSION
  history: string;      // world-history.ts, HISTORY_VERSION (stellar/planetary lifecycle)
  surface: string;      // world-surface.ts, SURFACE_VERSION
  terrain: string;       // terrain.ts, TERRAIN_VERSION
  biosphere: string;    // biosphere-model.ts, BIOSPHERE_VERSION
  galaxyHistory: string; // galaxy-history.ts, GALAXY_HISTORY_VERSION
};
```

A `WorldVersions` bundle is part of every save/bookmark/URL, exactly as the
existing manifest concept in the v1 spec (§3) describes. Loading an old bundle
with a stale `time` or `history` version routes through the one-shot migration
shim in §6.2, not silent reinterpretation.

⚠ **Scope note, added 2026-09-17 after the `surfaceQuery`/`surfaceAt` divergence
finding (§2.6). `WorldVersions` covers the pure generator/query layer only** —
the functions matching the `WorldQuery` shape in §1.1. It has **no jurisdiction
over, and must never be extended to cover, which call site a consumer
(`main.ts`, `ground-walker.ts`, any renderer) chooses to invoke, or with what
arguments.** That is a property of the deployed build, not of the data.

⚠ **Eight of these nine keys are written but NEVER READ. Verified by tracing
every consumer, 2026-09-17.** The only field ever consulted is **`time`**, at
`time-nav.ts:240` (`resolveTimeFromUrl`), and only to disambiguate a legacy
catalogue-relative `date` offset from an absolute `t`. `space`, `cosmology`,
`catalog`, `history`, `surface`, `terrain`, `biosphere` and `galaxyHistory` are
encoded into **every bookmark URL** by `persist()` (`main.ts:943-956` →
`writeTimeToUrl`, `time-nav.ts:246-256`) and then consulted by nothing.
`surfaceAt` and `biosphereStateAt` accept `versions` purely for `WorldQuery`
shape conformance and immediately discard it (`void versions;`,
`world-surface.ts:155,291`).

**Rule that follows: check the READER, not the writer.** A field existing in
`WorldVersions` is not evidence that anything acts on it.

⚠ **What happens today on a version mismatch: complete silent divergence.**
There is no migration, no warning banner, no console log and no gate for any
field but `time`. `main.ts:118` wraps `resolveTimeFromUrl` in a bare
`try{}catch{}` that swallows errors, and `window.__atlas.versions`
(`main.ts:4395`) exposes only the *running build's* versions — never a
comparison against the bookmark's loaded `wv`. **No app-wide build identity
exists at all:** `package.json`'s `version` is not imported anywhere in `src/`,
and there is no `APP_VERSION`/`BUILD_SHA`/`GIT_SHA`.

Two distinct fixes, in cost order — they cover different cases and neither
substitutes for the other:

1. **Cheapest, highest value: actually read the eight dead keys.** Compare the
   loaded `wv` against `CURRENT_VERSIONS` and surface a one-line, non-blocking
   notice on any difference (reusing the `announce()` idiom already used for
   `groundedSeekFallback`). The machinery is already written into every
   bookmark; this is near-zero cost and covers **every algorithm change** —
   including the moving-sea work, where `TERRAIN_VERSION` genuinely does bump.
2. **A separate `BUILD_VERSION`, persisted as a sibling `bv` param** — *not* a
   tenth `WorldVersions` field, for the boundary reason above. This is the only
   thing that can cover **pure rewiring**, the `surfaceQuery`→`surfaceAt` class,
   where **zero** `WorldVersions` fields change yet walkability, camera hover
   height and landing eligibility all move for a saved bookmark.

⚠ **Weigh (2) against a demonstrated failure before adopting it.**
`tests/acceptance/version-compat.test.mjs:85-98` is a standing test documenting
that `TERRAIN_VERSION` **already drifted** from an unrelated change. Manual-bump
discipline in this project has a track record of failing, and nothing in CI
enforces it — so a tenth constant to remember is a real cost, not a free one.

*Unrelated but easily confused:* the one genuine version consumer in the
codebase is `travel.ts:18`, which keys a session-local sampler cache on
`body.hydrology?.version` (derived from `DRAINAGE_VERSION`, `drainage.ts:134`).
That is real cache invalidation, but it is neither `WorldVersions` nor
persisted — do not cite it as evidence this bundle is load-bearing.

**Caching is t-bucketed per level**, because continuous scrubbing produces a
new `t` every frame and most levels change on a much coarser timescale than
that. The bucket key, not raw `t`, is the cache key:

| Level | Bucket rule | Rationale |
|---|---|---|
| Cosmology (`a(t)`, era label) | ~64 hand-placed era checkpoints (§3.1) + linear interpolation between neighbours | `a(t)` is smooth; era labels are genuinely discrete |
| Galaxy existence/merger | 1 Myr while `t` is within ±50 Myr of a scheduled birth/merger/quench event, else 100 Myr | events are rare; most of a galaxy's life needs no re-evaluation |
| Star lifecycle stage | **phase-fraction**, not absolute time: bucket at `1/4096` of the *current life-stage's* duration | a red dwarf's trillion-year main sequence and a blue giant's few-million-year one get the same *relative* cache resolution |
| Planet lifecycle stage | same phase-fraction rule as star, keyed to the planet's own stage duration | ditto |
| Orbit / spin phase | not bucketed — O(1) analytic evaluation (Newton solve, already cheap); render-side instancing caches may separately quantize to `1/512` of the orbital period, that is a renderer concern, not this contract's | matches existing `orbitPosition` behaviour |
| Biosphere species existence | integer **Myr of planet age** (unchanged resolution from today's `biosphereAt`, just rekeyed — see §2.4) | existing `MAX_DATE_MYR` bound already assumes this |

Phase-fraction bucketing means the cache key for a star is
`(starAddress, stage, floor(4096 * (t - stageStartNs) / stageDurationNs))` —
cheap to compute once `stageStartNs`/`stageDurationNs` are known (an O(1)
lookup against the star's own lifecycle record, itself cached per-address with
no `t` dependency at all, since formation/duration/outcome do not depend on
`t`).

---

## 2. Time model

### 2.1 Origin and range

```ts
export const NS = 1_000_000_000n;
export const YEAR_NS = 31_557_600n * NS;               // unchanged (Julian year)
export const CATALOGUE_EPOCH_NS = 13_787_000_000n * YEAR_NS; // 13.787 Gyr, Planck 2018 age estimate
export const UNIVERSE_END_NS = tenToThe(100) * YEAR_NS;      // heat-death proxy, see §3.1
export const TIME_VERSION = 'atlas-time-2';             // was 'atlas-time-1'
```

**Why Big Bang, not catalogue epoch, as the zero point**: the user goal is a
universe traversable "from the beginning to the end." Keeping `t = 0` at
today's snapshot (the current behaviour) would force every cosmic-scale query
to carry a second, separately-signed "epoch of the universe" parameter
alongside `epoch`, which is exactly the kind of dual-clock confusion
`living-worlds-and-time-roadmap.md` warns against ("one shared cosmic date
feeds universe, galaxy, system and surface queries"). A single BigInt-ns axis
with `0n` at the Big Bang means every level — cosmology, galaxy, star, planet,
biosphere — reads off the same number line without a sign flip or a second
epoch to remember. `CATALOGUE_EPOCH_NS` is the one constant that ties the
existing static 32-galaxy snapshot (and every existing `epoch=0n` fixture) to
this new axis: `oldEpoch == 0` now means `t == CATALOGUE_EPOCH_NS`.

`YEAR_NS` is unchanged — `phaseAt`'s BigInt-modulo design already survives
huge absolute magnitudes (`((time % period) + period) % period`), which is
exactly what `walking-and-time.md` verified ("avoids losing frame increments
at enormous epochs"). Moving the origin does not touch that code path.

**Range**: `[0n, UNIVERSE_END_NS]`, closed at **both** ends. `t = 0n` — the Big
Bang instant itself — is a legal, addressable, round-trippable time, exactly as
the ceiling is; the whole point is travel from the beginning to the end, so both
endpoints must be reachable. `yearsToDate` accepts either endpoint exactly and
rejects anything outside the range loudly, never clamping.

⚠ **The floor was missing in code until 2026-09-16** and is worth recording,
because it failed silently rather than loudly: `yearsToDate` tested only
`magnitudeNs > UNIVERSE_END_NS`, applying that check regardless of sign, so the
"Absolute year since the Big Bang" UI field could seek to a negative `t` and
`persist()` would write it into the URL. Nothing downstream complained —
`cosmology.ts`'s `Math.max(0, tGyr)` floors every negative time, so `t = -5e8`
years and `t = -1e90` years both yield `a(t) = 0`, numerically identical to the
Big Bang. A pre-Big-Bang bookmark was therefore indistinguishable from a valid
one rather than being an error.

**Deliberate asymmetry between the two entry points, do not "fix" it into
consistency**: `yearsToDate` (a parser of direct user input) *rejects*
out-of-range values, while `resolveTimeFromUrl` (`time-nav.ts`) *clamps* them
into range. That is intended. A user typing an impossible year should be told
so; a stale or hand-edited bookmark should still open onto a valid universe
rather than throwing the visitor onto an error, since a URL may predate any
given version of the range. Loud for input, forgiving for restore.

`10^100` years is not a physical
prediction — it is a declared UI/data ceiling past the point where ordinary
stellar-scale representation stops meaning anything (see §3.1's dark era).
BigInt has no fixed width, so storing a `~3×10^116`-nanosecond number is not
a representational problem; the problem is giving the *player* a coherent way
to reach it, which §3 addresses.

### 2.2 Per-level representation

Each level has its own lifecycle record, computed once per address
(`t`-independent) plus a `stateAt(record, t)` function (cheap, called every
frame the object is visible):

```ts
// Cosmology — universe-wide, one instance, t-dependent, continuous.
function scaleFactorAt(t: Ns): number;              // §4.1
function eraAt(t: Ns): { id: string; label: string }; // §3.1 checkpoint table

// Galaxy — one lifecycle record per galaxy address, t-independent inputs.
type GalaxyLifecycle = {
  birthNs: Ns; quenchNs: Ns | null;      // quench: star formation ends, morphology may drift toward elliptical
  mergeNs: Ns | null; mergedIntoAddress: GalaxyAddress | null;
  comovingPosition: V3; peculiarVelocityKmS: V3; peculiarFreezeNs: Ns; // §4.2
};
function galaxyLifecycle(seed: string, address: GalaxyAddress): GalaxyLifecycle;
function galaxyStateAt(lifecycle: GalaxyLifecycle, t: Ns): {
  stage: 'unformed' | 'active' | 'merged';
  properPosition: V3; // comoving * a(t) + peculiar(t), or successor's frame if merged
};

// Star — one lifecycle record per star address, t-independent inputs.
type StarLifecycle = {
  formationNs: Ns; giantNs: Ns; remnantNs: Ns;
  outcome: 'white-dwarf' | 'neutron-star' | 'black-hole';
  massKg: number; // unchanged from today's Body.massKg
};
function starLifecycle(seed: string, address: BodyAddress, body: Body): StarLifecycle; // §2.3
function starStateAt(lifecycle: StarLifecycle, t: Ns): {
  stage: 'unformed' | 'main-sequence' | 'giant' | 'remnant';
  radiusM: number; temperatureK: number; luminosityRel: number; // relative to formation-time value
};

// Planet — one lifecycle record per planet address, depends on its star's StarLifecycle.
type PlanetLifecycle = {
  formationNs: Ns; coolingNs: Ns; oceanNs: Ns | null;
  engulfedNs: Ns | null; // set only if orbit.a falls inside the star's giant-phase envelope
};
function planetLifecycle(seed: string, address: BodyAddress, body: Body, star: StarLifecycle): PlanetLifecycle; // §2.3
function planetStateAt(lifecycle: PlanetLifecycle, star: StarLifecycle, t: Ns): {
  stage: 'unformed' | 'accreting' | 'molten' | 'solid' | 'engulfed';
  waterKeys: WaterKey[]; // feeds world-surface.ts, see §2.4
};
```

### 2.3 Stellar and planetary lifecycle formulas

**Stars** — keep `world-history.ts`'s existing mass–lifetime power law
unchanged (`mainYears = clamp(3e6, 1e13, round(1e10 * solarMass^-2.5))`); it
is already a standard textbook approximation (1 M☉ ≈ 10 Gyr main-sequence
lifetime, steep mass scaling) and the giant-phase/outcome heuristics
(giant duration ≈ 10% of main-sequence duration; outcome thresholds at 8 and
25 M☉) are reasonable engineering approximations worth preserving. The only
change is **re-anchoring formation to the new absolute axis** instead of a
negative offset from the catalogue epoch:

```ts
const solarMass = clamp(0.08, Infinity, body.massKg / 1.98847e30);
const mainYears = clamp(3e6, 1e13, round(1e10 * solarMass ** -2.5));
const ageFraction = 0.15 + Number(hash64(body.seed + '/history-age') % 5000n) / 10000; // unchanged draw
const formationNs = CATALOGUE_EPOCH_NS - BigInt(round(Math.min(mainYears, 13.7e9) * ageFraction)) * YEAR_NS;
const giantNs = formationNs + BigInt(mainYears) * YEAR_NS;
const remnantNs = giantNs + BigInt(round(mainYears * 0.1)) * YEAR_NS;
```

This preserves the existing, already-tested "stars visible in today's static
catalogue are typically mid-life at the reference epoch" property exactly —
only the zero point moved. `outcome` is unchanged (mass thresholds at 8 and
25 M☉). Promote this from "heuristic sidecar, export-only" to
**authoritative**: `visualEvolution` becomes `true`, and `HISTORY_VERSION`
bumps (§6.2).

**Planets** — nothing like this exists today; this is new. Formation is
pinned to the host star's formation plus a standard protoplanetary-disk
clearing delay; cooling scales with body size (bigger bodies retain internal
heat longer — a coarse thermal-diffusion heuristic, `∝ radiusM^2`); oceans
condense a fixed delay after cooling if `body.water > 0`; engulfment checks
the orbit's semi-major axis against a giant-phase envelope radius:

```ts
const diskClearingNs = between(seed + '/disk', 1e6, 10e6) * YEAR_NS;       // 1–10 Myr, standard disk lifetime
const formationNs = star.formationNs + BigInt(round(diskClearingNs));
const coolingYears = clamp(10e6, 200e6, (body.radiusM / 6.371e6) ** 2 * 40e6); // Earth-radius-normalized, 40 Myr baseline
const coolingNs = formationNs + BigInt(round(coolingYears)) * YEAR_NS;
const oceanNs = body.water > 0 ? coolingNs + BigInt(round(between(seed + '/ocean', 10e6, 50e6))) * YEAR_NS : null;

// Engulfment: does this orbit fall inside the star's expanded giant-phase radius?
const giantRadiusAu = 0.7 * solarMass ** 0.3;                    // engineering approximation, not a stellar-structure model
const engulfedNs = (body.orbit!.a / AU) < giantRadiusAu * 1.3 ? star.giantNs : null;
```

These are explicitly labelled engineering approximations in the same register
as `catalog.ts`'s existing `system()` heuristics (spacing, moon-count,
belt placement) — not a claim of astrophysical fidelity.

### 2.4 Biosphere: fix the wrong clock, don't redesign the model

`biosphere-model.ts` already has the right internal shape
(`birthMyr`/`deathMyr`, `exists(species, dateMyr)`, `MIN/MAX_DATE_MYR`
bounds) — its bug is that `dateMyr` is a **global atlas offset**, not a planet
age, and it is seeded from a bare `profile` string instead of the body's own
address, so two different planets with the same profile share one biosphere
history. Fix both by rekeying, not rewriting:

- `generateBiosphere(seed, profile)` → `generateBiosphere(seed, profile,
  bodyAddress)`, folding `bodyAddress` into every existing seed derivation
  (the function already does this pattern internally for `planetId`).
- `biosphereAt(world, dateMyr)` → `biosphereAt(world, planetAgeMyr)` where
  `planetAgeMyr = Number((t - planet.formationNs) / (1_000_000n * YEAR_NS))`,
  computed by the caller (Package C), not inside `biosphere-model.ts` — this
  module stays independent of `world-time.ts`'s BigInt type, exactly as it is
  today (it already only imports `YEAR_NS`, not the clock itself).
- `world.formationMyr`/`world.surfaceMyr` stop being independently-seeded
  fictional offsets and become derived from the real `PlanetLifecycle`:
  `formationMyr = 0` (by definition, this clock now starts at planet
  formation), `surfaceMyr = round((coolingNs - formationNs) / (1e6 * YEAR_NS))`.

Bump `BIOSPHERE_VERSION` (species existence timing output changes — see
§6.2).

### 2.5 Water level keys: populate them from the planet lifecycle

`world-surface.ts`'s `WaterKey[]` mechanism is correct and already tested
(`waterLevelAt` interpolates correctly). **Landed 2026-09-16**: `surfaceAt`
now populates `keys` from real lifecycle state via `waterKeysFor`, gated on
`oceanReady`, closing the "`keys` is always `[]` in production" gap this
section was written to fix. The older `surfaceQuery` entry point is unchanged
and still takes an explicit `keys` argument that its callers must supply
themselves. Package C wired it up as:

```ts
function waterKeysFor(planet: PlanetLifecycle, star: StarLifecycle): WaterKey[] {
  if (planet.oceanNs === null) return [];
  return [
    { dateNs: planet.oceanNs, levelM: 0 },                 // ocean condenses at formation level
    { dateNs: star.giantNs, levelM: /* evaporation ramp */ -8000 }, // boils off as the star brightens pre-giant
  ];
}
```

The exact ramp shape is an implementation detail for Package C; the contract
is: **water level is authored as ordered `WaterKey`s derived from
`PlanetLifecycle`/`StarLifecycle`, never as a free-standing per-planet
random draw.** This closes the "keys always empty" gap and the "planets
render before their star forms" bug in one pass, because both were downstream
of the same missing wiring. **Landed 2026-09-16**: `world-surface.ts` now
imports and reads `StarLifecycle`/`PlanetLifecycle` directly, in both
`surfaceAt` and `biosphereStateAt` — they are no longer confined to
`world-history.ts`'s export-only sidecar.

### 2.6 Existence gating: what renders outside `[birth, death)`

| Object | Before birth | After death |
|---|---|---|
| Galaxy | not rendered (pre-galactic backdrop only, §3.1) | `merged`: redirect to `mergedIntoAddress`; nothing renders at the old address |
| Star | protostellar/disk placeholder (a simple glow — visual asset is future work; the *data* gate exists now). **Verified accurate 2026-09-16**: the mesh is built for every body and `applyExistence` sets `.visible=false` while `stage==='unformed'`; no glow asset exists | ⚠ **no visual change at death** — corrected 2026-09-16, this cell previously described a remnant render as though it existed. A dead star renders *pixel-identically* to its main-sequence self: same `sphere()` mesh sized from static catalogue `Body.radiusM` (`system-layout.ts`), same `MeshBasicMaterial({color: b.color})`, same halo. The existence gate (`main.ts`) only keeps it **visible** — `stage !== 'unformed'` is equally true for `'giant'` and `'remnant'`. A distinct remnant render is **future work**; the *data* exists now |
| Planet | not rendered (still part of the disk) | `engulfed`: not rendered (future: debris marker inside the star's giant-phase shell); otherwise still rendered, in `solid`/frozen-ocean state |
| Ocean/water | n/a, gated by planet existence | ⚠ **modelled, but not rendered** — corrected 2026-09-16; this cell previously described the ramp as though something drew it. The `WaterKey` ramp does handle evaporation/freezing without deleting the body, but **only inside `surfaceAt`, which no render call site calls** (see the note below). Every drawing and walking path passes *no* keys, so `waterLevelAt` returns its documented `0` no-data fallback and the rendered sea level is pinned at 0 m for every `t` |
| Biosphere species | not rendered before `birthMyr` (unchanged existing rule) | not rendered after `deathMyr` (unchanged existing rule, now on the correct clock) |

⚠ **RESOLVED 2026-09-17 — stars now visibly evolve. The gap is described below
as it stood, because the reasoning still matters; the resolution follows it.**

⚠ **The largest remaining gap in the time axis: stars do not visibly evolve.**
`starStateAt` computes a complete stellar life story — main-sequence, `'giant'`
expansion, `'remnant'` collapse, with per-stage radius, temperature and
luminosity (`stellar-evolution.ts`) — and **every visual field is discarded by
every caller**. Star size comes from static catalogue `Body.radiusM`, colour
from static `Body.color`, and the single `DirectionalLight` has a fixed colour
and intensity that never consults `luminosityRel`. `outcome` and the remnant
constants travel as far as `world-history.ts`'s `stellarHistory()` and into
`exportData()`'s JSON download, and no further; `visualEvolution: true` is
metadata, not a code path.

The consequence is worth stating plainly, because it cuts against this
project's whole purpose: **seek ten billion years and the sky is unchanged.** A
star that should have swollen into a red giant and engulfed its inner planets —
an event §2.6's own Planet row already gates on — looks exactly as it did at the
catalogue epoch. The data layer is complete and tested; only the consumption is
missing. This is the highest-value remaining item for making the time axis
*visible* rather than merely correct.

**Resolution, landed 2026-09-17 (`src/main.ts` only — a pure consumer change).**
`applyExistence()` composes star mesh scale as `baseScale * (st.radiusM /
body.radiusM)` and tints mesh and halo colour by
`blackbodyTint(st.temperatureK, referenceK)` applied to the static
`body.color`; `positionSystem()` tints the `DirectionalLight` from
`LIGHT_BASE_COLOR = '#ffecd0'` by the same ratio and sets
`intensity = 3*sqrt(luminosityRel)`, or 0 for an unformed star or a black-hole
remnant. Both hooks already ran every frame and on every seek, so no new call
site was added to the animation loop.

**Normative rule this established — it generalises well beyond stars.** Every
visual quantity driven from lifecycle state **MUST be self-normalising against
its main-sequence/catalogue reference**, so that the catalogue epoch renders
*bit-identically* to before and only genuine evolution changes pixels.
Replacing an art-directed constant outright is what breaks this: an absolute
`blackbodyColor(5772K) ≈ #fff2e6` in place of the hand-picked `#ffecd0`
re-lights the entire scene at `t = now`, and it broke `tests/surface.mjs:140`
even though every star value was computed correctly. Note also that the
reference temperature must come from `starStateAt` evaluated at a main-sequence
instant, **not** from catalogue `Body.temperatureK`: `catalog.ts:781` rounds
(`Math.round(5772*sqrt(solarMass))`) where `stellar-evolution.ts:96` does not,
so the catalogue route yields a ratio of ~1.0000 while `starStateAt` returns
the identical double and yields exactly 1.

Measured `window.__atlas.starVisual`, same star, two epochs — main sequence
`{radiusScale: 0.9999999999999997, colorHex: 'd7e7ff', lightIntensity: 3,
lightColorHex: 'ffecd0'}`, bit-identical to the pre-feature statics; remnant
`{radiusScale: 0.00694, colorHex: 'a6c8ff', lightIntensity: 0.03,
lightColorHex: 'c6ccd0'}` — collapsed, blue-shifted and dimmed. The four-engine
golden gate showed **zero digest movement**, and no `WorldVersions` key was
bumped: these are continuous presentation quantities under §1.2 rule 3, every
caller of `starStateAt` reads only `.stage`, and `tests/golden/generator.ts`
never imports `stellar-evolution.ts` at all.

⚠ **Caveat, and a determinism observation in its own right.** The orbital view
is **not temporally stable at a fixed `t`**: with this feature disabled
entirely, the invariance assertion at `tests/surface.mjs:140` measures a
baseline `meanRGBDelta` of **0.052 ± 0.001** against its `0.1` threshold — two
screenshots 500 ms apart, nothing touched, already differ by half the budget.
Something animates on wall-clock while simulated time stands still. The
assertion therefore has only ~2x headroom, which is why a scene-lighting change
could destabilise it without being wrong. Treat that thin margin as a known
property of the test, never as licence to raise the threshold.

⚠ **The animator is now NAMED (2026-09-17, read end-to-end): it is the ocean,
and it runs on wall-clock.** The chain, every link verified by reading the
source rather than inferred:

| # | `file:line` | What happens |
|---|---|---|
| 1 | `planet-renderer.ts:630` | `if(!this.debug.freezeWater)this.waterTime+=Math.min(dt,.1);` — `dt` is the **real frame delta**, not simulated time |
| 2 | `planet-renderer.ts:733` | passes `timeSeconds:this.waterTime` into the ocean patch frame |
| 3 | `ocean-water-material.ts:148` | writes it to the `oceanTime` GLSL uniform |
| 4 | `ocean-water-material.ts:85` | Gerstner **vertex displacement** — the sea surface physically moves |
| 5 | `ocean-water-material.ts:115-117` | three normal-atlas phases scroll at `wind*t*.48`, `-wind*t*.21`, `wind*t*2.1` |

Simulated time never enters that path. Seek to a fixed `t`, touch nothing, and
the ocean keeps waving — so the rendered frame is **not** a pure function of
`(seed, address, t)`. That is a determinism observation about the project's
central premise, and it is much larger than the test threshold it was found
through.

**Contrast the clouds, which are the correct pattern** (`planet-renderer.ts:619`):
`cloudAccumS+=dt` decides *when* to recompute, but the recomputed value is
`this.clouds.update(seed, id, worldNs)` — keyed to **simulated** `worldNs`. Wall
clock sets the cadence; simulated time sets the value; at frozen `t` every
recomputation returns the same answer. **That split — cadence may be real-time,
value must not be — is the rule to apply to any future animated surface.**

Note this is *not* an argument for freezing the sea. An ocean that is visibly
still is its own defect. The correct fix derives the wave phase from simulated
time (the body's own elapsed ns, as `planet-clouds.ts:89`'s `windAngle` already
does with exact BigInt modulo), so the sea animates while `t` advances and holds
still while `t` does not. `ocean-gerstner.ts` is already pure by construction
(its lines 19-20 state that seeking directly to a time equals stepping to it),
so the defect is **the value passed in, not the wave function** — which makes
this a small change at the call site rather than a shader rewrite.

✅ **MEASURED 2026-09-17 — the ocean is the SOLE source, confirmed by controlled
A/B.** Freezing the ocean collapses the orbital drift to **exactly zero**:

| Condition | 4 replicate `meanRGBDelta` | Mean |
|---|---|---|
| **Control** — `freezeWater` OFF | `0.21927`*, `0.03142`, `0.03135`, `0.03299` | 0.0788 |
| **Treatment** — `freezeWater` ON | `0`, `0`, `0`, `0` | **0.0** |

\* run 1 is a settling transient immediately after the initial wait; runs 2-4
cluster tightly.

Zero is a stronger result than the threshold required. It means the two frames
are **bit-identical** with the water frozen — so no second wall-clock-driven
visual source exists in the orbital view. Everything else in that scene is
already a pure function of simulated `t`.

Reached without editing source, via `window.__atlas.shoreDebug({freezeWater:true})`
(`main.ts:4320` → `planet-renderer.ts:171`'s `Object.assign(this.debug, options)`),
the same hook `tests/shore-stability.mjs` already uses.

⚠ **Method note, worth more than the numbers.** The first A/B design —
fresh page load per run — was **confounded and discarded**: per-navigation
camera/terrain settle variance swamped the effect. The valid design is a
**single page load with `freezeWater` toggled mid-session**, holding camera and
scene fixed, so the flag is the only thing that changes. Any future A/B on a
rendered quantity in this project should follow that shape.

### ⚠ The policy question this forces: is ripple phase *canonical* or *presentation*?

Stated plainly because an earlier revision of this section got it wrong.
That revision said "freezing the sea is not the fix — a visibly static sea is
its own defect." **That framing is incoherent:** purity in `t` and motion at
frozen `t` are contradictory by definition. A quantity cannot both be a
function of `t` alone and change while `t` does not. One of the two must give:

1. **Pure in `t`.** Determinism holds; pause time and the sea is glass.
2. **Always moves.** The sea looks right; `world(seed, address, t)` is false.
3. **Explicitly non-canonical presentation.** Wave phase is declared outside the
   determinism guarantee, like fauna gait (leak #2 below) — the guarantee then
   covers world *state*, not every animated surface.

**The same question governs the fauna deviation**, and the two should be
answered together rather than drifting apart. Whatever is chosen belongs in
§1.2 as a named, scoped exception — not in a source-file header comment.

⚠ **A fourth option may dissolve the tension entirely, and should be checked
before anyone accepts the still-sea tradeoff.** If ordinary ground exploration
advanced `epoch` at **1 simulated second per real second**, the sea would wave
at exactly the right speed *because simulated time is genuinely passing* — and
determinism would hold completely, since seeking back to that `t` reproduces
the identical wave. Time passing while you stand on a beach is the physically
honest reading, and it makes options 1 and 2 stop competing.

✅ **The 1:1 tier already exists — checked 2026-09-17.** `time-nav.ts:48`:
`{ id: 'realtime', label: 'Realtime', rate: 1, hint: 'spin & day-night' }`.
So option 4 needs no new mechanism, only a decision about which tier ground
exploration defaults to. **This is the recommended resolution:** it keeps the
sea (and rivers, and spin, and day/night) moving at physically correct rates
while `world(seed, address, t)` stays exactly true, because the motion is
*caused by* `t` advancing rather than by the frame clock. Options 1-3 all
trade something away; this one does not.

**Measured float32 facts** (these are arithmetic, independent of which policy
wins) justifying the BigInt-modulo-first phase formula:

| Quantity | Value |
|---|---|
| `CATALOGUE_EPOCH_NS` in seconds | `4.350846e17` |
| float32 ULP at that magnitude | `3.435974e10` s — **~1090 years per step** |
| `UNIVERSE_END_NS` in seconds | `3.155760e107` |
| float32 of that | **`Infinity`** (past `FLT32_MAX` = `3.4028235e38`) |

So raw simulated seconds in a float32 uniform do not degrade gracefully; they
hard-break. The phase must be wrapped with **exact BigInt modulo before any
float touches it**.

**Wrap period `P = 86400 s` (one simulated day) is derived, not chosen for
looks.** Seam-seamlessness requires `coeff·P/16 ∈ ℤ` for every atlas-scroll
coefficient — the ocean's `{0.48, 0.21, 2.1}` (`ocean-water-material.ts:115-117`)
and the river's `{0.72, 0.31, 2.1}` (`river-water.ts:127-129`) both yield the
family `P = 1600·m`, and `86400 = 1600·54` is the smallest such period matching
the existing day-tier vocabulary. Gerstner waves additionally need
`speed_i·P ≡ 0 (mod 2π)`, which **no `P` can satisfy while speeds are drawn
continuously** — so the wave speeds must be quantized to integer multiples of
`2π/P` (~19,939 distinct values across the existing band). Worst-case seam
discontinuity after both: **1.04°, once per simulated day.**

### Full wall-clock leak inventory (swept 2026-09-17)

A systematic read-only sweep of `src/` for `performance.now` / `Date.now` /
`dt` / `delta` / `elapsed` / `accum` / `requestAnimationFrame` / `setInterval` /
`setTimeout` / `Math.random`, classifying every hit. **Three** leaks reach a
rendered or simulated quantity:

| # | Enters at | Reaches | Orbital view? | Freeze flag |
|---|---|---|---|---|
| 1 | `planet-renderer.ts:630` `waterTime+=dt` | Ocean Gerstner displacement + glint (`ocean-water-material.ts:85,115-117,133`) **and rivers** (`river-water.ts:127-129,215`) | **Yes** — `:733` sets `p.ocean.visible` with no `relief`/`contactFocus` gate | `debug.freezeWater` |
| 2 | `planet-renderer.ts:788` `faunaTimeS+=dt` | Every animal's position, facing, gait (`:967` → `fauna-runtime.ts:306-317`) and leg-swing (`:1003` → `creature-rig.ts`) | No — gated `relief===1 && contactFocus` | **None** |
| 3 | `galaxy-space.ts:127,179` `born:performance.now()/1000` | 0.45 s fade-in of newly streamed star points (`:92,101,164`) | No — star-map view | None (transient) |

✅ **`Math.random()` appears NOWHERE in `src/`** — zero matches. Every
random-looking draw routes through the project's seeded `hash32`/`hash64`/
`det-math` helpers. The most dangerous class of determinism break is absent.

Leak #1's river coupling matters for the fix: **one change at the accumulator
repairs both the sea and the rivers**, since they share `waterTime`.

⚠ **Leak #2 is a DELIBERATE, DOCUMENTED deviation — and it needs an owner's
decision, not a silent fix.** `fauna-runtime.ts`'s own header states the clock is
"an ordinary elapsed-seconds presentation clock ... deliberately NOT derived
from worldNs/epoch". Someone chose this knowingly. But the consequence is that
**two visits to the identical `(seed, address, t)` show the herd in a different
pose**, which is precisely the guarantee §0 asserts. Both positions are
defensible — a herd frozen mid-stride whenever playback pauses is its own
defect — so this is recorded here as an **open deviation** rather than resolved
either way. What is NOT defensible is leaving the decision buried in a source
comment where no one reviewing the determinism contract would find it. If the
deviation is kept, it belongs in §1.2 as a named exception with its scope
(ground contact only) stated.

⚠ **Unexplained, recorded honestly:** the control arm here reads ~0.032, not the
0.052 documented above. This measurement ran under SwiftShader software
rendering; the original baseline presumably had a hardware GPU. The discrepancy
is **not** accounted for. It does not weaken the verdict — a backend difference
can shift the control magnitude but cannot produce a perfect zero in the
treatment arm — but do not treat 0.052 and 0.032 as the same measurement, and
re-establish the baseline on the target backend before tightening the
`tests/surface.mjs:140` threshold.

✅ **FIX LANDED 2026-09-17 — the orbital view is now reproducible from
`(seed, address, t)`.** The wall-clock accumulator is gone: `waterTime` is
deleted, and a stateless `oceanPhaseSeconds(worldNs)` (BigInt euclidean modulo
first, then divide, then `fround`) is computed once per `update()` and shared
bit-for-bit by the ocean patches and the river. `timeSeconds` was renamed to a
branded `oceanPhaseS` at every boundary, because "timeSeconds" was the false
affordance that let a wall-clock accumulator hide in plain sight.

**Post-fix A/B, control arm (water UNfrozen, `t` frozen), two trials:**

| Trial | 4 replicates |
|---|---|
| 1 | `25.137`, `0.0169`, **`0`**, **`0`** |
| 2 | `4.448`, `0.0169`, **`0`**, **`0`** |

Runs 3-4 are **exactly zero in both trials** — the settled steady state is
bit-identical, against ~0.032 before the fix. `npm test` 390/390; `tsc` clean;
`maxOceanWaveAmplitudeM` unaffected by the speed quantization;
`ocean-gerstner.test.mjs` needed no assertion changes (it asserts only
`speedMps > 0 && Number.isFinite`, never a pinned value).

⚠ **Runs 1-2 above were contaminated, and one of them produced a claim this
document got wrong.** Re-measured on a fully quiescent tree, the control arm
reads **`0.3592`, `0`, `0`, `0`** — replicates 2, 3 and 4 are all exactly zero,
strengthening the leak-closed conclusion.

**The `0.0169` does NOT reproduce.** An earlier revision of this note argued that
because it was bit-identical across two trials it must be "deterministic
residual settling, not noise — a measurement that repeats exactly is telling you
something." The reasoning was sound but the conclusion was wrong: it was
*reproducible contamination*, not a property of the code. **Lesson worth keeping:
reproducibility distinguishes signal from noise, but it does NOT distinguish a
property of the system under test from a property of a polluted environment.**
A contaminated tree reproduces too.

⚠ **New finding, `main.ts:4134` — the resize handler is non-idempotent.** A bare
synthetic `window.dispatchEvent(new Event('resize'))`, with no click and no
water involvement at all, moves ~1.1 `meanRGBDelta` / ~3% of pixels. The handler
recomputes `camera.aspect`, `camera.setViewOffset(...)` and
`renderer.setSize(...)`; its first firing after load shifts the projection
matrix by enough sub-pixel error to move the ocean's very peaked specular glint
(`glintExponent` up to 180) and coastline antialiasing. Camera `position`/
`target` read bit-identical (`delta: 0`), ruling out a logical camera move, and
after the first resize a genuine `#surface-detail` click produces `0`.
✅ **Re-measured on a quiescent tree 2026-09-17, and the shape is now clear.**
First resize: `meanRGBDelta = 0.559`, `changedFraction = 0.0247`. **Second
resize: `0` — a complete no-op.** A third screenshot compared against the
original pre-resize frame still reads `0.559`, i.e. nothing drifts further. So
the handler is **non-idempotent on its first firing only, then permanently
stable** — which makes it a bounded one-time defect, not a continuously
unstable path. The earlier contaminated-tree figure of ~1.1 was inflated roughly
2x.

⚠ **But the resize is probably not the whole story, and may not even be the main
one.** On the clean tree `test:surface` fails at `tests/surface.mjs:140` with
**`meanRGBDelta = 0.359`, `changedFraction = 0.0207`** (recovered with an
instrumented copy of the script; the test does not print these on failure). The
telling result is a **numeric coincidence**: the `freeze-water-ab2` control arm's
first replicate — no click, no toggle, no resize, just a 500 ms wait — measured
`0.35923…`, while the instrumented `test:surface` orbit-toggle failure measured
`0.35928…`. **Two unrelated scripts, doing different things, agreeing to five
significant figures at the same point in the page lifecycle (~3 s after orbit
`ready`).**

That points to a **generic one-time post-`ready` settling artifact** — not the
detail toggle the assertion is nominally about, not `freezeWater`, and not the
resize — as the real cause of the `test:surface` failure and of part of the
resize magnitude. **This is a strong hypothesis, not a proven fact: the
underlying mechanism has not been identified.** Whoever picks this up should
hunt the settling event first; fixing the resize handler alone would likely
leave `tests/surface.mjs:140` still failing.

⚠ **The same gap one layer down: the ocean does not visibly evolve either, and
the two queries actively disagree about where the shoreline is.** This is the
answer to the question §0 defers here ("whether every renderer call site has
switched from the older un-gated `surfaceQuery` to `surfaceAt`"). It has not:
**verified by inspection 2026-09-16**, `surfaceAt` appears nowhere in `src/`
outside its own definition in `world-surface.ts` and one passing comment in
`stellar-evolution.ts:130`. Every call site that actually draws or walks the
world calls `surfaceQuery(body)` with **no `keys` argument** — `main.ts:613`,
`:943`, `:1837`, `:1846`, and `ground-walker.ts:36`.

The two paths therefore compute different sea levels for the same body at the
same `t`:

- **`surfaceAt`** threads real lifecycle keys (`waterKeysFor`, §2.5): ocean
  condenses at `0 m` at `oceanNs` and ramps to `-8000 m` by `giantNs`. For a
  planet past `oceanNs` whose star's `giantNs` is still far in the future, the
  interpolated level at the catalogue epoch is strictly **between 0 and
  −8000 m** — not 0.
- **The renderer and walker** pass `keys = []`, so `waterLevelAt` returns `0`
  on its first line and sea level is **exactly 0 m**, forever.

So a point whose `rockHeightM` is, say, `−1500 m` is **ocean** to the renderer
and **dry land** to the contract's own authoritative query. Note this is a
disagreement about the *global* sea only; regional wetness (`wet && !ocean` —
river corridors) comes from the rock sampler and is identical on both paths.

This is deliberate and documented in code (`world-surface.ts:103–115`):
`surfaceAt` was written as additive precisely because Package C must not edit
`main.ts`. It is adoption debt, not an accident. But the user-visible effect is
the exact sibling of the stars gap above — **seek five billion years and the
shoreline has not moved**, though the data layer models the sea boiling away
entirely. Both are the same shape of defect: a complete, tested data layer with
no consumer.

⚠ **Correction, 2026-09-16, measured: adopting `surfaceAt` on the query path
will NOT move the visible shoreline.** An earlier revision of this note implied
it would; that was wrong, and the distinction matters enough to state
explicitly. The rendered ocean is a **constant-radius shell** built in
`planet-tiles.ts:250-259`, from the sea baseline `0.37 + body.water*0.22` baked
into `terrainSampler`'s coastline field (`terrain.ts:146,186`) — and
`terrainSampler`/`planetSurface` accept no date and no keys at all
(`terrain.ts:333,456`). **The water mesh never consults `WaterKey`.** The
adoption therefore splits into two genuinely independent pieces:

- **Query correctness** — the `surfaceQuery` call sites in `main.ts` and
  `ground-walker.ts`, governing walkability, camera hover height and landing
  eligibility. Package D work, cheap (~4x on a low-volume path, well under 2%
  of frame budget even uncached), and the golden gate **provably cannot move**:
  `tests/golden/generator.ts` imports neither `world-surface.ts` nor
  `stellar-evolution.ts`. No `WorldVersions` key needs bumping.
- **Visible shoreline movement** — requires changing `terrain.ts` /
  `planet-tiles.ts`, which **§6.1 assigns to no package at all** (Package C is
  explicitly forbidden to touch `terrain.ts` internals, and nothing else claims
  it). This is unowned work, and it needs its own perf budget before anyone
  attempts it: the crater precedent took one call from 346 ms to
  10,913 ms for a smaller per-sample addition.
  ⚠ **Broken cross-reference fixed 2026-09-18: this used to cite "(§6.2)" for
  the crater precedent. §6.2 is *Version bumps* and contains no perf material.**
  The crater figures live inline in this section (§2.6), immediately below.
  ⚠ **Structural gap worth closing: the contract has NO home for perf
  constraints anywhere.** §6 is §6.1 ownership, §6.2 version bumps, §6.3 what
  breaks, §6.4 acceptance tests — nothing else. At least three measured
  constraints now want a section: the crater cost, the `system-surfaces` job
  budget, and ground-contact tile starvation (`contactPatches` demanding a ±1 m
  grid of level-≤24 tiles that must all be resident **and** at `morph.value>=1`,
  measured freezing the walker for up to 19.7 s). Until that section exists,
  each of these is recorded only where it happened to be discovered, which is
  how the bad reference above came to be written in the first place.

  **Ground-contact tile starvation — measured 2026-09-18, recorded here until a
  perf section exists.** `contactPatches` (`planet-renderer.ts:1196-1197`)
  demands **every** tile of a ±1 m grid at up to **level 24**, each one resident
  **and** at `morph.value >= 1`, **all-or-nothing** — any miss returns `null`
  and `GroundWalker` freezes (`ground-walker.ts:66-67`; that gate is correct and
  must not be given a grace period, which would let the capsule move on absent
  collision geometry). Measured longest continuous `waiting:true`:

  | Landing | Longest freeze |
  |---|---|
  | Non-water-adjacent (gate coarse) | **0 ms** |
  | ~5 m from a river bank (gate fine) | **11,893 ms** |

  A water-proximity gate (`riverFeatureAt`, outward wet-edge distance, 200 m
  engage / 260 m disengage, 5 m move cache) cut engagement from ~100% to
  **30.4%**, which removes the cost where fine precision was never needed. It
  does **not** address the ~12 s freeze where it is needed: that is a
  supply/demand problem in the tile pipeline, not a gating problem.
  ⚠ Measured under SwiftShader with `TILE_WORKER_COUNT = 1`. **Whether this
  survives on hardware is unmeasured** — do not quote these as hardware figures.

✅ **Perf budget MEASURED 2026-09-17 — the crater precedent set far too high a
bar for this change, and the caution above was misplaced.** A moving sea is
**~1.4% overhead, not 30x**. The reason is structural: `terrain.ts:146`'s `sea`
shapes the **immutable rock field** and is untouched, while the `0` at
`terrain.ts:186` is a **post-hoc threshold against an already-computed
`elevationM`** — a free comparison swap. The crater blowup came from an
unbounded per-voxel spatial lookup; a water threshold needs no spatial
acceleration and adds no noise octaves on the non-flipping path.

| Call | Measured |
|---|---|
| `planetSurface(planet, 256, 40)` (system-surfaces per planet) | 40.08 ms |
| `planetSurface(moon, 64, 16)` (per moon) | 4.24 ms |
| `planetSurface(1024, 192)` (full detail) | 462.91 ms |
| **whole `system-surfaces` job, 43 bodies** | **313.28 ms vs the 60 s timeout — ~190x headroom** |
| `terrainSampler` per sample | 0.784 µs |
| one extra `noise()` call | 0.045 µs |
| `buildTile` by level | L0 15.9 / L4 13.7 / L8 26.4 / L14 11.0 / L20 7.2 / L22 6.5 ms |

The `buildTile` figures land inside §6.2's own stated 6-11 ms at level 22 — an
independent cross-check that the measurement is representative.

⚠ **There are FOUR hardcoded sea-level sites, not one, and they must all move
together.** Landing only some reproduces the very "two paths disagree about the
shoreline" bug this section documents, moved one layer down into the renderer:
`terrain.ts:186`, **`surface-biomes.ts:12`** (biome classification), 
**`planet-tiles.ts:53-55`** (`visibleElevation`), and the ocean shell at
`planet-tiles.ts:250-259`. The middle two are easy to miss.

✅ **The golden gate provably cannot move** — `tests/golden/generator.ts:201`
calls `terrainSampler(body)` with **zero extra arguments**, so an *additive
optional* `waterLevelM = 0` parameter is byte-identical at its default. This is
the same escape hatch `includeCraters: boolean = false` (`terrain.ts:337`)
already proved across three `TERRAIN_VERSION` bumps. `TERRAIN_VERSION` still
bumps, per §6.2's rule that the version states intent.

⚠ **The ocean shell is a UNIFORM SCALAR, not a per-vertex or non-spherical
change** — global sea level is one scalar per body per `t`, so the shell radius
is just `×(1 + waterLevelM/body.radiusM)`. Applied as a renderer-side uniform,
a sea-level change needs **no geometry retile** at all.

⚠ **Tile-cache staleness is the one piece with real design risk** (perf is not
the risk here). `tileKey` is `face/level/x/y` (`planet-tiles.ts:9`) with **no
time component**, so resident patches keep the shoreline they were built at
until camera churn replaces them. A forced rebuild of the resident set costs
~256 × 12 ms ≈ **3.1 s** (up to 768 × 10 ms ≈ 7.7 s in contact mode) and would
visibly stall a frame. Correct approach: stamp each patch with the lifecycle
bucket it was built at, mark stale lazily on touch, and let the existing async
priority-ordered streaming queue rebuild over several frames — accepting a
bounded, self-healing period where some tiles show the prior shoreline.

✅ **ORDER RESOLVED — this section's claim that the two pieces are "genuinely
independent" is wrong, and only one order is safe.** *Renderer-first is safe*:
the flip is structurally **ocean→land only**, so a point the query calls land
stays land under a lower sea; the query merely stays conservative, leaving some
newly-exposed seabed visible but not yet landable — a limitation, not a hazard —
and the browser tests are immune because they resolve landing points live.
*Query-first is NOT safe*: it would put walkability and landing at −4502.97 m
while the renderer still draws its shell at 0 m, so **the player would walk
around on visible water.** Land the renderer sites first, adopt the query after.
Never the reverse.

⚠⚠ **CORRECTION 2026-09-18 — READ THIS BEFORE THE CLAIM BELOW. The renderer
sites are PLUMBED BUT NOT FED, so the shoreline does NOT yet move with `t` at
runtime.** The parameter exists at all four sites and is correct; **no caller
anywhere in `src/` passes a non-zero value to it.** Verified by grep over every
call site, not inferred:

| Call site | Actual call | `waterLevelM` |
|---|---|---|
| `planet-worker.ts:8` | `buildTile(residentBody!, data.tile, data.relief)` | absent (3 args) — and this is the **only** `buildTile` caller, so *every rendered tile is built at sea level 0* |
| `planet-renderer.ts:286` | `terrainSampler(body, undefined, surfaceAgeMyr)` | absent (5th param) |
| `planet-renderer.ts:390` | `biomeClassifier(body)` | absent |
| `main.ts:2258` | `terrainSampler(body)` | absent |

The "measured proof the sea actually moves" below is still valid **as a proof
about the function**: it called `terrainSampler` directly with an explicit
argument. It is **not** evidence that the application does so. At runtime the
rendered sea level remains pinned at 0 m for every `t`, exactly as before.

⚠⚠ **This is the third occurrence of this codebase's signature failure mode —
"complete, tested data layer; no consumer" — and this time it happened *inside
the work commissioned to cure it* for the stars (§4.3) and the oceans (above).
Neither a green `npm test` nor a zero-movement four-engine golden gate can
detect an unfed parameter, because the defaults are precisely what those gates
pin.** See §6.2's corollary, which now names this case.

**Rule: before recording any Atlas feature as landed, grep the CALL SITES and
confirm a non-default argument is actually passed.** A feature is not shipped
when its parameter exists; it is shipped when something feeds it.

**Remaining wiring — designed by direct reading 2026-09-18, exact insertion
points below. Do not re-derive this.**

The renderer must NOT import `stellar-evolution.ts` to resolve the level
itself. `update()` (`planet-renderer.ts:585`) already has the precedent: `life:
LifeGateContext | null` is computed by `main.ts` and passed in. Sea level takes
the same shape — an appended optional `waterLevelM: number = 0`, defaulting to
exactly today's behaviour, alongside the `worldNs` that is **already wired**
(`main.ts:2431`). `main.ts` resolves it with the helper it already uses for
`prepareLanding`: `lifecycleFor(state.sys!, body)` → `waterLevelAt(waterKeysFor(
lc, starLc), epoch)`.

| Site | Change |
|---|---|
| `planet-renderer.ts:585` | appended optional param `waterLevelM: number = 0` |
| `planet-renderer.ts:780` | payload `{key, tile, body, relief}` → `+ waterLevelM` |
| `planet-worker.ts:8` | `buildTile(residentBody!, data.tile, data.relief, data.waterLevelM ?? 0)` |
| `planet-renderer.ts:286`, `:390` | its own `terrainSampler` / `biomeClassifier` take the same value |
| `main.ts:2431` | compute and pass, next to the `lifeGateContext(...)` argument |

✅ **`main.ts` needs NO new lifecycle resolution — the entry is already in
scope.** `updatePlanetTiles` computes `const bodyEntry = lifecycleFor(state.sys!,
state.body!)` at `:2417`, **fourteen lines above** the dispatch at `:2431`, and
`:2418` already discriminates on `bodyEntry.kind === 'star'` using `bodyEntry.lc`
as the planet lifecycle. `BodyLifecycleEntry` also carries `.starLc` (this is how
the shipped `prepareLanding` gate resolves its pair). So the whole `main.ts` side
is one expression reusing an existing local:

    const waterLevelM = bodyEntry.kind === 'star' ? 0
      : waterLevelAt(waterKeysFor(bodyEntry.lc, bodyEntry.starLc), epoch);

✅ **Waterless and pre-ocean bodies are safe with no extra guard — do not add
one.** `waterKeysFor` returns `[]` when `planet.oceanNs === null`
(`stellar-evolution.ts:206`), and `waterLevelAt([], t)` returns `0` on its first
line, so a body that never had an ocean renders exactly as it does today. A
planet *before* its `oceanNs` clamps to `keys[0].levelM` = `0 m` by the
documented first-key rule — also today's behaviour. The only bodies whose
rendering changes are ocean-bearing planets after `oceanNs`, which is precisely
the intent. (`planetStateAt` also returns these same `waterKeys`, so either
source is correct; calling `waterKeysFor` directly avoids computing a `stage`
nothing here needs.)

⚠⚠ **BLOCKING PRECONDITION discovered while designing this: the tile cache
makes the naive wiring produce a TORN shoreline, which is worse than the frozen
one it replaces.** `tileKey` is `face/level/x/y` with **no time component**, and
the request gate at `planet-renderer.ts:601` skips any tile already in
`this.patches`. So feeding a new `waterLevelM` rebuilds only *newly requested*
tiles: resident neighbours keep the sea level they were built at, and the seam
between two adjacent tiles built at different epochs is **visible geometry, not
a subtle error**. A frozen-but-consistent shoreline is a coherent world; a
half-updated one is not.

**Therefore sea-level wiring and tile staleness are ONE task, not two.** The
shape that works, using machinery that already exists: stamp each patch with the
`waterLevelM` it was built at (`planet-renderer.ts:568`, where the patch record
is assembled), quantize sea level into coarse buckets so scrubbing the date
cannot thrash the queue, and extend the `:601` gate to treat a bucket mismatch
as "not resident" — which hands the rebuild to the **existing async streaming
queue** rather than stalling a frame. A forced synchronous rebuild is ~3.1 s
orbital and ~7.7 s in contact mode (§6.2) and is not an option.

⚠ **The "cheaper alternative" was PRICED 2026-09-18 and DOWNGRADED — it is a
partial fix, and partial in a way that looks actively broken.** The idea was to
make the ocean shell radius a renderer-side *uniform* instead of baked geometry
(§2.6 flags the bake as a deviation), moving the water surface with no retile.
It does do that. But `buildTile` bakes **more than the shell**: `classify(...)`
= `biomeClassifier(body, waterLevelM)` is baked into the per-tile **colour
texture** (`planet-tiles.ts:116` and `:264`, via `substrateColor`), and
`visibleElevation` into the land heights. So a uniform alone gives a moving
water plane over a **static coastline**: newly-submerged terrain keeps its
beach/grass colouring under the risen sea, and newly-exposed seabed stays
seabed-coloured. That reads as a bug in a way the honest frozen shoreline does
not. **The uniform is a worthwhile companion to the staleness work — it removes
the water surface from the retile set — but it does NOT substitute for it.**

⚠ **Specific hazard if the uniform is attempted.** `ocean-water-material.ts:75-76`
carries an explicit warning — *"This is byte-for-byte the terrain patch
interpolation. Do not normalize or radially move it: those operations break
shared LOD seams"* — on precisely the line a radius scale would touch. Reasoning
(NOT measured, and stated as reasoning): a single **per-body uniform scalar**
should be seam-safe, because seams break when neighbouring patches disagree and
a per-body uniform cannot disagree, and because `mix` is linear so scaling after
the mix equals scaling both inputs. The real trap is elsewhere: `base =
normalize(oceanNormalAnchor + transformed)` is an **anchor-relative** encoding
(`planet-tiles.ts:284` subtracts `anchor`), so the correct transform is
`transformed*s + anchor*(s-1)`, **not** `transformed*s`. Scaling `transformed`
alone silently displaces every patch by a function of its own anchor. The exact
scale of `d.anchor` is unverified here — confirm it before writing the shader.

Only after the renderer is both fed AND consistent does the query-path adoption
become the *second* step of the renderer-first order established above.

✅ **RENDERER SITES IMPLEMENTED 2026-09-17 (capability only — see the correction
directly above; the wiring that would make it visible has NOT landed).**
All four hardcoded sites took an additive optional `waterLevelM = 0`
(`terrain.ts`'s `baseTerrainSampler` and `terrainSampler`, `surface-biomes.ts`'s
`biomeClassifier`, `planet-tiles.ts`'s `visibleElevation` and `buildTile`), and
the ocean shell radius became a uniform scalar `1 + waterLevelM/body.radiusM`.
`TERRAIN_VERSION` → `terrain-1.4.2`.

✅ **The four-engine golden gate held: PASS with ZERO digest movement**, run
twice with byte-identical results (`combined: fbf10312…8536034`; Node,
Chromium, Firefox and WebKit all matching `golden.json`). The
additive-optional-default argument was not merely plausible — it is now
verified. `npm test` 390/390.

**Measured proof the sea actually moves** (Node, paired same-direction sampling
over a 20,000-point Fibonacci sphere — not a passing suite), seed `LETHRA-001`,
`G001/C2128,0,1/0/planet/1`:

| `t` | Ocean fraction |
|---|---|
| `0` | 44.94% |
| `CATALOGUE_EPOCH_NS` | 21.02% |
| `giantNs` + 50 Myr | **9.18%** |

`waterLevelAt(CATALOGUE_EPOCH_NS)` = **−4502.97 m**, an exact match to this
section's reference. Flip count: **4784 ocean→land, 0 land→ocean** — the
structural claim above confirmed exactly, not approximately. Residual ~0.1pp
differences from the reference percentages are sampling density, not defect.

⚠ **Deviation from the design, with a consequence worth tracking: the shell
radius is BAKED PER TILE, not applied as a renderer uniform.** `planet-renderer.ts`
was owned by another agent at the time and consumes `oceanPositions`/
`oceanParents` as plain `BufferAttribute` vertex data with no sea-level
transform (`ocean.position.copy(mesh.position)` is an anchor offset only), so
baking was the only mechanism available in the owned files. **Consequence: a
sea-level change now requires a retile rather than a uniform update.** Converting
it to a uniform is worthwhile follow-up now that the file is free, and it would
also make the tile-cache staleness work below substantially cheaper.

Measured blast radius of the query adoption, at `CATALOGUE_EPOCH_NS` for
`G001/C2128,0,1/0/planet/1` under seed `LETHRA-001`: `waterLevelAt` =
**−4502.97 m**; ocean fraction **45.02% → 20.99%**; **24.03% of sampled surface
flips, all of it ocean→land, none land→ocean.** That direction is structural,
not incidental — a lower sea level can only shrink the set
`rockHeightM < levelM`. Both browser tests resolve landing points live against
the immutable rock field, so both are immune by construction.

⚠ **Trap for whoever does the query adoption.** Every call site today omits the
sampler's `date` argument and relies on its `date=0n` default
(`world-surface.ts:35`). That is harmless while `keys` is empty, but with real
keys an omitted date clamps to `keys[0].levelM` — the ocean-formation level,
0 m — via `waterLevelAt`'s documented first-key rule (`world-surface.ts:24`),
**silently reproducing the exact bug the change is meant to fix.** Pass the
epoch explicitly at every site.

⚠ **Versioning gap this exposes.** `WorldVersions` (§1.3) records *algorithm*
identity, not *consumer wiring*. A bookmark saved today would render a visibly
different sea level after the query adoption, at the same `(seed, t)`, with no
version signal that anything changed. Nothing in §6.2's compatibility rules
covers this class of change.

✅ **`prepareLanding` performed no existence check — RESOLVED 2026-09-17. The
diagnosis below is kept for context; the resolution follows it.** (`main.ts`, the
landing path): it gates only on `body.kind==='star'` / `'Gas giant'`, and
`walkable` reflects the immutable rock field, which knows nothing of lifecycle
stage. So a planet this very section's table declares "not rendered" —
`engulfed`, or not yet formed — **can still be landed on today.** The fix is a
`planetStateAt(...).stage !== 'solid'` refusal reusing `groundedSeekFallback`'s
message style. Independent of the water-key work; do not bundle them.

✅ **RESOLVED 2026-09-17, and verified by driving the app rather than by a green
suite.** The gate resolves the lifecycle pair through the existing
`lifecycleFor(state.sys!, body)` helper (already used identically by
`groundedSeekContextFor` and `lifeGateContext`, so no new lifecycle math) and
refuses when `planetStateAt(lc, starLc, epoch).stage !== 'solid'`. The real
signature, `stellar-evolution.ts:222`:

```ts
planetStateAt(lifecycle: PlanetLifecycle, star: StarLifecycle, t: Ns): {
  stage: 'unformed' | 'accreting' | 'molten' | 'solid' | 'engulfed';
  waterKeys: WaterKey[];
}
```

⚠ **Placement matters and is load-bearing:** the refusal sits **before** any
teardown (`toggleFlight`/`clearWalking`), so that a refused replay arriving from
`selectRiverDestination`'s `resumeWalk` — the captured in-flight landing intent
reissued through this same function after `restartPlanetTiles()`, i.e. the
landing-race fix recorded above — is a clean no-op rather than leaving state
half-torn-down or silently retried. `epoch` needed no plumbing; it is a
module-level binding at `main.ts:111`.

**Verification** (the point being that a passing suite is not evidence a
refusal fires). Real epochs were computed for `G001/C2128,0,1/0/planet/1` under
seed `LETHRA-001` from the actual `planetLifecycle`/`starLifecycle` functions,
then loaded through the app's own `?date=…&wv=…&walk=…` boot path:

| Epoch | Result |
|---|---|
| `accreting` | refused — *"This world is not yet solid ground at this date"*, `landing:false`, `walking:null` |
| `engulfed` | refused — *"This world has been engulfed by its star at this date"*, `landing:false`, `walking:null` |
| `solid` (control) | **lands normally**, `landing:true` — unaffected |

`tsc --noEmit` clean; `npm test` 390/390. No page errors in any case.

### 2.7 Content-layer time units: two clocks, and the provenance rule

The surface content modules do **not** share a time unit, and crossing them is a
silent-wrong-output bug rather than a crash — which is why this is a contract
clause and not a code comment:

| Module | Parameter | Unit | Plausible band |
|---|---|---|---|
| `flora-field.ts` | `tMyr` | **millions of years** (`Myr`) | `±20,000` |
| `fauna-runtime.ts` | `tSeconds` | **seconds** (`Seconds`) | `±1e15` |

Both are branded TypeScript types, so the compiler catches a direct swap. But
**brands erase at runtime**: a number that arrives through an `any`, a JSON
round-trip, or a renderer call site compiles clean and produces a plausible,
deterministic, *wrong* world. Both modules therefore also carry runtime
`RangeError` guards (`toMyr`, `toSeconds`). An adversarial review found exactly
this defect in the first implementation — nothing threw, nothing looked broken,
and the output was simply wrong.

**PROVENANCE RULE (normative).** Flora's `tMyr` MUST come from
`world-surface.ts`'s `planetAgeMyr(planet, t)`. Never compute it from raw `Ns`
with your own arithmetic. `planetAgeMyr` *clamps* into
`[MIN_DATE_MYR, MAX_DATE_MYR] = ±20,000 Myr` deliberately, because the biosphere
model has no scripted behaviour past that bound. The clamp is the point: a red
dwarf's biosphere is legitimately alive at ~1e12 yr — about 1e6 Myr — so an
unclamped age would blow the guard and turn a **legal** far-future seek into a
thrown `RangeError`, converting a working feature into a crash at exactly the
end of the timeline this project exists to let you reach.

Neither module imports `terrain.ts`. Callers supply a `(direction) => height`
ground callback, and fauna is grounded by an **outer** transform, because
`creature-rig.ts`'s `CreatureRig.update(time, gait, terrain)` accepts only its
own synthetic `'flat' | 'slope' | 'steps'` terrain. That is a known limitation of
that API, not something to work around by widening it.

---

## 3. Time is navigable

### 3.1 The scrubber: coarse log era selector + fine linear control

A single `log10(years)` slider cannot represent `t = 0` (undefined) or give
useful resolution near "now," where most exploration happens. Use the
two-control split `living-worlds-and-time-roadmap.md` already recommends
("logarithmic navigation for enormous spans, then linear fine control around
a selected event"), made concrete:

1. **Era selector** (coarse, always visible): a fixed table of named
   checkpoints, each a button/tick on a log-scaled track. This *is* the
   §1.3 cosmology cache-bucket table, reused as UI:

   | Era | Approx. `t` | Representation |
   |---|---|---|
   | Big Bang | `0` | explanatory placeholder — hot plasma field, not a rendered "explosion at a point" (per `living-worlds-and-time-roadmap.md`'s explicit caution) |
   | First stars / reionization | ~100–400 Myr | sparse, unnamed proto-stars only; no catalogue systems exist yet |
   | Galaxy assembly | ~0.5–3 Gyr | galaxies exist per `GalaxyLifecycle.birthNs`; morphology still forming |
   | **Catalogue reference ("now")** | `CATALOGUE_EPOCH_NS` (13.787 Gyr) | the existing static snapshot — default landing point |
   | Stelliferous era ends | ~10^14 yr | star formation ceases; red dwarfs (the longest-lived) die out |
   | Degenerate era | ~10^15–10^39 yr | white dwarfs cool, galaxies dynamically evaporate — explanatory placeholder, no walkable systems |
   | Black hole era | ~10^40–10^99 yr | only black holes remain, slowly evaporating |
   | Heat death proxy | `UNIVERSE_END_NS` = 10^100 yr | scrubber ceiling; explanatory placeholder, explicitly labelled a scenario boundary, never a claimed prediction (matches the roadmap's "offer a configurable future scenario... not a claimed known finite end") |

   Selecting an era jumps `t` to that checkpoint. The control position is
   `sign(t) * log10(1 + years(t))`-mapped for `t > CATALOGUE_EPOCH_NS`,
   linear-in-years for the "life-sized" band around it (roughly ±14 Gyr) so
   ordinary stellar-lifetime navigation doesn't get compressed into a pixel.

2. **Fine control** (drag/scroll while an era or object is focused): a
   linear offset in whatever unit the current era's checkpoints are spaced
   in (days near "now," matching today's playback; Myr in the biosphere
   band; Gyr in the cosmic band). This is a UI zoom level, not a new time
   representation — it only changes how much `Ns` one pixel of drag
   represents.

### 3.2 Playback rates

Keep the existing `advanceDate(date, seconds, rate)` primitive
(`date + round(seconds * rate * 1e9)` ns) and the existing default tier
(30 days/s, i.e. `rate = 86400 * 30`) as the "observation realtime" tier for
near-`CATALOGUE_EPOCH_NS` exploration. Add discrete multiplier tiers selected
by a dropdown next to the existing play button, reusing the same primitive:

| Tier | `rate` (seconds of sim-time per wall-clock second) | Useful for |
|---|---|---|
| Realtime | `1` | spin/day-night (new, §4.3) |
| Orbital (existing default) | `86400 * 30` | in-system orbital motion — unchanged behaviour |
| Historical | `YEAR_NS-scaled 1e6` (~1 Myr/s) | planet cooling, biosphere speciation |
| Geological | ~`1e9`/s (~1 Gyr/s) | galaxy formation/merger sweep |
| Cosmic | ~`1e21`/s | reaching the degenerate/black-hole/dark eras in a human-scale drag |

At the Cosmic tier, `seconds * rate * 1e9` already exceeds `Number
.MAX_SAFE_INTEGER` (2^53), so the nanosecond-level result is not exact — this
is **intentional and acceptable**: nanosecond precision is meaningless at
10^21-year time steps, and `BigInt(Math.round(...))` on a large-but-finite
double stays well inside `Number.MAX_VALUE`, so it neither throws nor
produces `Infinity`. Package D should add one clamp: reject/saturate a
`dt * rate` product that would compute `Infinity` (guards against a
pathological huge `dt` after a tab was backgrounded), not attempt to
preserve precision it can't use anyway.

### 3.3 Seeking while grounded

Today's `seekDate` already has the right instinct (clear `walker`/`landing`,
recompute `positionSystem()`, hover 160 m above the recomputed ground height)
— generalize it into an explicit policy using the existence gate from §2.6:

1. On any seek while `grounded` (`walker` or `landing` truthy), immediately
   drop to **observation hover** (unchanged: clear walker/landing/autopilot,
   compute the new `bodyPosition`/relative offset, keep camera framing).
2. Evaluate `planetStateAt`/`starStateAt` for the target `t`:
   - Body still exists, has a solid surface (`stage` is `solid` or
     `engulfed=false`) → hover at `groundHeightM(t) + 160` (unchanged
     formula, now driven by the recomputed water/terrain state). Offer
     **Land and walk** immediately; no different from today.
   - Body no longer exists (`unformed`, `accreting`, or `engulfed`) → do not
     hover over nothing. Fall back to the nearest still-existing ancestor
     scope (star system if the planet is gone, galaxy if the star itself
     hasn't formed) and announce why, e.g. "This world has not formed yet at
     this date — showing the system." This is a new case; today's code has
     no planet-existence concept so it can't distinguish this from a normal
     hover.
   - Body exists but its surface state changed sharply (ocean dried via
     `WaterKey` ramp, ice age) → same hover-then-relant flow as case 1; no
     special case needed, because `groundHeightM`/`waterHeightM` are already
     recomputed live from `surfaceAt(t)`.
3. Playback is stopped on any explicit seek (`playing=false`, already true
   today) and any in-flight camera tween is cancelled (already true today,
   per `walking-and-time.md`'s "date seeking also cancels a pending
   camera-focus animation").

### 3.4 Continuity and fade rules

Two different kinds of change need two different treatments, and conflating
them is the main risk to the t-seek-independence acceptance test:

- **Analytic motion** (orbital phase, spin angle, `a(t)`) is continuous by
  construction — `state(t)` computed directly at any `t` already equals what
  you'd get by playing forward to it, because it's a closed-form evaluation,
  not an accumulated simulation. No fade logic needed; render it directly
  every frame, exactly as `orbitPosition` does today.
- **Discrete historical transitions** (formation, giant onset, remnant,
  ocean dry-out, engulfment) are step functions in the authoritative data —
  `state(t⁻)` and `state(t⁺)` around the transition instant are genuinely
  different values, by design (§1.2 rule 2 demands this: the same `t` always
  produces the same discrete result, so there is no "smoothed" discrete
  state to store). A **visual crossfade is a presentation-layer concern
  only**: when the *player* is watching playback cross a transition, the
  renderer may blend old→new mesh/material over a bounded wall-clock window
  (≤1.5 s, matching the existing camera-tween duration budget in `main.ts`).
  If a new seek interrupts a fade, snap immediately to the target state —
  never let a half-finished fade persist as if it were data. A direct
  (non-playback) jump to any `t` always snaps with no fade, so
  `state(t)` reached by scrub-drag and `state(t)` reached by playback are
  pixel-different only during an *in-progress* fade, and identical the
  instant either settles — which is exactly what the acceptance test in
  §6.4 checks.

---

## 4. Space over time

### 4.1 Expansion: a simple, exactly-anchored ΛCDM-ish `a(t)`

Use the closed-form flat-ΛCDM solution for a matter+dark-energy universe
(ignoring the brief radiation-dominated era — acceptable, since nothing
renders there but the "explanatory placeholder" from §3.1):

```ts
// src/cosmology.ts (Package A) — continuous quantity, ordinary doubles are fine (§1.2 rule 3).
export const COSMOLOGY_VERSION = 'atlas-cosmology-1';
const H0_KM_S_MPC = 67.4;        // Planck 2018
const OMEGA_LAMBDA = 0.685;      // Planck 2018
const HUBBLE_TIME_GYR = 977.79 / H0_KM_S_MPC;                 // ≈ 14.51 Gyr
const T_LAMBDA_GYR = (2 / 3) * HUBBLE_TIME_GYR / Math.sqrt(OMEGA_LAMBDA); // ≈ 11.70 Gyr
const A_UNNORMALIZED = (tGyr: number) => Math.sinh(Math.max(0, tGyr) / T_LAMBDA_GYR) ** (2 / 3);
const A_NOW = A_UNNORMALIZED(13.787);

export function scaleFactorAt(t: Ns): number {
  const tGyr = Number(t) / Number(YEAR_NS) / 1e9;
  return A_UNNORMALIZED(tGyr) / A_NOW; // normalized so a(CATALOGUE_EPOCH_NS) === 1 exactly
}
```

**Addendum 2026-09-16 — numerical range.** The snippet above is the
specification; the landed `src/cosmology.ts` also exports `lnScaleFactorAt`,
`scaleRatio`, `properDistanceLn` and `hubbleHorizonComovingMpc`. Those exist
because `scaleFactorAt` silently saturates to `+Infinity` past `t ≈ 8.3e12` yr
(`Math.sinh` overflow) — which is a negligible fraction of the way to a
`10^100` yr ceiling, so **any caller that must stay finite into the far future
uses the log-space variants, not `scaleFactorAt`**. Note also the
`Math.max(0, tGyr)` clamp above: `a(t)` treats every `t < 0` as the Big Bang
instant rather than extrapolating backwards.

Normalizing by `A_NOW` sidesteps needing the exact `(Ωm/ΩΛ)^{1/3}` prefactor
entirely: by construction `a(CATALOGUE_EPOCH_NS) = 1`, which means **today's
frozen galaxy positions are unchanged** — this is the continuity requirement
from the existing v1 spec ("freeze galaxy... motion in v1... a static
snapshot") satisfied as a special case of the new time-aware model, not
contradicted by it. `a(t) → 0` as `t → 0` (`sinh(x) ~ x` for small `x` gives
`a ∝ t^{2/3}`, the correct matter-dominated early-time behaviour); `a(t)`
grows asymptotically exponentially for large `t`, the correct de-Sitter
far-future behaviour. Both edges are known simplifications (no radiation era,
no eventual causal disconnection of bound structures) — flagged in §7, not
hidden.

### 4.2 Galaxy comoving position, peculiar motion, and mergers

- **Comoving position**: unchanged from today's `Galaxy.position` — a frozen,
  seeded vector in the galaxy's cluster/group frame (Mpc). Proper position at
  time `t` is `comovingPosition * scaleFactorAt(t) + peculiarOffset(t)`.
- **Peculiar motion**: a small deterministic seeded velocity
  (`peculiarVelocityKmS`, drawn once per galaxy address, bounded to a few
  hundred km/s — typical peculiar-velocity magnitude), integrated **linearly
  and then frozen**:
  `peculiarOffset(t) = peculiarVelocityKmS * min(t, peculiarFreezeNs)` (unit
  conversion elided). `peculiarFreezeNs` is itself a seeded per-galaxy-group
  "turnaround time" (a few Gyr) representing the point the group virializes
  and stops drifting apart — this avoids needing any N-body integration while
  still giving galaxies a bounded, non-runaway drift. This is the "simple
  deterministic function of `t`" the brief asked for, not a physics engine.
- **Mergers**: within a group (the existing `group = floor(i / 8)` clustering
  in `galaxies()`), each galaxy gets a seeded `(mergeNs, mergedIntoAddress)`
  pair via a deterministic pairing over the group's members (implementation
  detail for Package A; the contract is the output shape in §2.2's
  `GalaxyLifecycle`). At `t ≥ mergeNs`, `galaxyStateAt` returns `stage:
  'merged'`; querying the merged galaxy's own address for its position at
  `t ≥ mergeNs` resolves within the successor's frame via
  `mergedIntoAddress`, not its own now-frozen comoving position. Systems and
  bodies that belonged to the merged galaxy keep their original address for
  lineage/history lookups (§6.2's compatibility rule), but their *position*
  after the merge is undefined in this iteration — mark it `stage: 'merged'`
  too and don't render it. Reconstructing post-merger internal structure is
  out of scope (§7).

### 4.3 Stars orbiting the galactic centre: explicitly frozen this iteration

**Decision: star systems stay frozen in their galaxy's comoving local frame.
No intra-galaxy orbital motion this iteration.** This extends, rather than
contradicts, the existing v1 spec decision ("Freeze galaxy and
system-barycentre motion in v1. Their locations are a static snapshot.").
Justification:

- Feasibility: galactic differential rotation would require either an
  N-body-ish integration or a rotation-curve model applied consistently
  across 40+ years of simulated cosmic time for potentially unbounded
  numbers of systems per galaxy — real cost for a visual payoff invisible at
  any timescale shorter than tens of millions of years (a system's orbital
  period around a galactic centre is ~200 Myr; nobody scrubs slowly enough
  through that band for it to matter, whereas the cosmic-tier playback in
  §3.2 blows straight past it).
- It composes cleanly with §4.1–4.2: a system's proper position is just
  `galaxyProperPosition(t) + systemComovingOffsetWithinGalaxy` (unchanged,
  frozen) — no new per-system integration.
- A future extension, if wanted, is a bounded angular drift
  `θ(t) = Ω(r) * (t − galaxyBirthNs)` with a flat rotation curve
  `Ω(r) = v_c / r`, applied only to the system's position *within* its
  galaxy's frame — documented here as the extension point, not built now.

### 4.4 Planetary spin, axial tilt, day/night

New, and genuinely cheap — continuous, no bucketing (§1.3):

```ts
type SpinState = { spinPeriodS: number; axialTiltRad: number; spinPhase0: number }; // seeded once per body
function rotationAngleAt(spin: SpinState, formationNs: Ns, t: Ns): number {
  // reuses phaseAt's BigInt-modulo pattern; extend world-time.ts with a
  // period-based variant so callers don't have to convert period → angularSpeed:
  return phaseFromPeriod(t - formationNs, BigInt(Math.round(spin.spinPeriodS * 1e9)), spin.spinPhase0);
}
```

Add `phaseFromPeriod(elapsedNs: Ns, periodNs: bigint, phase0: number): number`
to `world-time.ts` alongside `phaseAt` (same Euclidean-modulo pattern,
period supplied directly instead of derived from `angularSpeed`). Day/night
at a body-fixed direction is then a pure function of `rotationAngleAt`,
`axialTiltRad`, and the current star direction (from `bodyPosition`) — no new
state, no caching needed. Tidal locking / spin-period evolution near
end-of-life is a non-goal (§7): spin period is constant per lifecycle stage,
with only a documented extension point for a discrete change at
`giantNs`/`remnantNs` if wanted later.

---

## 5. Coordinates

### 5.1 The absolute address type

The existing scheme is already hierarchical and already uses exactly this
pattern one level down — `SystemRef.id` is `G003/C12,-4,7/5` (galaxy /
signed-integer-cell / ordinal). Extend it **upward** by two more
int-cell/ordinal levels, using the same Poisson-per-cell approach
`sector()`/`poisson()` already use, instead of a fixed 32-entry array:

```ts
// src/address.ts (Package B)
export const ADDRESS_VERSION = 'atlas-address-1';
export type CellV3 = [bigint, bigint, bigint]; // unbounded signed integer grid coordinate

export type GalaxyAddress = {
  clusterCell: CellV3;  // 100 Mpc / cell
  groupCell: CellV3;    // 5 Mpc / cell, relative to clusterCell
  galaxyOrdinal: number; // uint32 within the group
};
export type SystemAddress = GalaxyAddress & {
  sectorCell: CellV3;   // 32 ly / cell — unchanged from today's sector
  genCell: CellV3;      // 4 ly / cell — unchanged from today's generation cell
  systemOrdinal: number;
};
export type BodyAddress = SystemAddress & { slot: string }; // "star/0", "planet/3", "planet/3/moon/1" — unchanged today's suffix scheme
```

Generation is the same two-step Poisson-per-cell pattern used today, just
applied one (and now two) levels higher:

```ts
function groupsInCluster(seed: string, clusterCell: CellV3): GroupAnchor[]; // Poisson over 5 Mpc sub-cells, like sector()'s 4-ly cells
function galaxiesInGroup(seed: string, clusterCell: CellV3, groupCell: CellV3): Galaxy[]; // today's galaxies() body, parameterized
function resolveGalaxy(seed: string, address: GalaxyAddress): Galaxy | null;  // like refByAddress today
```

**Canonical string encoding** extends the existing slash-delimited scheme
with a prefix, e.g. `U/K(12,-4,7)/H(3,1,-2)/G007/C(184,-92,3)/41/star/0`
(`U` = universe root, `K` = cluster cell, `H` = group cell — arbitrary but
distinct single letters so parsing stays a simple regex, matching
`refByAddress`'s existing style). **Compatibility**: an address string
*without* the `U/K/H` prefix is parsed as if rooted at `clusterCell = (0,0,0)`,
`groupCell = (0,0,0)` — i.e. every existing bookmark, exported descriptor,
and test fixture keeps resolving to the same object, because that's exactly
where the legacy 32 galaxies live under the new scheme (§6.2 makes this a
hard requirement, not just a convention).

### 5.2 `WorldPosition`: one persistable type for "where," across every frame

Today, "where a thing is" is computed ad hoc at each call site
(`bodyPosition`, `rebaseSystem`, the `childAnchor`/`crossScale` functions in
`main.ts`). Formalize it once:

```ts
export type WorldPosition = {
  address: BodyAddress | SystemAddress | GalaxyAddress;
  frame: 'system-barycentric' | 'body-fixed' | 'galaxy-comoving';
  localOffset: V3; // double, meaning depends on `frame` — AU/m for system-barycentric, m for body-fixed, ly for galaxy-comoving
};
export function resolveWorldPosition(seed: string, pos: WorldPosition, t: Ns, branchId: BranchId): V3; // composes galaxy proper position (§4) + system/orbit position (unchanged orbitPosition) + localOffset
```

This is what gets persisted for bookmarks and the walking-address URL scheme
`walking-and-time.md` already describes ("store body-relative position...
and exact date") — same shape, just named and centralized instead of
reconstructed per call site.

### 5.3 Precision budget per level

| Level | Representation | Precision | Notes |
|---|---|---|---|
| Cluster cell | `bigint` triple, 100 Mpc/cell | exact | unbounded index range, no overflow ever |
| Group cell | `bigint` triple, 5 Mpc/cell, relative to cluster | exact | |
| Galaxy ordinal | `uint32` within group | exact | |
| Galaxy-local position | `double`, ly | ~10⁻⁹ ly relative | unchanged `V3` usage |
| Sector cell | `bigint` triple, 32 ly/cell | exact | unchanged from today |
| Generation cell | `bigint` triple, 4 ly/cell | exact | unchanged from today |
| System ordinal | `uint32` | exact | |
| System-local position | `double`, AU or m | ~10⁻⁹ relative | unchanged Kepler math |
| Body-fixed offset | `double`, m | sub-mm at planetary radius | unchanged from today's terrain/contact geometry (0.06–0.08 mm measured in `walking-and-time.md`) |

The only representational change from today is at the top: raw `double`
Mpc positions (which silently lose absolute precision at large coordinates,
since doubles have a fixed ~15–17 significant digits regardless of
magnitude) become `bigint` cell indices + a `double` fractional offset
*within* the cell — exactly the pattern `sector()` already uses for 4-ly
cells, just reused two levels higher, where it matters more because the
addressable range is now unbounded instead of a fixed 20 Mpc box.

---

## 6. Migration plan

### 6.1 Work breakdown: four packages, explicit file ownership

Land a **contracts step 0** first: this document plus the empty-shell
`address.ts`/`cosmology.ts` type files (no logic), so all four packages code
against agreed interfaces from day one instead of merging type changes
later. Packages A and B can then start in parallel; C depends on A's
lifecycle *types* (stub locally until A lands); D is the integration package
and lands last.

| Package | Owns (write) | Reads only | Must not touch |
|---|---|---|---|
| **A — Cosmic & Stellar Time** | `src/world-time.ts` (rewrite: origin, `phaseFromPeriod`), `src/cosmology.ts` (new, §4.1), `src/galaxy-history.ts` (new, §4.2 merges/peculiar motion), `src/stellar-evolution.ts` (new, §2.3 star+planet lifecycle formulas), `src/world-history.ts` (rewrite: authoritative, `visualEvolution: true`) | `src/catalog.ts` types (`Body`, `Galaxy`), `src/address.ts` types | `main.ts`, `catalog.ts` implementation, `river-*.ts`, `terrain.ts` |
| **B — Space & Address Hierarchy** | `src/catalog.ts` (`galaxies()` → `galaxiesInGroup()` + back-compat alias, `orbitPosition`/`bodyPosition` untouched), `src/address.ts` (new, §5.1), `src/galaxy-field.ts` (density integration over lazy groups instead of a fixed 32-array) | none blocking | `river-*.ts`, `world-time.ts`, `world-history.ts`, `main.ts`; do **not** fork a second copy of `expNeg`/`sine`/`logPos` — reuse the existing local copies until the concurrent det-math extraction lands, then switch |
| **C — Surface & Biosphere Unification** | `src/world-surface.ts` (extend `surfaceQuery` to accept `t`, consult `PlanetLifecycle`/`StarLifecycle` for existence + `WaterKey` generation, §2.5), `src/biosphere-model.ts` (rekey to planet age + body address, §2.4) | `src/stellar-evolution.ts` types (Package A, stub until landed), `src/terrain.ts` (call `terrainSampler` unchanged — do not edit its algorithm) | `terrain.ts` internals, `river-*.ts`, `drainage*.ts`, `main.ts`, `catalog.ts` |
| **D — Time-Navigation UI** | `src/main.ts` (time-UI: `seekDate`, `updateDateUI`, playback-tier selector, grounded-seek policy §3.3, `crossScale`/`childAnchor` switched to `resolveWorldPosition`), `src/time-nav.ts` (new: era-navigation §3.1, playback tiers §3.2 and grounded-seek policy §3.3 helpers, plus `WorldVersions` encode/decode and the §6.2 URL migration — split out of `main.ts` so the policy is unit-testable without a browser), `src/travel.ts` (galaxy-group crossing at universe scale), `src/star-map.ts`, `src/galaxy-space.ts` (chunk streaming over lazy groups instead of a fixed array) | Packages A/B/C's public types and functions | any file owned by A/B/C above; `river-*.ts` |

This gives `main.ts` and `catalog.ts` exactly one owner each, as required.
The only cross-package coordination point is the `GalaxyAddress`/
`WorldPosition` type shape (§5), which is why it's pinned in step 0 before
any package starts its implementation.

### 6.2 Version bumps

| Constant | Old → New | Why |
|---|---|---|
| `TIME_VERSION` | `atlas-time-1` → `atlas-time-2` | origin moves from catalogue epoch to Big Bang; `epoch=0n` now means a different instant |
| `HISTORY_VERSION` | `atlas-history-fixtures-1` → `atlas-history-2` | promoted from export-only heuristic sidecar to authoritative existence-gating source (`visualEvolution: true`) |
| `BIOSPHERE_VERSION` | `biosphere-lab-2` → `biosphere-lab-3` | reseeded by body address + rekeyed to planet age; species existence timing output changes |
| `SURFACE_VERSION` | `atlas-surface-1` → `atlas-surface-2` | `surfaceQuery` gains `t`-driven existence/ocean-dry-out gating |
| `VERSION` (catalog) | `atlas-1.0.0` → `atlas-2.0.0` | address space gains two hierarchy levels (cluster/group), even though legacy group `(0,0,0)` output is required to stay byte-identical |
| `ADDRESS_VERSION` | *(new)* `atlas-address-1` | new module |
| `COSMOLOGY_VERSION` | *(new)* `atlas-cosmology-1` | new module |
| `TERRAIN_VERSION` | `terrain-1.2.0` → `terrain-1.4.1` | **corrected 2026-09-16**: this row originally predicted "unchanged," reasoning that existence/formation gating lives in `world-surface.ts` outside `terrainSampler`. That still holds for *gating*, but `terrainSampler` itself changed three times. `1.3.0`: `**`/`Math.pow` replaced with explicit multiplication (§1.2 two-class math), and the sampler now takes the canonical river region set instead of the UI-mutated `body.hydrology`. `1.4.0`: optional crater displacement, a pure function of `(seed, address, t)` with surface age threaded from the clamped `planetAgeMyr` convention. `1.4.1`: craters default **off** at both layers (`planetSurface`'s `applyCraters` and `terrainSampler`'s `includeCraters`) — see the perf note below. Each bump is a statement that the *algorithm* changed; only the four-engine golden gate can certify what the *output* did |
| *(perf constraint, not a version)* | — | Craters are wired, deterministic and tested, but **disabled by default**, because they are a per-sample cost in paths with hard real-time budgets. Enabling them took `planetSurface` from 346 ms to 10,913 ms on a 1024×192 call, took a full 37-body system from 331 ms to 261 s against `job()`'s 60 s timeout, and took `buildTile` at level 22 from ~6–11 ms to 180–235 ms, which broke walking outright. A timeout there does not fail loudly — it silently strands the app at `level:'sector'`. Re-enabling by default requires spatial acceleration (bucket craters by direction so each sample tests only nearby ones), not a larger timeout |
| `VERSION` (`catalog.ts`) | `atlas-1.0.0` → `atlas-2.0.0` | **2026-09-16**: `ihash()` rewritten. The old z-multiplier `2147483647` (2^31−1) is nearly degenerate under `Math.imul` — almost linear, with very poor avalanche — and `s` was XORed in raw and unmixed; every input now uses an odd, high-entropy multiplier and passes through a murmur3 `fmix32` finalizer. Correct, deliberate, and correctly recorded here rather than under `TERRAIN_VERSION`, which does not own it |
| *(blast radius, not a version)* | — | ⚠ `ihash` feeds nearly every `noise()`/`macroHeightCode()` call, so the bump above moves **terrain height, coastlines, walkability, biomes and drainage at every point on every body**. Two consequences. (1) Every **hardcoded world coordinate** is invalidated: one test's landing literal went `+8002.4 m` → `−4009.2 m`, land → ocean, after which `prepareLanding()` bailed on `!s.walkable`, no walker was ever created, and the test timed out at 240 s *looking like a hang rather than a failed assertion*. Prefer resolving landing points live (`surfaceSurvey`/`coast.direction`) over `walk=` literals. (2) A saved bookmark from before this bump describes a **different world** at the same address — which is exactly what the `catalog` slot in `WorldVersions` (§1.3) exists to make detectable, and why that slot must never be dropped from a URL or save |
| `GALAXY_HISTORY_VERSION` | `atlas-galaxy-history-1` → `atlas-galaxy-history-2` | `galaxyStateAt` now honours `mergedIntoAddress` (§4.2), which was populated but never read; a merged galaxy's `properPosition` redirects to its surviving target, resolved transitively, instead of returning a hardcoded `[0,0,0]`. The matching `WorldVersions.galaxyHistory` slot was added to §1.3 at the same time, so a bookmark records which galaxy-history algorithm produced its galaxy positions |
| `RIVER_PHYSICAL_SURFACE_VERSION` | `river-physical-surface-1` → `river-physical-surface-2` | confluence arc-length taper in `buildRiverSurface`: a child channel's depth now tapers to zero and its water level blends to the parent's across `10×` local channel width, removing a genuine wet/wet bed-height cliff at T-junctions (4.44 m → 0.0086 m worst case) |
| `BIOSPHERE_QUERY_VERSION` | *(new)* `atlas-biosphere-query-1` | new composed query in `world-surface.ts`: `biosphereStateAt` gates `biosphereAt` on engulfment and stellar-remnant state, which `biosphereAt` alone cannot see |

⚠ **Corollary on what the golden gate actually certifies — added 2026-09-17,
because this document has already misread it once.** The four-engine gate
certifies output **only at the golden generator's own fixed call pattern**.
`tests/golden/generator.ts:201` is literally `terrainSampler(body)` — one
argument, hitting every default. It says nothing whatever about output at any
other argument value, **including the values production actually calls with.**

So: **"zero digest movement" does not mean "nothing changed."** It means
"nothing changed *that the generator's current call pattern can see*." Those are
very different claims, and the gap between them is exactly where the
additive-optional-parameter escape hatch lives — the same property that makes
that pattern safe (`includeCraters = false`, `waterLevelM = 0`) makes its
effects invisible to the gate. Where a change is reachable only through a
different argument value, or through a call site the generator never invokes,
**the version bump is the only signal that exists, and it is a statement of
intent, not a measurement.** Audit releases accordingly.

⚠⚠ **The sharpest instance of this, found 2026-09-18 — the gate's blind spot
hid an entire feature being inert.** The moving-sea work added
`waterLevelM = 0` at four sites and the four-engine gate passed with **zero
digest movement**, run twice byte-identical. That was read as confirmation the
change was safe. It was — but it was *equally* consistent with a second fact
nobody checked: **no call site ever passed a non-zero `waterLevelM`, so the
feature was completely inert at runtime** (§2.6's correction has the call-site
table). The gate could not have distinguished those two worlds, because in both
of them the generator calls `terrainSampler(body)` at the default.

**Corollary to the corollary: a green gate on an additive-optional-parameter
change tells you the DEFAULT path is unchanged. It tells you nothing whatsoever
about whether the non-default path is reachable, wired, or exercised.** When the
escape hatch is used, the reviewer owes a separate, explicit check that some
consumer passes the non-default value — the gate will never ask for it.

Evidence this misleads in practice: an earlier revision of §2.6 asserted that
adopting `surfaceAt` would move the visible shoreline, when it structurally
could not — the rendered sea is a constant-radius shell on a code path the
query never touches. That correction is recorded in §2.6.

⚠ **Correction to the `catalog`-slot claim in the `ihash` blast-radius row
above.** That row states the `catalog` slot in `WorldVersions` "exists to make
detectable" a pre-bump bookmark describing a different world. **It does not, and
cannot today.** As traced in §1.3, `versions.catalog` is written into every
bookmark and read by nothing; only `versions.time` is ever consulted. The slot
makes the divergence **recorded**, not **detected** — a pre-bump bookmark loads
into a silently different world with no comparison performed and no notice
shown. The row's operational advice (never drop the slot from a URL or save)
stays correct and worth keeping, because the recorded value is a precondition
for any future detection; but the detection itself does not exist until
something actually reads it. See §1.3 for the two fixes and their costs.

**Rule for consumer-wiring changes.** A change that alters *which* query
function a call site invokes, or how it interprets an already-produced result,
with no change to any generator module's algorithm, **bumps `BUILD_VERSION`
(§1.3), never a `WorldVersions` field.** The `*_VERSION` constants in the table
above bump only when the algorithm changes, exactly as today. A bundle whose
every `WorldVersions` field is unchanged can still describe a visibly different
rendered world — that is expected, not a defect in the scheme, and it is
precisely the `surfaceQuery`→`surfaceAt` class.

**Compatibility requirements** (hard constraints on Packages A–D, checked by
the acceptance tests in §6.4):

1. `galaxiesInGroup(seed, [0n,0n,0n], [0n,0n,0n])` must return the exact same
   32 `Galaxy` records, in the same order, as today's `galaxies(seed)`. Keep
   a byte-identical golden fixture test for this specifically.
2. An address string without a cluster/group prefix resolves to
   `clusterCell=groupCell=(0,0,0)`, so every existing bookmark/exported
   descriptor keeps resolving to the same object.
3. `date=<n>` in an old URL — that is the codebase's actual URL key, and this
   contract's `epoch` always meant this parameter — is migrated by
   `resolveTimeFromUrl` (`src/time-nav.ts`, Package D; **not** `main.ts`, as
   this clause originally said) to `t = CATALOGUE_EPOCH_NS + n` **only** when the URL's
   `WorldVersions.time` is absent or `atlas-time-1`; a URL already carrying
   `atlas-time-2` is parsed as an absolute `t` with no offset. This is the
   one-shot migration shim referenced in §1.3.

   **The serialized date record** (`dateRecord`, `src/world-time.ts`) is what a
   bookmark or exported snapshot actually carries, and it was undocumented here
   until 2026-09-16 — which is how its `reference` field sat reading
   `'catalogue'` while its payload was Big-Bang-absolute, with no document to
   contradict. Its shape:

   | Field | Value |
   |---|---|
   | `version` | `TIME_VERSION` (currently `atlas-time-2`) |
   | `reference` | `'big-bang'` — the axis origin. Descriptive only; **nothing branches on it** |
   | `offsetNs` | the **absolute** `t`, ns since the Big Bang, despite the field's name. Pinned by an exact round-trip test; do not redefine it |
   | `branchId` | `'baseline'` |

   ⚠ **Producer obligation, and the trap it closes.** Any URL whose `date`
   carries an absolute `t` MUST also carry `wv`. The app's `persist()` does this
   unconditionally via `writeTimeToUrl`, so no in-app navigation can violate it —
   but a **hand-built URL can**, and the consumer cannot detect the violation:
   an absolute value on a versionless URL is indistinguishable from a genuine
   legacy bookmark whose `date` is catalogue-relative, so the shim adds
   `CATALOGUE_EPOCH_NS` and the restore silently lands ~13.787 Gyr late. This
   actually happened (a test fixture built such a URL) and the failure looked
   exactly like a consumer bug. It is not one: **the fix belongs in the
   producer, never in `resolveTimeFromUrl`'s classification.** Loosening that
   condition to "detect" absolute values would corrupt every real legacy
   bookmark — trading a visible failure for silent data loss.
4. Today's golden terrain/contact fixtures (the 0.059 mm / 0.081 mm
   measurements in `walking-and-time.md`) remain valid without regeneration.
   **Corrected 2026-09-16**: this requirement originally derived that from
   `TERRAIN_VERSION` staying fixed, which it did not (see §6.2). The guarantee
   is therefore no longer inherited from the version constant — it is
   established directly, and must keep being established directly: the
   four-engine golden gate (Node + Chromium + Firefox + WebKit) passes with
   **no digest movement** across the terrain rewrite, the canonical-hydrology
   change and the confluence taper. A version bump is a statement that the
   *algorithm* changed; only the gate can certify that the *output* did not.

### 6.3 What genuinely breaks

`tests/world.test.mjs` and `tests/biosphere-model.test.mjs` golden values
will change (expected — `TIME_VERSION`, `HISTORY_VERSION`, and
`BIOSPHERE_VERSION` all bump). This must show up as **updated, reviewed
fixtures**, not a silently loosened assertion — call this out explicitly in
each package's PR description.

### 6.4 Acceptance tests (every package, same four shapes)

Reuse the existing `tests/<module>.test.mjs` (pure, Node-native-TS) pattern
already established by `world.test.mjs`, `surface.test.mjs`, etc. Every
package adds fixtures proving:

1. **Determinism**: same `(seed, address, t, branchId, versions)` → same
   canonical-JSON digest, across repeated runs, reversed iteration order,
   and different worker counts (mirrors the v1 spec §3 "Verify seed" /
   cross-browser digest pattern already in `tests/browser.mjs`).
2. **Visit-order independence**: generating addresses in shuffled order
   produces the same per-address result as generating them in canonical
   order (existing pattern, e.g. `sector()`'s boundary tests) — now also
   applied to `galaxiesInGroup`/`groupsInCluster` and to lifecycle records.
3. **`t`-seek independence**: `stateAt(record, t)` computed directly equals
   the state reached by starting at some earlier `t₀ < t`, advancing via
   `advanceDate` in arbitrary step sizes, and evaluating at each step —
   i.e., playback and direct seek must agree bit-for-bit on discrete state,
   per §3.4's rule that only the *presentation* layer may transiently
   differ. This is the test that actually exercises the "seek A→B→A
   restores A" property `living-worlds-and-time-roadmap.md` requires.
4. **Cross-engine digest**: the existing Chromium/Firefox comparison
   pattern (v1 spec §3, `tests/browser.mjs`) extended to cover the new
   address hierarchy and lifecycle digests — required release gate, not a
   same-process-only check.

---

## 7. Non-goals and risks

### 7.1 Explicit non-goals for this iteration

- **No intra-galaxy orbital motion.** Systems stay frozen in their galaxy's
  comoving frame (§4.3). The extension point (`Ω(r)` flat rotation curve) is
  documented, not built.
- **No N-body dynamics.** Peculiar motion and mergers are seeded, scheduled,
  and analytic (§4.2), never simulated.
- **No light-travel-delay / relativistic observation mode.** `state(t)` is
  always the object's own simultaneity-frame state, matching
  `living-worlds-and-time-roadmap.md`'s explicit call to keep this a
  separate future mode rather than silently blending it into the timeline.
- **No editable-past / multiverse branching.** `BranchId` is a reserved
  single-valued type (`'baseline'`), threaded everywhere the future
  mechanism will need it, implementing nothing beyond passthrough.
- **No civilization/settlement history layer.** Out of scope for this
  contract; `living-worlds-and-time-roadmap.md`'s milestone 7 remains the
  reference for that, unaffected by anything here.
- **No tidal locking or spin-period evolution.** Spin is constant per
  lifecycle stage (§4.4); a discrete change at stage transitions is a
  documented extension point, not required now.
- **No radiation-era correction to `a(t)`.** The matter+Λ closed form is
  used down to `t = 0`; the first ~50,000 years are already covered by the
  "explanatory placeholder, no walkable matter" rule in §3.1, so the
  formula's early inaccuracy never needs to be physically meaningful.
- **No stellar remnant cooling stages** (white dwarf → black dwarf over
  trillions of years). Remnants stay tagged with their `outcome` type
  indefinitely — a documented simplification, not a bug.
- **No underwater/voxel/cave geology changes.** Unchanged from the existing
  roadmap's non-goals; this contract only adds *when* water exists, not new
  water rendering.

### 7.2 Risks

- **Concurrent `det-math` extraction and river-existence work landing
  mid-stream.** Mitigated by Package B explicitly not forking a second
  deterministic-math copy (§6.1) and Packages A/C explicitly not touching
  `river-*.ts`. The real risk is a `catalog.ts` merge conflict between
  Package B's `galaxies()` → `galaxiesInGroup()` rewrite and the det-math
  extraction touching the same file's `expNeg`/`sine`/`logPos` — land
  Package B's structural change and the det-math extraction as sequential,
  reviewed PRs, not parallel ones, even though both "belong" to different
  agents.
- **BigInt cost at extreme magnitudes in hot paths.** Mitigated by §1.3's
  phase-fraction bucketing (never re-derive a star's absolute-`t` lifecycle
  boundaries per frame) and by §4.4 using `double` years-since-formation for
  spin (bounded range) rather than raw Big-Bang-relative BigInt in a
  per-frame shading computation.
- **`a(t)`'s known edge simplifications** (§4.1) are permanent, not a TODO —
  document them in the module header so nobody "fixes" the early-universe
  behaviour into something that then disagrees with the explanatory
  placeholder policy in §3.1.
- **Version-bump fallout.** `TIME_VERSION`/`HISTORY_VERSION`/
  `BIOSPHERE_VERSION` all bump together; any external bookmark or shared
  screenshot referencing dates or biosphere species by exact ID will not
  reproduce byte-identically post-migration, only via the §6.2 shim for the
  date axis — species IDs have no such shim (they were never stable across
  the profile-string seeding bug being fixed). Call this out to users of the
  existing Biosphere/Creature Lab pages, which depend on today's (buggy)
  seeding.
- **Package D is a late, large-surface integration point.** `main.ts` is
  ~4,000 lines serving flight, VR, rivers, and survey features well outside
  this contract. Land Package D as a stack of small, reviewable diffs against
  the functions named in §6.1's ownership row, not one large rewrite, to
  keep it mergeable against the rest of the file's ongoing churn.
