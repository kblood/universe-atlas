// Scratch diagnostic (NOT a test, not committed to src): pooled 200 m lattice peaks on the 20 smoke massif tiles for
// one carving interpolant, truth vs rock-off, plus the rock term alone (truth - rockOff).
//   node diag.mjs <root> <variant: cr|tri|bq|bc>
import {registerHooks, stripTypeScriptTypes} from 'node:module';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const [root, variant] = process.argv.slice(2);
const imp = p => import(pathToFileURL(root + '/' + p).href);
const CR_W = `  const a0=u*(u*(1-0.5*u)-0.5),a1=u*u*(1.5*u-2.5)+1,a2=u*(u*(2-1.5*u)+0.5),a3=u*u*(0.5*u-0.5);
  const b0=t*(t*(1-0.5*t)-0.5),b1=t*t*(1.5*t-2.5)+1,b2=t*(t*(2-1.5*t)+0.5),b3=t*t*(0.5*t-0.5);`;
// Quadratic B-spline (3 taps nearest the vertex; written as 4 weights with one zero).
const BQ_W = `  const qs=u<0.5?u:u-1,qa=0.5*(0.5-qs)*(0.5-qs),qb=0.75-qs*qs,qc=0.5*(0.5+qs)*(0.5+qs);
  const a0=u<0.5?qa:0,a1=u<0.5?qb:qa,a2=u<0.5?qc:qb,a3=u<0.5?0:qc;
  const rs=t<0.5?t:t-1,ra=0.5*(0.5-rs)*(0.5-rs),rb=0.75-rs*rs,rc=0.5*(0.5+rs)*(0.5+rs);
  const b0=t<0.5?ra:0,b1=t<0.5?rb:ra,b2=t<0.5?rc:rb,b3=t<0.5?0:rc;`;
// Uniform cubic B-spline (4 taps, C2, approximating).
const BC_W = `  const iu=1-u,it=1-t;
  const a0=iu*iu*iu/6,a1=(3*u*u*u-6*u*u+4)/6,a2=(-3*u*u*u+3*u*u+3*u+1)/6,a3=u*u*u/6;
  const b0=it*it*it/6,b1=(3*t*t*t-6*t*t+4)/6,b2=(-3*t*t*t+3*t*t+3*t+1)/6,b3=t*t*t/6;`;
if (variant === 'tri') {
  const {loadSync} = await imp('tests/helpers/mountain-carving-triangle.mjs');
  registerHooks({load: loadSync});
} else if (variant === 'bq' || variant === 'bc') {
  registerHooks({load(url, ctx, next) {
    const r = next(url, ctx);
    if (!/\/src\/mountain-carving\.ts$/.test(url)) return r;
    const s = String(r.source).replace(/\r\n/g, '\n');if (!s.includes(CR_W)) throw new Error('weights needle');
    return {...r, source: s.replace(CR_W, variant === 'bq' ? BQ_W : BC_W)};
  }});
}
const {mountainSampler} = await imp('tests/helpers/mountain-coarse-tiles.mjs');
const S = await imp('tests/helpers/terrain-spectrum.mjs');
const {waterWorlds} = await imp('tests/terrain-climate-fixtures.mjs');
const {orogenLayout} = await imp('src/mountain-layout.ts');
const {rockDetailFromLevel} = await imp('src/lod-ladder.ts');
const {MOUNTAIN_ASSEMBLY} = await imp('src/mountain-assembly.ts');
const {MOUNTAIN_CARVING, carvingBuildStats} = await imp('src/mountain-carving.ts');
const {samples} = await imp('tests/helpers/tier.mjs');
const n = 256, step = 50, L = 2 * MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M / MOUNTAIN_CARVING.ROWS;
const TF = [...S.latticeTargets('lattice-x', L), ...S.latticeTargets('lattice-y', L, {angleRad: Math.PI / 2}),
  ...S.latticeTargets('lattice-d', L * Math.SQRT1_2, {angleRad: Math.PI / 4}), ...S.latticeTargets('lattice-d2', L * Math.SQRT1_2, {angleRad: -Math.PI / 4})];
const fams = ['lattice-x', 'lattice-y', 'lattice-d', 'lattice-d2'];
const pooled = Ws => {const st = S.latticeStats(S.poolWhitened(Ws), n, step, TF);return Object.fromEntries(fams.map(f => [f, +Math.max(...st.peaks.filter(p => p.family === f && p.inRange).map(p => p.peakDb)).toFixed(2)]));};
const MASSIF = new Set(['axis', 'flank', 'belt-end']);
const W = {truth: [], rockOff: [], rockOnly: []}, perTile = [];
const t0 = performance.now();
for (const body of waterWorlds()) {
  const ts = mountainSampler(body), off = mountainSampler(body, rockDetailFromLevel(body.radiusM) - 1), lay = orogenLayout(body), seen = new Set();
  for (const e of samples(body.name, ['axis', 'flank', 'belt-end', 'outside'])) {
    const key = e.d.join();if (seen.has(key)) continue;seen.add(key);
    const o = lay.sample(e.d);if (!(MASSIF.has(e.kind) && o.belt > 0)) continue;
    const axis = [...o.axis], a = S.alignedRaster(ts, e.d, body.radiusM, n, step, axis), b = S.alignedRaster(off, e.d, body.radiusM, n, step, axis);
    const d = a.map((v, i) => v - b[i]);let rr = 0;for (const v of d) rr += v * v;
    const sa = S.structuralSpectrum(a, n, step, TF), sb = S.structuralSpectrum(b, n, step, TF), sd = S.structuralSpectrum(d, n, step, TF);
    W.truth.push(sa.W);W.rockOff.push(sb.W);W.rockOnly.push(sd.W);
    const fx = r => +Math.max(...r.peaks.filter(p => p.family === 'lattice-x' && p.inRange).map(p => p.peakDb)).toFixed(2);
    perTile.push({world: body.name, kind: e.kind, truthX: fx(sa), rockOffX: fx(sb), rockOnlyX: fx(sd), rockRmsM: +Math.sqrt(rr / d.length).toFixed(2)});
  }
}
const out = {variant, tiles: perTile.length, truth: pooled(W.truth), rockOff: pooled(W.rockOff), rockOnly: pooled(W.rockOnly), perTile, builds: carvingBuildStats.count, s: +((performance.now() - t0) / 1000).toFixed(1)};
writeFileSync(`diag-${variant}.json`, JSON.stringify(out, null, 1));
console.log('DIAG ' + JSON.stringify({variant, truth: out.truth, rockOff: out.rockOff, rockOnly: out.rockOnly, s: out.s}));
