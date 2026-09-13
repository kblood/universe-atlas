import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {baseTerrainSampler,terrainSampler,planetSurface} from '../src/terrain.ts';
import {buildTile,directionTile,tileDirection,unit,regionalBankWeights,INLAND_WATER_PROXY_ALPHA} from '../src/planet-tiles.ts';
import {contactGeometry} from '../src/terrain-contact.ts';
import {surfaceQuery} from '../src/world-surface.ts';
import {GroundWalker,initWalking} from '../src/ground-walker.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {buildDrainage} from '../src/drainage.ts';
import {buildRiverRegion,riverDirection} from '../src/river-generation.ts';
import {sampleRiverRegion} from '../src/river-sample.ts';

const radiusM=10000;
const region={version:'river-region-1',id:'test/drainage-1/river-region-1',parentCatchmentId:'test/drainage-1',bodyId:'test',bodySeed:'river-terrain',radiusM,
  origin:[1,0,0],east:[0,0,1],north:[0,1,0],boundsM:[-800,-800,800,800],
  channels:[{id:'main',name:'Main',parentId:null,points:[{x:-700,z:0,waterM:30,widthM:100,depthM:12,distanceM:0},{x:700,z:0,waterM:0,widthM:100,depthM:12,distanceM:1400}]}],
  lakes:[{id:'lake',name:'Lake',x:350,z:320,radiusXM:130,radiusZM:100,angle:0,waterM:50,depthM:10}],sites:[],stats:{samples:1,lengthM:1400,maxCutM:20,maxFillM:0,buildAlgorithm:'test'}};
const baseBody={id:'test',name:'Test',seed:'river-terrain',kind:'planet',type:'Terrestrial world',parentId:'star',massKg:5.972e18,radiusM,temperatureK:290,color:'#3985ae',orbit:null,water:0,rings:false};
const body={...baseBody,hydrology:region};
const direction=(x,z)=>unit([1,z/radiusM,x/radiusM]);

test('hydrology leaves the baseline sampler unchanged outside its regional influence',()=>{
  const old=baseTerrainSampler(baseBody),plain=terrainSampler(baseBody),river=terrainSampler(body);
  for(const d of [[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
    assert.deepEqual(plain(d),{...old(d),rockHeightM:old(d).elevationM,waterLevelM:old(d).ocean?0:null,visibleHeightM:old(d).ocean?0:old(d).elevationM,wet:old(d).ocean,waterKind:null,bank:0,channelId:null,flow:[0,0],influence:0});
    assert.deepEqual(river(d),plain(d));
  }
});

test('inland water keeps a carved rock field and a separate visible water surface',()=>{
  const s=terrainSampler(body)(direction(0,0)),q=surfaceQuery(body)(direction(0,0));
  assert.equal(s.ocean,false);assert.equal(s.wet,true);assert.equal(s.waterKind,'river');
  assert.ok(s.waterLevelM!==null&&s.rockHeightM<s.waterLevelM);
  assert.equal(s.visibleHeightM,s.waterLevelM);assert.equal(q.visibleHeightM,s.visibleHeightM);
  assert.equal(q.walkable,false);assert.equal(q.ocean,false);
  const lake=surfaceQuery(body)(direction(350,320));assert.equal(lake.waterKind,'lake');assert.equal(lake.walkable,false);
  assert.equal(q.geologyVersion,'terrain-1.1.0');assert.equal(q.regionalGeologyVersion,'river-region-1');
});

test('river shore bed and dry bank meet continuously without a submerged walking trench',()=>{
  const wet=terrainSampler(body)(direction(0,49.999)),dry=terrainSampler(body)(direction(0,50.001));
  assert.equal(wet.wet,true);assert.equal(dry.wet,false);
  assert.ok(wet.waterLevelM!==null&&wet.rockHeightM<=wet.waterLevelM);
  assert.ok(Math.abs(wet.rockHeightM-wet.waterLevelM)<.01,'wet boundary reaches water');
  assert.ok(Math.abs(dry.rockHeightM-wet.waterLevelM)<.01,'dry bank begins at that same water level');
  assert.ok(dry.rockHeightM>=wet.waterLevelM,'dry bank does not leave a below-water trench');
  const bankDirection=direction(0,80);
  assert.equal(surfaceQuery(body)(bankDirection).walkable,true,'dry-side bank remains a valid walking surface');
});

test('regional dry banks use a narrow pebbly edge and soil farther inland',()=>{
  const habitat={...body,water:.65},native=[.78,.12,.1,0];
  const edge=regionalBankWeights(habitat,{wet:false,influence:1,bank:1},native);
  const inland=regionalBankWeights(habitat,{wet:false,influence:1,bank:.2},native);
  assert.ok(edge[0]>inland[0],'shared bank field keeps sand at the water edge');
  assert.ok(edge[2]>=native[2]&&inland[2]>=native[2],'pebbly edge never removes existing rock');
  assert.ok(inland[1]>edge[1],'dry bank returns to soil as regional influence fades');
  assert.equal(edge.reduce((a,b)=>a+b,0),1);assert.equal(inland.reduce((a,b)=>a+b,0),1);
  const partial=regionalBankWeights(habitat,{wet:false,influence:.5,bank:.2},native);
  assert.ok(partial.every((weight,i)=>Math.abs(weight-(inland[i]+native[i])*.5)<1e-15),'partial influence blends regional and baseline materials');
  const limit=regionalBankWeights(habitat,{wet:false,influence:1e-8,bank:.2},native);
  assert.ok(limit.every((weight,i)=>Math.abs(weight-native[i])<1e-8),'regional material reaches the baseline continuously at zero influence');
  assert.deepEqual(regionalBankWeights(habitat,{wet:false,influence:0,bank:.2},native),native);
  const snowy=[.05,.05,.1,.8],rocky=[.1,.1,.7,.1];
  assert.equal(regionalBankWeights(habitat,{wet:false,influence:1,bank:1},snowy),snowy,'snow classification wins');
  assert.equal(regionalBankWeights(habitat,{wet:false,influence:1,bank:1},rocky),rocky,'rock classification wins');
  assert.equal(regionalBankWeights({...habitat,type:'Ice world'},{wet:false,influence:1,bank:1},native),native,'non-habitable worlds retain their native material');
  assert.equal(regionalBankWeights(habitat,{wet:true,influence:1,bank:1},native),native,'wet water does not receive ground-bank material');
});

test('temperate dry-bank colour is shared, finite, and leaves wet water unchanged',()=>{
  const temperate={...body,seed:'season-3',water:.65,hydrology:{...region,bodySeed:'season-3'}};
  const base=baseTerrainSampler(temperate),sample=terrainSampler(temperate);
  const dryDirection=direction(0,150),dry=sample(dryDirection),native=base(dryDirection);
  assert.equal(dry.wet,false);assert.ok(dry.influence>0);
  assert.notDeepEqual(dry.color,native.color,'regional dry bank overrides coastal baseline colour');
  assert.ok(dry.color.every(value=>Number.isFinite(value)&&value>=0&&value<=255));
  const wet=sample(direction(0,0));assert.equal(wet.wet,true);assert.deepEqual(wet.color,[24,105,132]);
  const polar=sample([0,1,0]);assert.deepEqual(polar,terrainSampler(temperate)([0,1,0]));
});

test('orbit preview and tile colour texels read the shared regional bank sample',()=>{
  const temperate={...body,seed:'season-3',water:.65,hydrology:{...region,bodySeed:'season-3'}},sample=terrainSampler(temperate);
  const tile=directionTile(direction(0,150),6),data=buildTile(temperate,tile),size=data.width,x=32,y=32;
  const tileDirectionAtTexel=tileDirection(tile,(x-.5)/64,(y-.5)/64),tileSample=sample(tileDirectionAtTexel);
  assert.deepEqual(Array.from(data.color.slice((y*size+x)*4,(y*size+x+1)*4)),[...tileSample.color.map(Math.floor),tileSample.wet&&tileSample.waterKind?0:255]);
  const preview=planetSurface(temperate,128,40);let found=false;
  for(let py=0;py<preview.height&&!found;py++)for(let px=0;px<preview.width;px++){
    const theta=((px+.5)/preview.width)*Math.PI*2,phi=((py+.5)/preview.height)*Math.PI,d=[-Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)],s=sample(d);
    if(s.influence<=0||s.wet)continue;
    assert.deepEqual(Array.from(preview.data.slice((py*preview.width+px)*4,(py*preview.width+px+1)*4)),[...s.color.map(Math.floor),255]);found=true;
  }
  assert.equal(found,true,'preview resolution samples the regional dry bank');
});

test('tile alpha masks inland physical water without masking dry bank or baseline ocean',()=>{
  const inland=buildTile(body,directionTile(direction(0,0),6));
  const alpha=(data,x,y)=>data.color[(y*data.width+x)*4+3];
  assert.ok([...Array(inland.width).keys()].some(y=>[...Array(inland.width).keys()].some(x=>alpha(inland,x,y)===INLAND_WATER_PROXY_ALPHA)),'river texels request nearby physical-water coverage');
  const dry=buildTile(body,directionTile(direction(0,150),6));
  assert.equal(alpha(dry,32,32),255,'dry regional bank preserves the opaque terrain byte');
  const oceanBody={...baseBody,water:.8,hydrology:undefined};
  const ocean=buildTile(oceanBody,directionTile([1,0,0],6));
  assert.ok(ocean.color.every((value,index)=>index%4!==3||value===255),'baseline ocean preserves opaque colour-map bytes');
});

test('Maithea Orien Delta lake collar is continuous across lake and nearby river edges',()=>{
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1],catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===23165);
  assert.ok(catchment);const regional=buildRiverRegion(maithea,catchment),lake=regional.lakes[0],baseline=terrainSampler(maithea);
  assert.equal(regional.id,'G001/C2128,0,1/0/planet/1/drainage-1/n64/outlet/23165/river-region-1');assert.equal(JSON.stringify(buildRiverRegion(maithea,catchment)),JSON.stringify(regional),'surface correction keeps canonical construction deterministic');
  const sample=(x,z)=>{const d=riverDirection(regional,x,z);return sampleRiverRegion(regional,d,baseline(d).elevationM);};
  let maxLakeStep=0,maxRiverStep=0;
  for(let i=0;i<96;i++){
    const angle=i*Math.PI*2/96,ca=Math.cos(lake.angle),sa=Math.sin(lake.angle),ex=lake.radiusXM*Math.cos(angle),ez=lake.radiusZM*Math.sin(angle),ux=Math.cos(angle)/lake.radiusXM,uz=Math.sin(angle)/lake.radiusZM,length=Math.hypot(ux,uz),nx=(ca*ux-sa*uz)/length,nz=(sa*ux+ca*uz)/length,x=lake.x+ca*ex-sa*ez,z=lake.z+sa*ex+ca*ez;
    const inside=sample(x-nx*.01,z-nz*.01),outside=sample(x+nx*.01,z+nz*.01),insideVisible=inside.waterLevelM??inside.rockHeightM,outsideVisible=outside.waterLevelM??outside.rockHeightM;
    assert.equal(inside.waterKind,'lake');assert.ok(inside.wet);assert.ok(!outside.wet||Math.abs((outside.waterLevelM??0)-lake.waterM)<.01,'attached river stays level at the lake join');
    maxLakeStep=Math.max(maxLakeStep,Math.abs(insideVisible-outsideVisible));if(!outside.wet)assert.ok(outside.rockHeightM>=lake.waterM-.01,'dry lake bank remains above lake level');
  }
  for(const channel of regional.channels)for(let i=1;i<channel.points.length-1;i++){
    const p=channel.points[i],before=channel.points[i-1],after=channel.points[i+1],dx=after.x-before.x,dz=after.z-before.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,half=p.widthM/2;
    for(const side of [-1,1]){const wet=sample(p.x+side*nx*(half-.01),p.z+side*nz*(half-.01)),dry=sample(p.x+side*nx*(half+.01),p.z+side*nz*(half+.01));if(wet.influence>0||dry.influence>0)maxRiverStep=Math.max(maxRiverStep,Math.abs(wet.rockHeightM-dry.rockHeightM));}
  }
  assert.ok(maxLakeStep<.01,`lake shoreline maximum visible step ${maxLakeStep} m`);assert.ok(maxRiverStep<.05,`nearby river wet/dry maximum rock step ${maxRiverStep} m`);
});

test('future global water overtops and later reveals the immutable inland level',()=>{
  const seasonal={...body,seed:'season-3',water:.65,hydrology:{...region,bodySeed:'season-3'}},query=surfaceQuery(seasonal,[{dateNs:0n,levelM:80},{dateNs:1n,levelM:-50}]);
  const flooded=query(direction(0,0),0n),drained=query(direction(0,0),1n);
  assert.equal(flooded.ocean,true);assert.equal(flooded.wet,true);assert.equal(flooded.waterLevelM,80);
  assert.equal(flooded.visibleHeightM,80);assert.equal(flooded.walkable,false);
  assert.equal(drained.ocean,false);assert.equal(drained.wet,true);assert.equal(drained.waterKind,'river');
  assert.equal(drained.waterLevelM,15);assert.equal(drained.visibleHeightM,15);
});

test('tiles and contact patches use the same visible bank and water elevations',()=>{
  const tile=directionTile(direction(0,0),6),data=buildTile(body,tile),contact=contactGeometry(data,[0,0,0,0],radiusM,[0,0,0],'river');
  for(const i of [0,16,32,16*33+16,32*33+32]){
    const d=tileDirection(tile,(i%33)/32,Math.floor(i/33)/32),s=terrainSampler(body)(d);
    const tilePoint=[0,1,2].map(j=>(data.positions[i*3+j]+data.anchor[j])*radiusM);
    const contactPoint=[0,1,2].map(j=>contact.positions[i*3+j]);
    assert.ok(Math.abs(Math.hypot(...tilePoint)-radiusM-s.visibleHeightM)<.02);
    assert.ok(Math.hypot(...tilePoint.map((v,j)=>v-contactPoint[j]))<.02);
  }
});

test('tangent-frame sampling remains deterministic at poles and cube boundaries',()=>{
  const polar={...body,hydrology:{...region,id:'polar',origin:[0,1,0],east:[1,0,0],north:[0,0,1]}};
  const sample=terrainSampler(polar),a=unit([.01,1,.01]),b=unit([.01,1,.01]);
  assert.deepEqual(sample(a),sample(b));
  const edge=unit([1,1,0]);assert.deepEqual(sample(edge),sample(edge));
});

await initWalking();
test('walker rejects both intended and collision-resolved wet crossings',()=>{
  const startDirection=direction(0,-80),surface=surfaceQuery(body)(startDirection);
  const start=new THREE.Vector3(...startDirection).multiplyScalar(radiusM+surface.visibleHeightM+1);
  const walker=new GroundWalker(body,start.toArray());
  const heading=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0));
  const cache=new Map();
  const patches=(point,origin)=>{
    const radial=new THREE.Vector3(...point).normalize(),t=directionTile(radial.toArray(),6),result=[];
    for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
      const tile={...t,x:t.x+dx,y:t.y+dy};if(tile.x<0||tile.y<0||tile.x>=64||tile.y>=64)continue;
      const key=`${tile.face}/${tile.x}/${tile.y}`;if(!cache.has(key))cache.set(key,buildTile(body,tile));
      result.push(contactGeometry(cache.get(key),[0,0,0,0],radiusM,origin,key));
    }return result;
  };
  for(let i=0;i<180;i++)walker.update(1/60,heading,new Set(),patches);
  for(let i=0;i<720;i++)walker.update(1/60,heading,new Set(['w','shift']),patches);
  const end=walker.position.clone().normalize();
  assert.ok(end.y*radiusM<-49,'capsule stopped at the dry side of the river');
  assert.equal(surfaceQuery(body)(end.toArray()).walkable,true);walker.dispose();
});
