// T6 massif tile set (Q6 item 2, addendum item 2): selection by the M1-only rule (tests/helpers/mountain-tile-set.mjs),
// per-tile axis-distance evidence at every evaluated level, and INFO (report-only, A3 OPEN) cross-level, colour, class
// and retention cells on the wired tree. Level-faithful: each tile's lattice, classes and colour come from ITS level's
// sampler (as tests/lod-consistency.test.mjs's buildTile does for heights since lod-ladder-2); retention compares the
// level-L tile with a dense 97 x 97 TRUTH reference inside it (scripts/lod-consistency-report.mjs retentionTile rule).
// One worker per world.   node tests/helpers/test-slot.mjs -- node test-results/mountains/t6-wiring/massif-tile-set.mjs <out.json>
import {isMainThread, parentPort, workerData, Worker} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';

if (isMainThread) {
  const {TILE_SET_WORLDS} = await import('../../../tests/helpers/mountain-tile-set.mjs');
  const all = await Promise.all(TILE_SET_WORLDS.map(name => new Promise((res, rej) => {
    const w = new Worker(new URL(import.meta.url), {workerData: name});w.once('message', res);w.once('error', rej);})));
  writeFileSync(process.argv[2], JSON.stringify(all, null, 1) + '\n');
  for (const r of all) {
    console.log(`${r.world}: ${r.set.length} directions (${r.set.map(s => s.kind).join(',')}), replaced ${r.replaced.length}; every tile has a massif sample: ${r.evidenceOk}; ${r.seconds.toFixed(0)} s`);
    for (const c of r.cells) console.log(`  L${c.L}->L${c.L + 1}: dh p99 ${c.p99.toFixed(1)} / max ${c.max.toFixed(1)} m (plan ${c.planHeightP99M.toFixed(0)} / ${c.planHeightMaxM.toFixed(0)}), rgbP99 ${c.rgbP99.toFixed(4)} (plan ${c.planRgbP99}), snow ${c.snow.toFixed(2)}% forest ${c.forest.toFixed(2)}% name ${c.name.toFixed(2)}% carried ${c.carriedName.toFixed(2)}% ocean ${c.ocean.toFixed(2)}% sharedOcean ${c.sharedOceanMismatch}`);
    for (const t of r.retention) console.log(`  retention L${t.L}: peakKept ${t.peakKept.toFixed(2)}% summit p50 ${t.summitP50.toFixed(0)} max ${t.summitMax.toFixed(0)} m snowKept ${t.snowKept.toFixed(1)}% forestKept ${t.forestKept.toFixed(1)}% (${t.tiles} tiles)`);
  }
} else {
  const t0 = performance.now();
  const T = await import('../../../src/planet-tiles.ts');
  const {tileEdgeM, LOD_TOLERANCES} = await import('../../../src/lod-ladder.ts');
  const {biomeClassifier} = await import('../../../src/surface-biomes.ts');
  const {waterWorlds} = await import('../../../tests/terrain-climate-fixtures.mjs');
  const {mountainSampler} = await import('../../../tests/helpers/mountain-coarse-tiles.mjs');
  const {massifTileSet, tileEvidence, tileSetLevels} = await import('../../../tests/helpers/mountain-tile-set.mjs');
  const R = await import('../../../scripts/lod-consistency-report.mjs');
  const body = waterWorlds().find(b => b.name === workerData), cls = biomeClassifier(body), truth = mountainSampler(body);
  const sel = massifTileSet(body), levels = tileSetLevels(body);
  const evidence = sel.set.map(s => ({kind: s.kind, d: s.d, axisDistanceM: s.axisDistanceM, beltIndex: s.beltIndex, alongM: s.alongM, tiles: levels.map(L => tileEvidence(body, s.d, L))}));
  // Level-faithful crossPair: m.buildTile builds with the tile's own level (planet-tiles passes tile.level); the
  // per-level sampler replaces crossPair's single `ts` by wrapping tileDirection lookups per tile.
  const cache = new Map(), build = t => {const k = T.tileKey(t);let b = cache.get(k);if (!b) {b = T.buildTile(body, t);cache.set(k, b);}return b;};
  const cells = [];
  for (const L of levels) {
    const acc = R.newCrossAcc(true), tsP = mountainSampler(body, L), tsC = mountainSampler(body, L + 1);
    for (const s of sel.set) {
      // crossPair samples classes/colour with ONE ts for both tiles; levelSampler routes each call to its tile's level.
      const P = T.directionTile(s.d, L), C = T.directionTile(s.d, L + 1);
      R.crossPair({...T, buildTile: (b, t) => build(t)}, body, levelSampler(T, P, C, tsP, tsC), cls, s.d, L, acc);
    }
    const sum = R.summariseCross(acc), edge = tileEdgeM(body.radiusM, L);
    cells.push({L, ...sum, planHeightP99M: LOD_TOLERANCES.heightP99M(edge), planHeightMaxM: LOD_TOLERANCES.heightMaxM(edge), planRgbP99: LOD_TOLERANCES.colourP99(L), planClassPct: 100 * LOD_TOLERANCES.classDisagreement});
  }
  const retention = [];
  for (const L of [6, 8]) {
    const acc = R.newRetentionAcc();
    for (const s of sel.set) R.retentionTile({...T, buildTile: (b, t) => build(t)}, body, truthForRetention(T, L, mountainSampler(body, L), truth), cls, s.d, L, acc);
    retention.push({L, ...R.summariseRetention(acc), keeps: LOD_TOLERANCES.coarseKeeps});
  }
  parentPort.postMessage({world: body.name, levels, set: evidence, replaced: sel.replaced, evidenceOk: evidence.every(e => e.tiles.every(t => t.massifSamples > 0)),
    cells, retention, seconds: (performance.now() - t0) / 1000});
}

// crossPair (scripts/lod-consistency-report.mjs) calls ts in a fixed order: lattice(P), lattice(C), then
// colourGrid(P, tp), colourGrid(C, tc). Route by call index: parent calls to the level-L sampler, child calls to L+1.
// A shared boundary direction is thus sampled at the level of the tile being evaluated, as the renderer does.
function levelSampler(T, P, C, tsP, tsC) {
  const n = T.PATCH_SEGMENTS, lat = (n + 1) * (n + 1), L = P.level, tp = L >= 14 ? 64 : 128, tc = L + 1 >= 20 ? 32 : L + 1 >= 14 ? 64 : 128;
  const bounds = [lat, 2 * lat, 2 * lat + (tp + 1) ** 2, 2 * lat + (tp + 1) ** 2 + (tc + 1) ** 2];let calls = 0;
  return d => {const i = calls++;const child = (i >= bounds[0] && i < bounds[1]) || (i >= bounds[2] && i < bounds[3]);
    if (i >= bounds[3]) throw new Error('levelSampler: unexpected extra call (crossPair call order changed)');return (child ? tsC : tsP)(d);};
}
// retentionTile: lattice classes at the tile's own level ((n+1)^2 calls), then the dense 97 x 97 reference (truth).
function truthForRetention(T, L, tsL, truth) {
  const lat = (T.PATCH_SEGMENTS + 1) ** 2;let calls = 0;
  return d => (calls++ < lat ? tsL : truth)(d);
}
