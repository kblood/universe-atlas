// Diagnostic: instrument the coarse and exact ridge-term composition at the worst points.
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {waterWorlds,directions} from '../../../tests/helpers/mountain-coarse-field.mjs';
const wi=+process.argv[2];
const fix=s=>s.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../src/'+p.slice(2),import.meta.url).href}${q}`);
let src=readFileSync(new URL('../../../src/terrain.ts',import.meta.url),'utf8');
const h1='if(term>best)best=term;';if(!src.includes(h1))throw 1;
src=src.replace(h1,'globalThis.__c&&globalThis.__c.push({main,sd,uf:u/bs[k+6],a0,landFactor,tau,term,hw:bs[k+7]});'+h1);
const h2='ridgeTermM = mountainRidgeTermM(ridgeTermM, o, a0, landFactor, tau, beltCarvingSeeds, carve);';if(!src.includes(h2))throw 2;
src=src.replace(h2,'{const m0=ridgeTermM;ridgeTermM = mountainRidgeTermM(ridgeTermM, o, a0, landFactor, tau, beltCarvingSeeds, false);globalThis.__e&&globalThis.__e.push({main:m0,belt:o.belt,ad:o.axisDistanceM,hw:o.halfWidthM,a0,landFactor,tau,term:ridgeTermM});}');
const T=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fix(src))).toString('base64'));
const body=waterWorlds()[wi],coarse=T.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true,lodLevel:0}),exact=T.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true});
const rows=[];for(const d of directions(body)){const c=coarse(d),e=exact(d);rows.push({d,x:c.floorM-e.floorM});}
rows.sort((p,q)=>q.x-p.x);
for(const r of rows.slice(0,5)){globalThis.__c=[];globalThis.__e=[];coarse(r.d);exact(r.d);console.log(JSON.stringify({x:r.x,c:globalThis.__c,e:globalThis.__e}));}
