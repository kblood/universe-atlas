import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {orogenLayout} from '../../../src/mountain-layout.ts';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites,buildOn} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {terrainSampler} from '../../../src/terrain.ts';
import {directionTile} from '../../../src/planet-tiles.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
function digest(value){const h=createHash('sha256');function add(v){if(ArrayBuffer.isView(v)){h.update(v.constructor.name);h.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));}else if(typeof v==='number'){const b=Buffer.alloc(8);b.writeDoubleLE(v);h.update(b);}else if(v&&typeof v==='object'){for(const k of Object.keys(v).sort()){h.update(k);add(v[k]);}}else h.update(String(v));}add(value);return h.digest('hex');}
// Read-only HEAD reference: verify field identity and the switch child's non-parent fields before re-pinning.
const root=new URL('../../../',import.meta.url);
const head=name=>execFileSync('git',['show','HEAD:src/'+name],{cwd:root,encoding:'utf8'});
const moduleURL=(source,overrides={})=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${overrides[p]??new URL('src/'+p.slice(2),root).href}${q}`))).toString('base64');
const oldLayoutURL=moduleURL(head('mountain-layout.ts'));
const oldTerrainURL=moduleURL(head('terrain.ts'),{'./mountain-layout.ts':oldLayoutURL});
const oldTiles=await import(moduleURL(head('planet-tiles.ts'),{'./terrain.ts':oldTerrainURL}));
const oldLayout=await import(oldLayoutURL);
const path=new URL('../../../tests/lod-carving-reduction.test.mjs',import.meta.url),source=readFileSync(path,'utf8');let next=source;const ledger=[];
for(const body of waterWorlds()){
 const cut=carvingFromLevel(body.radiusM),sites=axisSites(body,{count:3}),dirs=[...sites.map(s=>s.d),...Array.from({length:256},(_,i)=>fib(i,256))];
 const oldField=oldLayout.orogenLayout(body).coarseBandField(48000,32000),field=orogenLayout(body).coarseBandField(48000,32000);
 for(const k of ['blockTable','masks','offsets','candidates','distances'])assert.deepEqual(field[k],oldField[k],body.name+': '+k);
 for(let k=0;k<field.scalars.length;k++)assert.equal(field.scalars[k],k%9===8?.2:oldField.scalars[k]);
 const tile=directionTile(sites[0].d,cut),before=oldTiles.buildTile(body,tile,1,0,{mountains:true}),after=buildOn(body,tile);
 assert.deepEqual(Object.keys(after),Object.keys(before));
 for(const k of Object.keys(after))if(k!=='parents'&&k!=='parentHeight')assert.equal(digest(after[k]),digest(before[k]),body.name+': switch '+k+' moved');
 for(const [kind,values] of [['COST_IDENTITY',[cut-1,cut].map(L=>digest(buildOn(body,directionTile(sites[0].d,L))))],['COST_SAMPLER_IDENTITY',[0,cut].map(lodLevel=>digest(dirs.map(terrainSampler(body,undefined,undefined,undefined,0,undefined,true,{mountains:true,lodLevel}))))]]){
  const section=source.slice(source.indexOf('const '+kind+' =')),match=section.match(new RegExp(body.name+": \\['([^']+)', '([^']+)'\\]"));
  for(let i=0;i<2;i++){const repinned=i===0||kind==='COST_IDENTITY'; if(!repinned&&match[i+1]!==values[i])throw new Error(body.name+': >=cut sampler moved'); ledger.push({world:body.name,kind,index:i,old:match[i+1],new:values[i],repinned});if(repinned)next=next.replace(match[i+1],values[i]);}
 }
}
writeFileSync(path,next);writeFileSync(new URL('./digest-ledger.json',import.meta.url),JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify(ledger,null,2));
