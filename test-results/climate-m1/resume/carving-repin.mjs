// R5-ATLAS-CLIMATE-M1 resume: derive the surface-climate-2 pins for tests/lod-carving-reduction.test.mjs from
// carving-digests-{mainclimate,branch}.json using the test's own level -> pin mapping, check that (1) the main-climate
// digests reproduce every pin currently in the test (so only the climate moved them) and (2) every level of one class
// gives one digest, then print the old -> new map. With --write it replaces each old literal in the test file.
// Usage: node test-results/climate-m1/resume/carving-repin.mjs [--write]
import {readFileSync,writeFileSync} from 'node:fs';
const R='test-results/climate-m1/resume/',TEST='tests/lod-carving-reduction.test.mjs';
const main=JSON.parse(readFileSync(R+'carving-digests-mainclimate.json','utf8')),branch=JSON.parse(readFileSync(R+'carving-digests-branch.json','utf8'));
const src=readFileSync(TEST,'utf8');
const grab=name=>{const i=src.indexOf(`const ${name} = {`),j=src.indexOf('};',i);return Function(`return ${src.slice(src.indexOf('{',i),j+1)}`)();};
const COST_IDENTITY=grab('COST_IDENTITY'),COST_SAMPLER_IDENTITY=grab('COST_SAMPLER_IDENTITY'),RISER=grab('RISER_SAMPLER_IDENTITY');
const CUT={Maithea:6,Selawyn:7,Raiva:5,Lethuris:7},ROCK={Maithea:10,Selawyn:11,Raiva:9,Lethuris:11};
const map=new Map(),problems=[];
const put=(old,nu,where)=>{if(map.has(old)&&map.get(old)!==nu)problems.push(`${where}: ${old} maps to two values`);map.set(old,nu);};
for(const name of Object.keys(CUT)){
  const m=main.bodies[name],b=branch.bodies[name],cut=CUT[name];
  [cut-1,cut].forEach((L,i)=>{const old=COST_IDENTITY[name][i];if(m.tiles[L].digest!==old)problems.push(`${name} tile L${L}: main climate ${m.tiles[L].digest} != pin ${old}`);put(old,b.tiles[L].digest,`${name} tile L${L}`);});
  for(const key of Object.keys(b.samplers)){
    const L=key==='truth'?undefined:+key.slice(1),cls=L===undefined||L>=ROCK[name]?2:L>=cut?1:0;
    const old=cls===2&&L!==undefined&&RISER[name][L]||COST_SAMPLER_IDENTITY[name][cls];
    if(m.samplers[key].digest!==old)problems.push(`${name} ${key}: main climate ${m.samplers[key].digest} != pin ${old}`);
    put(old,b.samplers[key].digest,`${name} ${key}`);
  }
}
const pairs=[...map].map(([o,n])=>({old:o,new:n,changed:o!==n}));
console.log(JSON.stringify({problems,changed:pairs.filter(p=>p.changed).length,unchanged:pairs.filter(p=>!p.changed).length,pairs},null,1));
if(process.argv.includes('--write')){
  if(problems.length)throw new Error('refusing to write: '+problems.join('; '));
  let s=src;for(const {old,new:nu} of pairs){if(s.split(old).length!==2)throw new Error(`literal ${old} not unique`);s=s.replace(old,nu);}
  writeFileSync(TEST,s);
}
