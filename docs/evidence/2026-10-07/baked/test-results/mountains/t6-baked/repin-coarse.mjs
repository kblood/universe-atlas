import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites,buildOn} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {terrainSampler} from '../../../src/terrain.ts';
import {directionTile} from '../../../src/planet-tiles.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
function digest(value){const h=createHash('sha256');function add(v){if(ArrayBuffer.isView(v)){h.update(v.constructor.name);h.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));}else if(typeof v==='number'){const b=Buffer.alloc(8);b.writeDoubleLE(v);h.update(b);}else if(v&&typeof v==='object'){for(const k of Object.keys(v).sort()){h.update(k);add(v[k]);}}else h.update(String(v));}add(value);return h.digest('hex');}
const path=new URL('../../../tests/lod-carving-reduction.test.mjs',import.meta.url),source=readFileSync(path,'utf8');let next=source;const ledger=[];
for(const body of waterWorlds()){
 const cut=carvingFromLevel(body.radiusM),sites=axisSites(body,{count:3}),dirs=[...sites.map(s=>s.d),...Array.from({length:256},(_,i)=>fib(i,256))];
 for(const [kind,values] of [['COST_IDENTITY',[cut-1,cut].map(L=>digest(buildOn(body,directionTile(sites[0].d,L))))],['COST_SAMPLER_IDENTITY',[0,cut].map(lodLevel=>digest(dirs.map(terrainSampler(body,undefined,undefined,undefined,0,undefined,true,{mountains:true,lodLevel}))))]]){
  const section=source.slice(source.indexOf('const '+kind+' =')),match=section.match(new RegExp(body.name+": \\['([^']+)', '([^']+)'\\]"));
  for(let i=0;i<2;i++){ledger.push({world:body.name,kind,index:i,old:match[i+1],new:values[i],repinned:i===0});if(i===0)next=next.replace(match[1],values[0]);}
 }
}
writeFileSync(path,next);writeFileSync(new URL('./digest-ledger.json',import.meta.url),JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify(ledger,null,2));
