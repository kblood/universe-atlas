import type {Body,V3} from './catalog.ts';
import type {RiverRegion} from './river-types.ts';
import {buildDrainage, RIVER_CANDIDATE_COUNT, type Catchment} from './drainage.ts';
import {buildRiverRegion} from './river-generation.ts';
import {biomeClassifier} from './surface-biomes.ts';

/**
 * Additive field, merged onto catalog.ts's Body interface via declaration
 * merging so catalog.ts — owned/edited by other agents concurrently — never
 * needs to change. canonicalRivers is the authoritative, order-independent
 * river EXISTENCE set for a body address: the feasible subset of the
 * RIVER_CANDIDATE_COUNT top catchments (drainage.ts), built once by
 * ensureCanonicalHydrology and never mutated by any UI action. It is a pure
 * function of (seed, body address) — contrast with body.hydrology, which
 * remains a *separate*, purely cosmetic "which single region currently gets
 * the rich water-mesh/vegetation/heightmap-texture render" selector (a
 * budget-constrained rendering LOD choice, picked by navigation) and must
 * never be read for terrain height/collider/existence purposes — see
 * terrain.ts's terrainSampler, which defaults to canonicalRivers.
 */
declare module './catalog.ts' {
  interface Body { canonicalRivers?: RiverRegion[]; }
}

/**
 * Pure, synchronous: the drainage graph's top RIVER_CANDIDATE_COUNT
 * catchments, and the feasible subset's built regions (buildRiverRegion
 * throws for a geometrically infeasible catchment — it simply has no
 * buildable river, deterministically, every time). This is the ONE
 * implementation of "what canonical hydrology for a body address is" —
 * river-worker.ts calls it off the main thread for the live app, and tests
 * call it directly (no browser Worker exists under plain Node) — so there is
 * nothing to keep in sync between a worker-side and a test-side copy.
 */
export function buildCanonicalHydrology(body: Body): {catchments: Catchment[]; regions: RiverRegion[]} {
  const clean = {...body, hydrology: undefined, canonicalRivers: undefined};
  const catchments = buildDrainage(clean).catchments.slice(0, RIVER_CANDIDATE_COUNT);
  const regions: RiverRegion[] = [];
  for (const c of catchments) { try { regions.push(buildRiverRegion(clean, c)); } catch { /* infeasible catchment: no buildable river there */ } }
  return {catchments, regions};
}

// A location-only habitat read used purely to bias auto-navigation toward a
// bank worth visiting — never a real Body (rankAutoDestinations only ever
// receives a Catchment's mouth site, not the body), so only the fields
// surface-biomes.ts's classifier actually reads (water, type) are given
// stable stand-in values. This must stay a function of the mouth's own
// direction/elevation alone so the whole ranking remains a pure function of
// (canonical set, date/sun), per its contract below.
const HABITAT_STUB: Body = {id: '', name: '', kind: 'planet', type: 'Terrestrial world', parentId: '', massKg: 0, radiusM: 1, temperatureK: 288, color: '#000000', orbit: null, seed: 'rank-auto-destination-habitat', water: 1, rings: false};
const habitatClassify = biomeClassifier(HABITAT_STUB);

/**
 * Pure destination ranking among canonical catchments that actually have a
 * built RiverRegion (an infeasible canonical catchment can't be flown to).
 * Never changes WHICH catchments are canonical or which of those are
 * feasible — only ranks, among the feasible ones, which to fly to right now.
 * Primary key: avoid a mouth whose bank reads as snow/ice (the same
 * weights[3]>.3 threshold river-environment.ts gates bank dressing on) —
 * auto-navigation should not fly a temperate world's tour to a bank where no
 * dressing can ever qualify. Secondary key: the existing genuinely
 * date-dependent sunlit-mouth preference. Ties break on catchment id (the
 * stable canonical address) for a strict, input-order-independent total
 * order. A pure function of (canonical set, date/sun) only — it never reads
 * a live Body, so it can never change river existence or feasibility.
 */
export function rankAutoDestinations(catchments: readonly Catchment[], preferredSun?: V3): Catchment[] {
  const poor = (c: Catchment) => {
    if (!Number.isFinite(c.mouth.elevationM)) return 0;
    const snow = habitatClassify(c.mouth.direction, c.mouth.elevationM, 1).weights[3];
    return snow > .3 ? 1 : 0;
  };
  const score = (c: Catchment) => c.mouth.direction.reduce((sum, v, i) => sum + v * (preferredSun?.[i] || 0), 0) - (Math.abs(c.mouth.direction[1]) > .8 ? .75 : 0);
  return [...catchments].sort((a, b) => poor(a) - poor(b) || score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export type HydrologyStatus = 'idle' | 'building' | 'ready' | 'error';
interface Entry {
  status: HydrologyStatus;
  catchments: Catchment[];
  regions: RiverRegion[];
  error?: string;
  buildMs: number;
  promise: Promise<void>;
  worker: Worker | null;
  abort?: () => void;
}
const registry = new Map<string, Entry>();

function eligible(body: Pick<Body, 'kind' | 'water' | 'type'>) {
  return body.kind === 'planet' && body.water > 0 && body.type !== 'Gas giant';
}

export function hydrologyStatus(bodyId: string): HydrologyStatus { return registry.get(bodyId)?.status || 'idle'; }
/**
 * True once building has finished (ready OR error) — safe to gate
 * close-range surface detail on this without ever hanging: a genuine build
 * failure still counts as "ready" (nothing more will change). A body with
 * no water is trivially ready (there is nothing to build).
 */
export function hydrologyReady(body: Pick<Body, 'id' | 'kind' | 'water' | 'type'>): boolean {
  if (!eligible(body)) return true;
  const status = registry.get(body.id)?.status;
  return status === 'ready' || status === 'error';
}
export function canonicalRegionsFor(bodyId: string): RiverRegion[] { return registry.get(bodyId)?.regions || []; }
export function canonicalCatchmentsFor(bodyId: string): Catchment[] { return registry.get(bodyId)?.catchments || []; }
export function canonicalRegionForCatchment(bodyId: string, catchmentId: string): RiverRegion | null {
  return registry.get(bodyId)?.regions.find(r => r.parentCatchmentId === catchmentId) || null;
}

/** Shared by the real worker-result handler and the test-only sync path
 * below, so both settle an Entry (and attach body.canonicalRivers) with
 * bit-for-bit identical logic — including the id sort that makes the final
 * set independent of the order buildCanonicalHydrology happened to produce
 * its regions array in. */
function settle(body: Body, entry: Entry, catchments: Catchment[], regions: RiverRegion[], buildMs: number) {
  entry.catchments = catchments;
  entry.regions = [...regions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  entry.buildMs = buildMs; entry.status = 'ready';
  body.canonicalRivers = entry.regions;
}

/**
 * Idempotent: safe to call every time a body becomes the focus/approach
 * target. The first call for a body address kicks off a single worker round
 * trip (river-worker.ts) that builds the drainage graph and attempts every
 * RIVER_CANDIDATE_COUNT canonical catchment, in one shot, off the main
 * thread; later calls (including for a *different* live Body object with
 * the same address — the catalogue regenerates fresh objects per system
 * visit) just attach the same settled/settling result. On completion the
 * resident regions are id-sorted (a stable, build-order-independent total
 * order) and written onto body.canonicalRivers in place — the same
 * resident catalogue object every consumer already shares (terrain sampler,
 * GroundWalker, and the tile/survey workers via structured clone of that
 * object), so no other call site needs to change to pick it up.
 */
export function ensureCanonicalHydrology(body: Body): Promise<void> {
  if (!eligible(body)) return Promise.resolve();
  const existing = registry.get(body.id);
  if (existing) {
    if (existing.status === 'ready') body.canonicalRivers = existing.regions;
    else existing.promise.then(() => { if (existing.status === 'ready') body.canonicalRivers = existing.regions; });
    return existing.promise;
  }
  const entry: Entry = {status: 'building', catchments: [], regions: [], buildMs: 0, promise: null as unknown as Promise<void>, worker: null};
  registry.set(body.id, entry);
  entry.promise = new Promise<void>(resolve => {
    let settled = false;
    const finish = () => { if (settled) return; settled = true; entry.worker?.terminate(); entry.worker = null; resolve(); };
    try {
      const worker = new Worker(new URL('./river-worker.ts', import.meta.url), {type: 'module'});
      entry.worker = worker;
      const timer = setTimeout(() => { entry.status = 'error'; entry.error = 'Canonical hydrology build timed out.'; finish(); }, 60000);
      entry.abort = () => { clearTimeout(timer); entry.status = 'error'; entry.error = 'Universe seed changed.'; finish(); };
      worker.onmessage = ({data}) => {
        if (settled) return;
        clearTimeout(timer);
        if (data.error) { entry.status = 'error'; entry.error = String(data.error); finish(); return; }
        settle(body, entry, data.canonical.catchments, data.canonical.regions, data.buildMs);
        finish();
      };
      worker.onerror = event => { if(settled)return; clearTimeout(timer); event.preventDefault(); entry.status = 'error'; entry.error = event.message || 'Canonical hydrology worker failed.'; finish(); };
      worker.postMessage({body: {...body, hydrology: undefined, canonicalRivers: undefined}});
    } catch (error) { entry.status = 'error'; entry.error = String(error); finish(); }
  });
  return entry.promise;
}

/**
 * Test-only: exercises exactly the same registry state machine as the real
 * worker-driven path above (settle(), including the id-sort and
 * body.canonicalRivers attachment) without spinning up a real Worker — plain
 * Node has no browser Worker global to run river-worker.ts's self.onmessage
 * protocol in. buildCanonicalHydrology (the pure computation) is the one
 * implementation shared with the real worker; only the async transport is
 * substituted for a synchronous call, so a test built on this exercises the
 * app-level registry flow (id order-independence, canonical existence
 * pinned once ready, hydrologyReady/canonicalRegionsFor/
 * canonicalCatchmentsFor all reading the same settled entry), not just
 * terrainSampler's regions parameter in isolation.
 */
export function primeCanonicalHydrologySync(body: Body): void {
  if (!eligible(body)) return;
  let entry = registry.get(body.id);
  if (!entry) { entry = {status: 'building', catchments: [], regions: [], buildMs: 0, promise: Promise.resolve(), worker: null}; registry.set(body.id, entry); }
  const {catchments, regions} = buildCanonicalHydrology(body);
  settle(body, entry, catchments, regions, 0);
}

/** Test-only: drop all cached entries (and terminate any in-flight worker) so a fresh scenario starts clean. */
export function resetHydrologyRegistry() { for (const e of registry.values()) e.abort?.(); registry.clear(); }
