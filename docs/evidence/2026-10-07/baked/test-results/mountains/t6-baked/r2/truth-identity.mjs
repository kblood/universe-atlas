import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {directions,waterWorlds} from '../../../../tests/helpers/mountain-coarse-field.mjs';
import {terrainSampler} from '../../../../src/terrain.ts';
const text=readFileSync(new URL('./before-terrain.txt',import.meta.url),'utf8').replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../../src/'+p.slice(2),import.meta.url).href}${q}`);
const before=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64'));
for(const body of waterWorlds()){
 let count=0;
 for(const expose of [false,true]){
  const args=[body,[],undefined,false,0,undefined,expose,{mountains:true}],a=before.terrainSampler(...args),b=terrainSampler(...args);
  for(const d of directions(body,6000)){
   const x=a(d),y=b(d);assert.deepEqual(Object.keys(x),Object.keys(y));
   for(const k of Object.keys(x))if(Array.isArray(x[k]))x[k].forEach((v,i)=>assert.ok(Object.is(v,y[k][i]),k));else assert.ok(Object.is(x[k],y[k]),k);
   count++;
  }
 }
 console.log(JSON.stringify({world:body.name,identicalTruthSamples:count}));
}
