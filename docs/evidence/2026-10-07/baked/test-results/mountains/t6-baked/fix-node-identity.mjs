import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {orogenLayout} from '../../../src/mountain-layout.ts';
const s=readFileSync(new URL('./r2/before-layout.txt',import.meta.url),'utf8').replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../src/'+p.slice(2),import.meta.url).href}${q}`);
const before=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64'));
for(const body of waterWorlds()){
 const a=before.orogenLayout(body).coarseBandField(48000,32000),b=orogenLayout(body).coarseBandField(48000,32000);
 b.materialiseAll?.();
 for(const key of ['blockTable','masks','offsets','candidates','scalars'])assert.deepEqual(a[key],b[key]);
 let read=0,unused=0;
 for(let block=0;block<b.offsets.length-1;block++){
  const used=new Set();
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){
   const bit=j*8+i;if(!(b.masks[block*2+(bit>>>5)]&(1<<(bit&31))))continue;
   for(const offset of [0,1,9,10])used.add(j*9+i+offset);
  }
  for(let c=b.offsets[block];c<b.offsets[block+1];c++)for(let n=0;n<81;n++){
   if(used.has(n)){assert.ok(Object.is(a.distances[c*81+n],b.distances[c*81+n]));read++;}
   else {assert.equal(b.distances[c*81+n],0);unused++;}
  }
 }
 console.log(JSON.stringify({world:body.name,readNodesIdentical:read,unusedNodesZero:unused}));
}
