import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {directions,waterWorlds} from '../../../tests/helpers/mountain-coarse-field.mjs';
import {axisSites,buildOn} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {terrainSampler} from '../../../src/terrain.ts';
import {directionTile} from '../../../src/planet-tiles.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
function digest(value){const h=createHash('sha256');function add(v){if(ArrayBuffer.isView(v)){h.update(v.constructor.name);h.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));}else if(typeof v==='number'){const b=Buffer.alloc(8);b.writeDoubleLE(v);h.update(b);}else if(v&&typeof v==='object'){for(const k of Object.keys(v).sort()){h.update(k);add(v[k]);}}else h.update(String(v));}add(value);return h.digest('hex');}
const result={};
for(const body of waterWorlds()){
 const cut=carvingFromLevel(body.radiusM),dirs=directions(body,4096),row={directions:dirs.length,samplers:{},tiles:{}};
 for(const floor of [false,true])for(const lodLevel of [0,cut-1])row.samplers[`${lodLevel}/${floor}`]=digest(dirs.map(terrainSampler(body,undefined,undefined,undefined,0,undefined,floor,{mountains:true,lodLevel})));
 const site=axisSites(body,{count:4})[0].d;
 for(const L of [cut-1,cut])row.tiles[L]=digest(buildOn(body,directionTile(site,L)));
 result[body.name]=row;
}
writeFileSync(new URL(process.argv[2],import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
