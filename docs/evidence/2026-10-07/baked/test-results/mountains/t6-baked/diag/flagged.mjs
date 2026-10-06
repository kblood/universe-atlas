// Band-grid size per world and the cost of evaluating only the corner nodes of flagged cells.
import {pathToFileURL} from 'node:url';
const root = 'C:/LLM/IWSDK/universe-atlas-wt/baked';
const ML = await import(pathToFileURL(root + '/src/mountain-layout.ts').href);
const {waterWorlds} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
const AX_A = [1, 0, 0], AX_B = [2, 2, 1];
for (const body of waterWorlds()) {
  const lay = ML.orogenLayout(body);
  const t0 = performance.now(); const g = lay.bandGrid(48000, 32000); const t1 = performance.now();
  const N = g.faceCells, M = N + 1, flagged = ML.bandGridFlaggedCells(g);
  const mark = new Uint8Array(6 * M * M);
  for (let face = 0; face < 6; face++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = (face * N + j) * N + i; if (!(g.bits[c >>> 5] & (1 << (c & 31)))) continue;
    const b = face * M * M + j * M + i; mark[b] = mark[b + 1] = mark[b + M] = mark[b + M + 1] = 1;
  }
  let nodes = 0, inBand = 0; const o = {belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0}, dn = [0, 0, 0];
  const t2 = performance.now();
  for (let face = 0; face < 6; face++) {const k = face >>> 1, sg = face & 1 ? -1 : 1;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      if (!mark[face * M * M + j * M + i]) continue; nodes++;
      const sc = 2 * i / N - 1, tc = 2 * j / N - 1, l = Math.sqrt(1 + sc * sc + tc * tc); dn[k] = sg / l; dn[AX_A[k]] = sc / l; dn[AX_B[k]] = tc / l;
      lay.sampleWithinWithA0(dn, 1e9, 48000, o, 32000); if (o.belt !== 0) inBand++;
    }}
  const t3 = performance.now();
  console.log(body.name, 'R km', (body.radiusM / 1000).toFixed(0), 'gridN', N, 'centre cell km', (2 / N * body.radiusM / 1000).toFixed(1), 'grid build ms', (t1 - t0).toFixed(1),
    'flagged cells', flagged, 'corner nodes', nodes, 'in band', inBand, 'node eval ms', (t3 - t2).toFixed(1), 'ns/node', ((t3 - t2) * 1e6 / nodes).toFixed(0));
}
