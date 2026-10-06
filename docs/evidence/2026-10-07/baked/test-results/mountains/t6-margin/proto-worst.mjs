// Diagnostic: the worst coarse-minus-exact points under a |u/U|-dependent delta, with field and exact M1 state.
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {waterWorlds,exactSampler,directions,lookup,orogenLayout,referenceDistance} from '../../../tests/helpers/mountain-coarse-field.mjs';
const [wi,d0,a,b,dEnd]=process.argv.slice(2).map(Number);
let src=readFileSync(new URL('../../../src/terrain.ts',import.meta.url),'utf8');
const hook='massifCoarseRidgeTermM(main,sd,bs[k+8]';if(!src.includes(hook))throw new Error('hook');
src=src.replace(hook,`massifCoarseRidgeTermM(main,sd,(${d0}+${dEnd}*Math.max(0,Math.min(1,(Math.abs(u/bs[k+6])-${a})/${b-a})))`)
  .replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../src/'+p.slice(2),import.meta.url).href}${q}`);
const T=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(src)).toString('base64'));
const body=waterWorlds()[wi],coarse=T.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true,lodLevel:0}),exact=exactSampler(body);
const layout=orogenLayout(body),field=layout.coarseBandField(48000,32000);
const rows=[];
for(const d of directions(body)){const c=coarse(d),e=exact(d);rows.push({d,x:c.floorM-e.floorM,c:c.floorM,e:e.floorM});}
rows.sort((p,q)=>q.x-p.x);
for(const r of rows.slice(0,12)){
  const o=layout.sampleWithA0(r.d,1e9);
  const cands=lookup(field,r.d).map(({belt,sd})=>{const B=layout.belts[belt],H=Math.min(B.halfWidthM,48000);
    const x=r.d.reduce((s,v,k)=>s+v*B.tangent[k],0),z=r.d.reduce((s,v,k)=>s+v*B.centre[k],0),u=x/(Math.sqrt(x*x+z*z)+z);
    return {belt,sd:+sd.toFixed(4),exact:+(referenceDistance(B,r.d,body.radiusM)/H).toFixed(4),uf:+(u/B.uLimit).toFixed(4),hw:B.halfWidthM};});
  console.log(JSON.stringify({x:+r.x.toFixed(1),coarse:+r.c.toFixed(1),exact:+r.e.toFixed(1),m1:{belt:+o.belt.toFixed(4),idx:o.beltIndex,ad:+(o.axisDistanceM/1000).toFixed(2),hw:o.halfWidthM},cands}));
}
