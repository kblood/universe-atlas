import {test} from 'node:test';
import assert from 'node:assert/strict';
import {terrainSampler} from '../src/terrain.ts';
import {buildTile,directionTile,tileDirection,tileNeighbour,unit,PATCH_SEGMENTS} from '../src/planet-tiles.ts';
import {groundRoughnessTarget,groundRoughnessCode,groundFragmentHeader,groundVertexHeader,groundVertex} from '../src/ground-material.ts';

const radiusM=10_000;
const region={version:'river-region-1',id:'test/wet-roughness/river-region-1',parentCatchmentId:'test/wet-roughness',bodyId:'test/wet-roughness',bodySeed:'wet-roughness',radiusM,
  origin:[1,0,0],east:[0,0,1],north:[0,1,0],boundsM:[-800,-800,800,800],
  channels:[{id:'main',name:'Main',parentId:null,points:[{x:-700,z:0,waterM:30,widthM:100,depthM:12,distanceM:0},{x:700,z:0,waterM:0,widthM:100,depthM:12,distanceM:1400}]}],
  lakes:[],sites:[],stats:{samples:1,lengthM:1400,maxCutM:20,maxFillM:0,buildAlgorithm:'test'}};
const body={id:'test/wet-roughness',name:'Wet roughness fixture',seed:'wet-roughness',kind:'planet',type:'Terrestrial world',parentId:'star',massKg:5.972e18,radiusM,temperatureK:290,color:'#3985ae',orbit:null,water:0,rings:false,hydrology:region};
const direction=(x,z)=>unit([1,z/radiusM,x/radiusM]);

test('withdrawn river geometry does not inject wet roughness; dry biome targets remain intact',()=>{
  const sample=terrainSampler(body),formerChannel=sample(direction(0,0)),dry=sample(direction(0,150));
  assert.equal(formerChannel.wet,false);assert.equal(formerChannel.roughness,.9);
  assert.equal(dry.wet,false);assert.equal(dry.roughness,.9);
  // The former river channel and ordinary dry ground now both keep the dry
  // sampler value. The pure material mapping still supports explicit wetness
  // when an ocean sample supplies the lower roughness endpoint.
  assert.equal(groundRoughnessTarget(.84,dry.roughness),.84);
  assert.equal(groundRoughnessTarget(.84,.28),.28);
  assert.equal(groundRoughnessTarget(.96,.28),.28);
  assert.equal(groundRoughnessTarget(.96,dry.roughness),.96);
  assert.ok(Math.abs(groundRoughnessTarget(.84,.59)-.56)<1e-12,'intermediate sampler values blend continuously');
});

test('tile roughness samples match terrain values, stay continuous at shared vertices, and include skirts',()=>{
  const tile=directionTile(direction(0,0),6),data=buildTile(body,tile),n=PATCH_SEGMENTS,stride=n+1,sample=terrainSampler(body);
  assert.ok(data.surfaceRoughness instanceof Float32Array);
  assert.equal(data.surfaceRoughness.length,data.positions.length/3);
  let wetCount=0,dryCount=0;
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const index=y*stride+x,value=data.surfaceRoughness[index],expected=sample(tileDirection(tile,x/n,y/n)).roughness;
    assert.ok(Math.abs(value-expected)<1e-7,'stored scalar is the existing terrain sampler result');
    if(expected<.5)wetCount++;else dryCount++;
  }
  assert.equal(wetCount,0,'withdrawn channel geometry contributes no wet roughness');
  assert.equal(dryCount,(n+1)**2,'the no-ocean fixture remains dry across the tile');
  for(let edge=0;edge<4;edge++)for(let i=0;i<=n;i++){
    const index=edge===0?i:edge===1?i*stride+n:edge===2?n*stride+n-i:(n-i)*stride;
    const skirtIndex=(n+1)**2+edge*stride+i;
    assert.equal(data.surfaceRoughness[skirtIndex],data.surfaceRoughness[index],'skirt duplicates its source vertex roughness');
  }
  const adjacent=tileNeighbour(tile,1),other=buildTile(body,adjacent),shared=new Map();
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++)shared.set(tileDirection(tile,x/n,y/n).map(v=>v.toFixed(10)).join(','),data.surfaceRoughness[y*stride+x]);
  let matched=0;
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const key=tileDirection(adjacent,x/n,y/n).map(v=>v.toFixed(10)).join(','),value=shared.get(key);
    if(value===undefined)continue;
    assert.ok(Math.abs(value-other.surfaceRoughness[y*stride+x])<1e-6,'adjacent patches share sampler roughness at their common vertices');matched++;
  }
  assert.ok(matched>=n+1,'shared tile edge samples were compared');
});

test('ground shader transports sampler roughness and preserves dry biome targets',()=>{
  assert.match(groundVertexHeader,/attribute float groundSurfaceRoughness/);
  assert.match(groundVertex,/groundSurfaceRoughnessV=groundSurfaceRoughness/);
  assert.match(groundFragmentHeader,/varying float groundSurfaceRoughnessV/);
  // The GLSL uses the endpoint normalization exercised by the CPU helper; it
  // does not synthesize a separate shoreline or wetness field.
  assert.equal(groundRoughnessTarget(.84,.9),.84);
  assert.equal(groundRoughnessTarget(.84,.28),.28);
  assert.match(groundRoughnessCode,/groundSurfaceWetness=clamp\(/);
  assert.match(groundRoughnessCode,/mix\(groundBiomeRoughness,groundPbrRoughness,.68\*groundPbrMixWeight\)/);
  assert.match(groundRoughnessCode,/mix\(groundPbrDryRoughness,0\.28,groundSurfaceWetness\)/);
});
