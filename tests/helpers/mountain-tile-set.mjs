// Massif tile set (T6; docs/mountains-opus-decisions-2026-10-05.md Q6 item 2 and addendum item 2). The frozen LOD
// selection (lod-frozen-selection.mjs) touches no 48 km massif, so these tiles complement it with REAL mountain
// terrain: 12 directions per world on Maithea and Lethuris (and, reported too, Selawyn and Raiva), picked by a rule
// that reads ONLY M1 (the orogen layout and the continental coordinate a0), never heights:
//   - 8 AXIS stations: axisSites(body, {count: 8}) (|axis distance| <= 3 km on a massif-width belt, belt >= .5,
//     a0 > 0, >= 300 km apart, Fibonacci order);
//   - 2 FLANK points: the first stations (in order) moved FLANK_FRACTION x MAX_HALF_WIDTH_M across their axis, the
//     side alternating, kept only if the moved point is still on the same massif with a0 > 0 (else the next station);
//   - 2 BELT-END points: from station 0, march along its belt axis both ways (END_STEP_M steps, re-centred on the
//     axis) to the last point still on that massif with a0 > 0 (the belt's end on land), at least END_MIN_SEP_M from
//     the other directions.
// Every tile of the set, at every level it is evaluated at, must contain at least one sample (65 x 65 net) with
// |axisDistanceM| < MAX_HALF_WIDTH_M on a massif-width belt; a direction failing that is REPLACED by the rule (the
// next candidate of its kind), never kept. The INFO cells measured on it are report-only (A3 OPEN for Kasper).
import * as tiles from '../../src/planet-tiles.ts';
import {orogenLayout, continentalA0} from '../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE} from '../../src/mountain-envelope.ts';
import {carvingFromLevel} from '../../src/lod-ladder.ts';
import {fib} from '../terrain-climate-fixtures.mjs';
import {axisSites} from './mountain-coarse-tiles.mjs';

export const TILE_SET_WORLDS = ['Maithea', 'Lethuris', 'Selawyn', 'Raiva'];
export const FLANK_FRACTION = .6, END_MIN_SEP_M = 100_000, END_STEP_M = 25_000, END_MAX_STEPS = 400;
/** Levels each direction's tile is checked at (and the INFO cells are measured from): the carving switch pair and
 * the lod-consistency levels. */
export const tileSetLevels = body => [...new Set([carvingFromLevel(body.radiusM) - 1, carvingFromLevel(body.radiusM), 6, 8, 10, 12, 14])].sort((a, b) => a - b);

const unit = p => {const l = Math.hypot(...p);return p.map(v => v / l);};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const onMassif = o => o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M;

/** M1 evidence for the tile containing d at level L: the centre's axis distance and the massif samples of a 65 x 65 net. */
export function tileEvidence(body, d, L) {
  const lay = orogenLayout(body), t = tiles.directionTile(d, L), c = lay.sample(tiles.tileDirection(t, .5, .5));
  let massif = 0, minAbsAxisM = Infinity;
  for (let y = 0; y <= 64; y++) for (let x = 0; x <= 64; x++) {
    const o = lay.sample(tiles.tileDirection(t, x / 64, y / 64));
    if (onMassif(o)) {massif++;minAbsAxisM = Math.min(minAbsAxisM, Math.abs(o.axisDistanceM));}
  }
  return {level: L, tile: tiles.tileKey(t), centreBelt: c.belt, centreAxisDistanceM: c.belt ? c.axisDistanceM : null, massifSamples: massif, minAbsAxisDistanceM: massif ? minAbsAxisM : null};
}
const passes = (body, d) => tileSetLevels(body).every(L => tileEvidence(body, d, L).massifSamples > 0);

/** The rule. Returns [{kind, d, beltIndex, axisDistanceM, alongM}] (12 entries), replacements recorded. */
export function massifTileSet(body) {
  const lay = orogenLayout(body), a0 = continentalA0(body), R = body.radiusM, out = [], replaced = [];
  const take = (kind, cands, k) => {let got = 0;
    for (const c of cands) {if (got >= k) break;if (passes(body, c.d)) {out.push({kind, ...c});got++;} else replaced.push({kind, d: c.d});}
    if (got < k) throw new Error(`${body.name}: only ${got} of ${k} ${kind} tiles`);};
  const stations = axisSites(body, {count: 16}).map(s => ({d: s.d, beltIndex: s.beltIndex, axisDistanceM: s.axisDistanceM, alongM: lay.sample(s.d).alongM}));
  take('axis', stations, 8);
  const flank = [];
  for (const [i, s] of stations.entries()) {
    const o = lay.sample(s.d), across = unit(cross(s.d, o.axis)), off = (i % 2 ? -1 : 1) * FLANK_FRACTION * MASSIF_ENVELOPE.MAX_HALF_WIDTH_M / R;
    const q = unit(s.d.map((v, j) => v + off * across[j])), oq = lay.sample(q);
    if (oq.beltIndex === s.beltIndex && onMassif(oq) && a0(q) > 0) flank.push({d: q, beltIndex: oq.beltIndex, axisDistanceM: oq.axisDistanceM, alongM: oq.alongM});
  }
  take('flank', flank, 2);
  // Belt ends: march along station 0's axis in END_STEP_M steps both ways, re-centred on the axis after every step,
  // while the point stays on the same massif-width belt with belt >= .5 and a0 > 0. The march path (outermost first)
  // gives the candidates of each end; a failing end is replaced by the next point inwards.
  // A march that reaches END_MAX_STEPS found no end and gives no candidate; when a station yields no candidate at that
  // end (too close to the end, or an endless belt), the next station in order is marched instead.
  const sep = c => out.every(s => Math.acos(Math.min(1, s.d[0] * c.d[0] + s.d[1] * c.d[1] + s.d[2] * c.d[2])) * R >= END_MIN_SEP_M);
  const march = (st, sign) => {
    const valid = (o, q) => o.beltIndex === st.beltIndex && o.belt >= .5 && onMassif(o) && a0(q) > 0;
    let p = st.d, heading = lay.sample(p).axis.map(v => v * sign);const path = [];
    for (let k = 0; k < END_MAX_STEPS; k++) {
      let q = unit(p.map((v, j) => v + heading[j] * END_STEP_M / R)), o = lay.sample(q);
      if (o.belt === 0) return path;
      const across = unit(cross(q, o.axis));q = unit(q.map((v, j) => v - across[j] * o.axisDistanceM / R));o = lay.sample(q);
      if (!valid(o, q)) return path;
      heading = o.axis[0] * heading[0] + o.axis[1] * heading[1] + o.axis[2] * heading[2] >= 0 ? [...o.axis] : o.axis.map(v => -v);
      p = q;path.push({d: q, beltIndex: o.beltIndex, axisDistanceM: o.axisDistanceM, alongM: o.alongM, station: stations.indexOf(st), stepsFromStation: k + 1});
    }
    return [];
  };
  for (const sign of [1, -1]) {
    const cands = [];
    for (const st of stations) {cands.push(...march(st, sign).reverse().filter(sep).slice(0, 8));if (cands.length) break;}
    take('belt-end', cands, 1);
  }
  return {world: body.name, set: out, replaced};
}

// FROZEN (picked once by massifTileSet on the T6 wired tree, terrain-1.9.0-mountains / orogen layout of main 9dcb1cf):
// tests/mountain-tile-set.test.mjs asserts the rule still returns exactly these directions (M1 only, so the set
// moves only if M1 moves) and that every tile has its massif sample. Regenerate only with a recorded M1 change.
export const FROZEN_MASSIF_TILE_SET_SOURCE = Object.freeze({branch: 'mountains/t6-wiring', base: '9dcb1cf', terrainVersion: 'terrain-1.9.0-mountains'});
export const FROZEN_MASSIF_TILE_SET = {
  Maithea: [
    {kind: 'axis', d: [0.5095476692588011, 0.85675, -0.07962794894334123]},
    {kind: 'axis', d: [0.04249625528938326, 0.81675, -0.5754246308478458]},
    {kind: 'axis', d: [0.5605266388004269, 0.80335, -0.20109367144466744]},
    {kind: 'axis', d: [0.184019854206868, 0.75705, -0.6269066842502822]},
    {kind: 'axis', d: [0.5913591362806724, 0.7444500000000001, -0.3099815630604135]},
    {kind: 'axis', d: [0.5615556289785802, 0.69335, 0.45157618743958483]},
    {kind: 'axis', d: [-0.5476870660712452, 0.68935, 0.4741681718106683]},
    {kind: 'axis', d: [-0.03847219858507095, 0.64095, 0.7666178888051275]},
    {kind: 'flank', d: [0.5053302572987797, 0.8589777195269438, -0.0824536743549977]},
    {kind: 'flank', d: [0.03708539492657547, 0.8176095853600494, -0.5745774442235861]},
    {kind: 'belt-end', d: [0.6049422447887903, 0.7011110510959336, -0.37747605818257435]},
    {kind: 'belt-end', d: [0.47952879820688965, 0.877355312023787, -0.017314391525537653]},
  ],
  Selawyn: [
    {kind: 'axis', d: [0.7002753949296782, 0.47924999999999995, -0.5290877136695609]},
    {kind: 'axis', d: [0.8260581139331783, 0.27085000000000004, -0.4942350350846855]},
    {kind: 'axis', d: [0.2175199477949274, 0.06735000000000002, 0.9737294541151008]},
    {kind: 'axis', d: [0.4422397936958107, 0.04964999999999997, -0.8955215476870932]},
    {kind: 'axis', d: [0.5591508292718664, -0.1875500000000001, -0.8075737412921398]},
    {kind: 'axis', d: [0.28704999397268677, -0.37745000000000006, 0.8804168322222607]},
    {kind: 'axis', d: [0.5143427665831156, -0.39654999999999996, 0.7603943818595891]},
    {kind: 'axis', d: [0.11128030517673787, -0.4837499999999999, 0.8681028920466584]},
    {kind: 'flank', d: [0.6979701517155658, 0.481484712671741, -0.5301038943240854]},
    {kind: 'flank', d: [0.8279167080444798, 0.26897426528034074, -0.49214506922013623]},
    {kind: 'belt-end', d: [0.8096010590898883, 0.16396454448196415, -0.5636148980228903]},
    {kind: 'belt-end', d: [0.7114391073662504, 0.5116537931016841, -0.4817310375246458]},
  ],
  Raiva: [
    {kind: 'axis', d: [-0.8512019854246333, 0.49795, 0.16583418679259807]},
    {kind: 'axis', d: [-0.8907638864414498, 0.37255000000000005, 0.2602809945265383]},
    {kind: 'axis', d: [-0.901229324993943, 0.24714999999999998, 0.3559530604882642]},
    {kind: 'axis', d: [-0.8858198057748266, 0.12175000000000002, 0.44777249714229717]},
    {kind: 'axis', d: [-0.8228055789721294, -0.03584999999999994, 0.567191111277618]},
    {kind: 'axis', d: [-0.5151100702263094, -0.3427500000000001, -0.7856106243244465]},
    {kind: 'axis', d: [0.6645339989515039, -0.37454999999999994, 0.6466118323519318]},
    {kind: 'axis', d: [-0.5237602431473022, -0.5990500000000001, -0.6056519670555681]},
    {kind: 'flank', d: [-0.8568986905555777, 0.4919174544941317, 0.15408391248975492]},
    {kind: 'flank', d: [-0.8845161003234583, 0.37962897360445996, 0.27113301287118496]},
    {kind: 'belt-end', d: [-0.8065818372804591, 0.5816060693036251, 0.10564146874436223]},
    {kind: 'belt-end', d: [-0.7702814747318573, -0.1180445775142857, 0.6266832751912156]},
  ],
  Lethuris: [
    {kind: 'axis', d: [-0.4812694074877431, 0.8665499999999999, -0.13217736158812066]},
    {kind: 'axis', d: [0.5277832272834928, 0.84155, 0.11505851771260092]},
    {kind: 'axis', d: [-0.5590607134539384, 0.75715, 0.3378979079135791]},
    {kind: 'axis', d: [-0.3425184309679688, 0.73675, 0.5829927632031471]},
    {kind: 'axis', d: [0.6548027956098611, 0.022150000000000003, -0.7554751328544909]},
    {kind: 'axis', d: [-0.31549475552304773, -0.05085000000000006, -0.9475638958600376]},
    {kind: 'axis', d: [-0.6358658765539793, -0.6856500000000001, 0.3543425807523552]},
    {kind: 'axis', d: [-0.2221096245957403, -0.7827500000000001, 0.5813516596363506]},
    {kind: 'flank', d: [-0.483957362424004, 0.8649483282182956, -0.13285202620952605]},
    {kind: 'flank', d: [0.526087284200648, 0.8422488899777698, 0.11768167543675269]},
    {kind: 'belt-end', d: [0.6351770061959668, 0.7523093114309994, 0.17487387093029144]},
    {kind: 'belt-end', d: [-0.5456759453786767, 0.5088753281835414, 0.6657955114005958]},
  ],
};
