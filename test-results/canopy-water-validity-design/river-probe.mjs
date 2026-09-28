import {galaxies,refByAddress,system} from '../../src/catalog.ts';
import {buildCanonicalHydrology} from '../../src/hydrology-registry.ts';
import {createForestCensus} from '../../src/forest-census.ts';
import {FOREST_CELL_M} from '../../src/planet-population.ts';
import {forestPatch} from '../../src/forest-patch.ts';
import {terrainSampler} from '../../src/terrain.ts';
import {writeFile} from 'node:fs/promises';
const base=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const {regions}=buildCanonicalHydrology(base);const body={...base,canonicalRivers:regions};
function address(d,n){const [x,y,z]=d,c=[x,-x,y,-y,z,-z],axis=Math.max(...c),face=c.indexOf(axis),uv=[[-z/axis,y/axis],[z/axis,y/axis],[x/axis,-z/axis],[x/axis,z/axis],[x/axis,y/axis],[-x/axis,y/axis]][face];return {face,n,x:Math.floor(Math.min(n-1,Math.floor((uv[0]+1)*n/2))/8),y:Math.floor(Math.min(n-1,Math.floor((uv[1]+1)*n/2))/8)};}
const census=await createForestCensus(body,0),n=census.n,out=[];
for(const region of regions){const a=address(region.origin,n);let p=census.start(a);while(!p)p=census.step(64);
  const sample=terrainSampler(body,undefined,undefined,false,0),without=terrainSampler({...body,canonicalRivers:undefined},undefined,undefined,false,0);
  let riverSamples=0,changedGround=0;for(const cell of forestPatch(body.seed,a).cells){const s=sample(cell.direction),b=without(cell.direction);if(s.waterKind)riverSamples++;if(s.groundHeightM!==b.groundHeightM)changedGround++;}
  out.push({id:region.id,site:a,candidates:p.candidates,present:p.present,interval:p.waterInterval,riverSamples,changedGround,records:Array.from(p.records)});}
await writeFile(new URL('./river-water-patches.json',import.meta.url),JSON.stringify({regions:regions.length,patches:out.map(({records,...r})=>r)},null,2)+'\n');
console.log(JSON.stringify({regions:regions.length,patches:out.map(({records,...r})=>r)},null,2));
