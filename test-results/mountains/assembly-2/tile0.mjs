import {pathToFileURL} from 'node:url';
const [MAIN, BR] = process.argv.slice(2);
const load = async root => { const imp = p => import(pathToFileURL(`${root}/${p}`).href);
  const R = await imp('scripts/lod-consistency-report.mjs'); const m = await R.loadCheckout(root); const lay = await imp('src/mountain-layout.ts'); return {R, m, lay}; };
const A = await load(MAIN), B = await load(BR);
const name='Maithea';
const bodyA = A.m.waterWorlds().find(b => b.name === name), tsA = A.m.terrainSampler(bodyA), clsA = A.m.biomeClassifier(bodyA);
const sel = A.R.stratifiedEdgeDirections(tsA, clsA), d = sel.snowline[0];
const bodyB = B.m.waterWorlds().find(b => b.name === name), tsB = B.m.terrainSampler(bodyB), clsB = B.m.biomeClassifier(bodyB);
const lay = B.lay.orogenLayout(bodyB), o = lay.sample(d);
console.log('dir', d, 'lat deg', Math.asin(d[1])*180/Math.PI, 'belt', o.belt, 'axisDist km', o.axisDistanceM/1000, 'halfW km', o.halfWidthM/1000, 'beltIndex', o.beltIndex, lay.belts[o.beltIndex]?.rank, lay.belts[o.beltIndex]?.placement);
for (const L of [6,8]) {
  const P = B.m.directionTile(d, L), n=16, hist=(ts,cls)=>{const h={};let hs=[];for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const q=B.m.tileDirection(P,x/n,y/n),s=ts(q);hs.push(s.groundHeightM);const c=s.groundHeightM>0?cls(q,s.groundHeightM,1):null;const k=c?c.name:'ocean';h[k]=(h[k]||0)+1;}hs.sort((a,b)=>a-b);return {h,p10:hs[Math.floor(.1*hs.length)].toFixed(0),p50:hs[Math.floor(.5*hs.length)].toFixed(0),p90:hs[Math.floor(.9*hs.length)].toFixed(0)};};
  console.log('L',L,'main',JSON.stringify(hist(tsA,clsA)));
  console.log('L',L,'branch',JSON.stringify(hist(tsB,clsB)));
}
const c=clsA(d,tsA(d).groundHeightM,1); console.log('class at centre main', Object.fromEntries(Object.entries(c).filter(([k,v])=>typeof v!=='object')));
const c2=clsB(d,tsB(d).groundHeightM,1); console.log('class at centre branch', Object.fromEntries(Object.entries(c2).filter(([k,v])=>typeof v!=='object')));
