// Mountains cost plan T2 (INFO; docs/mountain-layout-v1.md "In-massif foot-point solve"): the orogen-layout-2
// foot-point solve against an orogen-layout-1 checkout, per Gauss-Newton step count, and its in-massif cost.
//   node scripts/mountain-layout-foot.mjs <oldRoot> [steps=2,3,4,5] [nFib=20000]
// oldRoot: a checkout whose src/mountain-layout.ts is orogen-layout-1 (e.g. a worktree at 66453b2), read-only.
// Part 1, per world and step count: belts identical; 20000 Fibonacci directions plus 8 in-belt 129 x 129 rasters
//   spanning 2W (sites: first belt >= .5 axis points 300 km apart), coast gate from continentalA0; belt / beltIndex
//   mismatches and max |d axisDistanceM|, |d alongM|, |d axis|, |d belt| over samples positive in both.
// Part 2 (wall clock, not CPU-quiet unless run under tests/helpers/test-slot.mjs): sampleWithinWithA0 at the massif
//   band (48 km, 32 km) on mountain-assembly-cost.mjs's in-massif region (8 sites x 385^2 @ 125 m, every third
//   point), both layouts in this process, median of 7 passes.
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [oldRoot,stepsArg='2,3,4,5',nArg='20000']=process.argv.slice(2);
if(!oldRoot){console.error('usage: node scripts/mountain-layout-foot.mjs <oldRoot> [steps] [nFib]');process.exit(2);}
const OLD=await import(pathToFileURL(`${oldRoot}/src/mountain-layout.ts`).href);
const NEW=await import('../src/mountain-layout.ts');
const {MASSIF_ENVELOPE}=await import('../src/mountain-envelope.ts');
const {waterWorlds,fib}=await import('../tests/terrain-climate-fixtures.mjs');
if(OLD.OROGEN_LAYOUT_VERSION!=='orogen-layout-1'){console.error(`${oldRoot} is ${OLD.OROGEN_LAYOUT_VERSION}, not orogen-layout-1`);process.exit(2);}
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const median=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
const n=+nArg,steps=stepsArg.split(',').map(Number),rows=[];
for(const w of waterWorlds()){
  const R=w.radiusM,a0=OLD.continentalA0(w);
  const lo=OLD.buildOrogenLayout({seed:w.seed,radiusM:R,a0}),sameBelts=JSON.stringify(lo.belts)===JSON.stringify(NEW.buildOrogenLayout({seed:w.seed,radiusM:R,a0}).belts);
  const dirs=Array.from({length:n},(_,i)=>fib(i,n)),sites=[];
  for(let i=0;i<20000&&sites.length<8;i++){const d=fib(i,20000),o=lo.sample(d);
    if(o.belt<.5||Math.abs(o.axisDistanceM)>3000)continue;
    if(sites.some(s=>Math.acos(Math.min(1,s.d[0]*d[0]+s.d[1]*d[1]+s.d[2]*d[2]))*R<300000))continue;sites.push({d,axis:[...o.axis],W:o.halfWidthM});}
  for(const s of sites){const across=unit(cross(s.d,s.axis));
    for(let p=0;p<129*129;p++){const x=(p%129-64)*(2*s.W/128),y=(Math.floor(p/129)-64)*(2*s.W/128);dirs.push(unit(s.d.map((v,j)=>v+(x*s.axis[j]+y*across[j])/R)));}}
  const old=dirs.map(d=>{const o=lo.sampleWithA0(d,a0(d));return {...o,axis:[...o.axis]};});
  for(const k of steps){
    NEW.setFootPointStepsForMeasurement(k);
    const ln=NEW.buildOrogenLayout({seed:w.seed,radiusM:R,a0});
    let belt=0,idx=0,pos=0,dist=0,along=0,axis=0,value=0;
    for(let i=0;i<dirs.length;i++){const o=old[i],m=ln.sampleWithA0(dirs[i],a0(dirs[i]));
      if((o.belt>0)!==(m.belt>0))belt++;
      if(o.beltIndex!==m.beltIndex){idx++;continue;}
      if(o.belt===0)continue;pos++;
      dist=Math.max(dist,Math.abs(o.axisDistanceM-m.axisDistanceM));along=Math.max(along,Math.abs(o.alongM-m.alongM));
      value=Math.max(value,Math.abs(o.belt-m.belt));axis=Math.max(axis,Math.hypot(o.axis[0]-m.axis[0],o.axis[1]-m.axis[1],o.axis[2]-m.axis[2]));}
    rows.push({world:w.name,steps:k,sameBelts,samples:dirs.length,positive:pos,beltMismatch:belt,indexMismatch:idx,maxDistanceM:dist,maxAlongM:along,maxAxis:axis,maxBelt:value});
  }
  NEW.setFootPointStepsForMeasurement(NEW.FOOT_POINT_STEPS);
}
for(const r of rows)console.log(`${r.world} steps ${r.steps}: belts same ${r.sameBelts}; ${r.samples} samples (${r.positive} positive); belt/index mismatches ${r.beltMismatch}/${r.indexMismatch}; max |d distance| ${r.maxDistanceM.toExponential(2)} m, |d along| ${r.maxAlongM.toExponential(2)} m, |d axis| ${r.maxAxis.toExponential(2)}, |d belt| ${r.maxBelt.toExponential(2)}`);
// Part 2: in-massif cost of both layouts.
const MAX=MASSIF_ENVELOPE.MAX_HALF_WIDTH_M,MIN=MASSIF_ENVELOPE.MIN_HALF_WIDTH_M;
for(const w of waterWorlds()){
  const R=w.radiusM,a0=NEW.continentalA0(w),lo=OLD.orogenLayout(w),ln=NEW.orogenLayout(w),sites=[];
  for(let i=0;i<20000&&sites.length<8;i++){const d=fib(i,20000),o=ln.sample(d);
    if(o.belt<.5||o.halfWidthM<32000||Math.abs(o.axisDistanceM)>3000||a0(d)<=0)continue;
    if(sites.some(s=>Math.acos(Math.min(1,s.d[0]*d[0]+s.d[1]*d[1]+s.d[2]*d[2]))*R<300000))continue;sites.push({d,axis:[...o.axis]});}
  const region=[];for(const s of sites){const across=unit(cross(s.d,s.axis));
    for(let p=0;p<385*385;p+=3){const x=(p%385-192)*125,y=(Math.floor(p/385)-192)*125;region.push(unit(s.d.map((v,j)=>v+(x*s.axis[j]+y*across[j])/R)));}}
  const alts=region.map(a0),out={belt:0,axis:[0,0,0],axisDistanceM:0,halfWidthM:0,beltIndex:-1,alongM:0};
  let sink=0;const time=l=>{const t=performance.now();for(let i=0;i<region.length;i++)sink+=l.sampleWithinWithA0(region[i],alts[i],MAX,out,MIN).axisDistanceM;return (performance.now()-t)*1e6/region.length;};
  time(lo);time(ln);const a=[],b=[];for(let k=0;k<7;k++){a.push(time(lo));b.push(time(ln));}
  console.log(`${w.name} in-massif sampleWithinWithA0: orogen-layout-1 ${median(a).toFixed(0)} ns, orogen-layout-2 ${median(b).toFixed(0)} ns (${region.length} points)${sink===42?' ':''}`);
}
