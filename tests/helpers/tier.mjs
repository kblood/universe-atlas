// Test tiers (docs/handoff-2026-10-06/tiered-testing-mvp.md section 1; usage: docs/test-tiers-2026-10-07.md).
// ATLAS_TEST_TIER=smoke|work|default|gate picks the sample COUNT and SET of a tier-aware test, never a pin, a threshold
// or a test title. Unset = 'default' = exactly today's `npm test` numbers. ATLAS_TEST_FULL=1 (set by `npm run
// test:full`) implies 'gate'. A subset tier can FAIL a maximum or pin early (a violation is real) but never certifies
// it: such results carry coverage 'subset' in the tier log.
import {readFileSync} from 'node:fs';

export const ORDER = Object.freeze(['smoke', 'work', 'default', 'gate']);
/** Parse the tier from an env object (exported for tests/tier.test.mjs). */
export function parseTier(env = process.env) {
  const raw = env.ATLAS_TEST_FULL === '1' ? 'gate' : env.ATLAS_TEST_TIER || 'default';
  if (!ORDER.includes(raw)) throw new Error(`ATLAS_TEST_TIER=${raw}: expected ${ORDER.join('|')}`);
  return raw;
}
export const TIER = parseTier();
export const atLeastFor = (tier, t) => ORDER.indexOf(tier) >= ORDER.indexOf(t);
export const atLeast = t => atLeastFor(TIER, t);
/** Per-tier value for `tier`: the value of that tier, else of the next DEEPER tier given (never a shallower one); 'gate'
 * falls back to 'default' (today's literals are the gate's full nets unless a file says otherwise). */
export function pickFor(tier, v) {
  for (const t of ORDER.slice(ORDER.indexOf(tier))) if (t in v) return v[t];
  if (tier === 'gate' && 'default' in v) return v.default;
  throw new Error(`pick: no value for tier ${tier} or deeper in {${Object.keys(v).join(', ')}}`);
}
export const pick = v => pickFor(TIER, v);
/** node:test option: skip below tier t, with the reason. */
export const onlyFrom = (t, why) => atLeast(t) ? {} : {skip: `tier ${t}+ only (now ${TIER}): ${why}`};
export const gateOnly = why => onlyFrom('gate', why);
/** Subset results of a maximum/pin: a violation is real, a pass is "not yet failed". */
export const coverage = () => atLeast('default') ? 'full' : 'subset';
/** True at the subset tiers (smoke, work). */
export const subset = () => !atLeast('default');

let sets;
const loadSets = () => sets ??= JSON.parse(readFileSync(new URL('../tier-sets.json', import.meta.url), 'utf8'));
export const tierSets = () => {const s = loadSets();return {version: s.version, sha256: s.sha256};};
/** Bodies a tier-aware test loops over: all four at smoke (breadth) and default/gate; Maithea + Lethuris at work. */
export const tierBodies = all => pick({smoke: all, work: all.filter(b => ['Maithea', 'Lethuris'].includes(b.name ?? b)), default: all});
/** Frozen sample entries ({kind, d, level?, tile?, ...}) of this tier for one world; only meaningful at smoke/work
 * (default/gate tests keep their own full nets). `kinds` filters by kind. The work set is the smoke set until the
 * owner-approved working set is frozen (docs/test-tiers-2026-10-07.md, "what is left"). */
export function samples(world, kinds) {
  const s = loadSets(), table = TIER === 'work' && s.work ? s.work : s.smoke, rows = table[world];
  if (!rows) throw new Error(`tier-sets.json: no ${TIER === 'work' && s.work ? 'work' : 'smoke'} set for ${world}`);
  return rows.filter(r => !kinds || kinds.includes(r.kind));
}
/** One diagnostic line tagging a test's coverage, for t.diagnostic(). */
export const tierNote = what => `TIER ${TIER} coverage ${coverage()}${what ? `: ${what}` : ''}`;
