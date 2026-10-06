import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import * as current from '../../../src/terrain.ts';
import * as tiles from '../../../src/planet-tiles.ts';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
const root=new URL('../../../src/',import.meta.url);
function moduleURL(source,override={}){source=source.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,path)=>`from ${q}${override[path]??new URL(path,root).href}${q}`);return 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64');}
const original=execFileSync('git',['show','9971c3f:src/terrain.ts'],{encoding:'utf8'}),url=moduleURL(original),main=await import(url);
const originalTiles=await import(moduleURL(readFileSync(new URL('planet-tiles.ts',root),'utf8'),{'./terrain.ts':url}));
for(const body of waterWorlds()){
 let samples=0;const cut=carvingFromLevel(body.radiusM);
 for(const expose of [false,true])for(const options of [{},{lodLevel:0},{mountains:false},{mountains:true},{mountains:true,lodLevel:cut}]){
  const args=[body,[],undefined,false,0,undefined,expose,options],a=current.terrainSampler(...args),b=main.terrainSampler(...args);
  // Carved identity has independent existing digest pins as well. Avoid a global cold M3 scan here.
  for(let i=0;i<256;i++){const d=fib(i,256);assert.deepEqual(a(d),b(d));samples++;}
 }
 for(const includeCraters of [false,true]){
  const args=[body,[],undefined,includeCraters],a=current.terrainSampler(...args),b=main.terrainSampler(...args);
  for(let i=0;i<128;i++){const d=fib(i,128);assert.deepEqual(a(d),b(d));samples++;}
 }
 const baseA=current.baseTerrainSampler(body),baseB=main.baseTerrainSampler(body);
 for(let i=0;i<4096;i++){const d=fib(i,4096);assert.deepEqual(baseA(d),baseB(d));samples++;}
 const tile=tiles.directionTile(axisSites(body,{count:3})[0].d,cut),a=tiles.buildTile(body,tile,1,0,{mountains:true}),b=originalTiles.buildTile(body,tile,1,0,{mountains:true});
 const moved=[];for(const key of Object.keys(a)){try{assert.deepEqual(a[key],b[key]);}catch{moved.push(key);}}
 assert.deepEqual(moved,['parents','parentHeight']);
 const offA=tiles.buildTile(body,{face:0,level:0,x:0,y:0}),offB=originalTiles.buildTile(body,{face:0,level:0,x:0,y:0});assert.deepEqual(offA,offB);
 console.log(JSON.stringify({world:body.name,samples,carvedTileMoved:moved,unwiredTile:'identical'}));
}
