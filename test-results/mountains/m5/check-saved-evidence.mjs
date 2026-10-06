import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {base} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
const pools=JSON.parse(readFileSync(new URL('rows-all-pools.json',import.meta.url)));
const out={};
for(const [name,p] of Object.entries(pools)){if(typeof p!=='object')continue;
  const tests={round2R6:p.controls.round2R6.newPitsPerKm2>1,longR4:p.controls.longR4>.2,
    noRockR3:p.without.R3.beta>p.without.R3.beta-(p.without.R3.beta-2.617)/3,
    noRockR1e:p.without.R1e.ratio<2,shallowR1e:p.controls.shallowR1.R1e.ratio<2,
    speckleR3:p.controls.speckleR3.beta<2,
    depth4R2:p.controls.depth4R2.p90>48.4||p.controls.depth4R2.p50<p.without.R2_R5.p50-.5};
  for(const [key,value] of Object.entries(tests))assert.equal(value,true,`${name} ${key}`);out[name]=tests;
}
const examples=[];
for(const [name,p] of Object.entries(pools)){if(typeof p!=='object')continue;for(const point of p.actual.R7.smoothExamples){
 const {x,y,seed}=point,offset=(seed-730500)*170000;
 const phase=(xx,yy)=>{let f=(xx+offset+180*Math.sin(yy/6000+(seed-730500)*.7))/4000;return f-Math.floor(f);};
 const t=phase(x,y),tx=phase(x+125,y),ty=phase(x,y+125);
 const h=base(x,y,seed),gx=(base(x+125,y,seed)-h)/125,gy=(base(x,y+125,seed)-h)/125,n=Math.hypot(gx,gy),ex=-gx/n,ey=-gy/n;
 const stencil=[];for(const delta of [-.5,.5])for(const [dx,dy] of [[0,0],[125,0],[0,125]])stencil.push(phase(x+delta*ex+dx,y+delta*ey+dy));
 const segment=t=>t<.095?0:t<.5?1:t<.905?2:0;
 examples.push({pool:name,...point,phase:t,phaseX:tx,phaseY:ty,stencilPhases:stencil,crossesAnalyticKink:stencil.some(f=>segment(f)!==segment(t))});
}}
writeFileSync(new URL('saved-evidence-check.json',import.meta.url),JSON.stringify({controls:out,lowLagDiagnostics:examples},null,2));
console.log(JSON.stringify({controls:out,lowLagDiagnostics:examples}));
