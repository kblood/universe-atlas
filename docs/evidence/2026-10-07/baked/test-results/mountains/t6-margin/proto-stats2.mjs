// Prototype (coordinator diagnostic): coarse-minus-exact uncarved floor with a |u/U|-dependent delta, by source
// mutation of the delta argument only. Usage: node proto-stats.mjs <worldIndex> <d0> <a> <b> <dEnd>
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {waterWorlds,exactSampler,directions} from '../../../tests/helpers/mountain-coarse-field.mjs';
const [wi,d0,a,b,dEnd,dropMain]=process.argv.slice(2).map(Number);
let src=readFileSync(new URL('../../../src/terrain.ts',import.meta.url),'utf8');
const hook='massifCoarseRidgeTermM(main,sd,bs[k+8]';if(!src.includes(hook))throw new Error('hook');
src=src.replace(hook,`massifCoarseRidgeTermM(main,sd,(${d0}+${dEnd}*Math.max(0,Math.min(1,(Math.abs(u/bs[k+6])-${a})/${b-a})))`)
  .replace('let best=main;',dropMain?'let best=-Infinity;':'let best=main;').replace('ridgeTermM=best;',dropMain?'ridgeTermM=best===-Infinity?main:best;':'ridgeTermM=best;').replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../src/'+p.slice(2),import.meta.url).href}${q}`);
const T=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(src)).toString('base64'));
const body=waterWorlds()[wi],coarse=T.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true,lodLevel:0}),exact=exactSampler(body);
const diffs=[];let violations=0,ocean=0,worstViol=0;
for(const d of directions(body)){const c=coarse(d),e=exact(d);const x=c.floorM-e.floorM;diffs.push(x);if(x<0){violations++;worstViol=Math.min(worstViol,x);}if(c.ocean!==e.ocean)ocean++;}
diffs.sort((p,q)=>p-q);const pc=q=>diffs[Math.floor(diffs.length*q)];
console.log(JSON.stringify({world:body.name,dropMain,d0,a,b,dEnd,count:diffs.length,violations,worstViol,ocean,p50:pc(.5),p90:pc(.9),p99:pc(.99),p999:pc(.999),max:diffs.at(-1)}));
