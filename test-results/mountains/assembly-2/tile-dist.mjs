// min |axis distance| (to any belt) over the frozen-main-selection tiles at L6 (parent) and the retention edge tiles
import {pathToFileURL} from 'node:url';
const ROOT = process.argv[2]; const imp = p => import(pathToFileURL(`${ROOT}/${p}`).href);
const R = await imp('scripts/lod-consistency-report.mjs'), m = await R.loadCheckout(ROOT), lay0 = await imp('src/mountain-layout.ts');
const MAIN = 'C:/LLM/IWSDK/universe-atlas'; const RM = await import(pathToFileURL(`${MAIN}/scripts/lod-consistency-report.mjs`).href), mm = await RM.loadCheckout(MAIN);
for (const name of ['Maithea','Lethuris']) {
  const body = mm.waterWorlds().find(b => b.name === name), ts = mm.terrainSampler(body), cls = mm.biomeClassifier(body);
  const sel = RM.stratifiedEdgeDirections(ts, cls), lay = lay0.orogenLayout(body);
  const edge = name==='Maithea' ? RM.edgeDirections(ts, cls, 32) : [];
  const report = (label, d, L) => { const P = m.directionTile(d, L), n = 64; let best = Infinity, bi=-1, bw=0;
    // distance to each belt's axis via sampling the belt value function on a widened belt: use sample() with belt>0 and track min over tile of |axisDistanceM|-halfWidth
    for (let y=0;y<=n;y++) for (let x=0;x<=n;x++){ const q=m.tileDirection(P,x/n,y/n), o=lay.sample(q); if (o.belt>0 && Math.abs(o.axisDistanceM)<best){best=Math.abs(o.axisDistanceM);bi=o.beltIndex;bw=o.halfWidthM;} }
    if (best<Infinity) console.log(name, label, 'L'+L, 'min|axisDist| km', (best/1000).toFixed(1), 'belt', bi, 'halfW km', (bw/1000).toFixed(1)); };
  for (const [kind, dirs] of Object.entries(sel)) dirs.forEach((d,i)=>{ for (const L of [7,9,11]) report(kind+i, d, L); });
  edge.forEach((d,i)=>{ for (const L of [6,7,8,9]) report("edge"+i, d, L); });
  console.log(name, 'belts', lay.belts.map((b,i)=>`${i}:${b.rank}/${b.placement}/${(b.halfWidthM/1000).toFixed(1)}km`).join(' '));
}
