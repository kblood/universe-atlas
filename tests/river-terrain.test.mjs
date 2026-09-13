import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {baseTerrainSampler,terrainSampler,planetSurface} from '../src/terrain.ts';
import {buildTile,directionTile,tileDirection,tileNeighbour,unit,regionalBankWeights,PATCH_SEGMENTS} from '../src/planet-tiles.ts';
import {contactGeometry} from '../src/terrain-contact.ts';
import {surfaceQuery} from '../src/world-surface.ts';
import {GroundWalker,initWalking} from '../src/ground-walker.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {buildDrainage} from '../src/drainage.ts';
import {buildRiverRegion,riverDirection} from '../src/river-generation.ts';
import {conservativeRiverBedM,riverFeatureAt,samplePhysicalRiverRegion,sampleRiverRegion} from '../src/river-sample.ts';
import {riverPhysicalField} from '../src/river-physical-field.ts';
import {regionalLandformHeight} from '../src/regional-landform.ts';

const radiusM=10000;
const region={version:'river-region-1',id:'test/drainage-1/river-region-1',parentCatchmentId:'test/drainage-1',bodyId:'test',bodySeed:'river-terrain',radiusM,
  origin:[1,0,0],east:[0,0,1],north:[0,1,0],boundsM:[-800,-800,800,800],
  channels:[{id:'main',name:'Main',parentId:null,points:[{x:-700,z:0,waterM:30,widthM:100,depthM:12,distanceM:0},{x:700,z:0,waterM:0,widthM:100,depthM:12,distanceM:1400}]}],
  lakes:[{id:'lake',name:'Lake',x:350,z:320,radiusXM:130,radiusZM:100,angle:0,waterM:50,depthM:10}],sites:[],stats:{samples:1,lengthM:1400,maxCutM:20,maxFillM:0,buildAlgorithm:'test'}};
const baseBody={id:'test',name:'Test',seed:'river-terrain',kind:'planet',type:'Terrestrial world',parentId:'star',massKg:5.972e18,radiusM,temperatureK:290,color:'#3985ae',orbit:null,water:0,rings:false};
const body={...baseBody,hydrology:region};
const direction=(x,z)=>unit([1,z/radiusM,x/radiusM]);
const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
const subtract=(a,b)=>a.map((value,i)=>value-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Radial intersection with a base-grid terrain triangle, independent of the
 * renderer and Rapier. It measures the mesh the contact collider receives. */
const tileTriangleHeight=(data,d,radius,positions=data.positions)=>{
  for(let k=0;k<PATCH_SEGMENTS*PATCH_SEGMENTS*6;k+=3){
    const ids=[data.indices[k],data.indices[k+1],data.indices[k+2]],point=i=>[0,1,2].map(j=>positions[i*3+j]+data.anchor[j]),[a,b,c]=ids.map(point),normal=cross(subtract(b,a),subtract(c,a)),distance=dot(normal,a)/dot(normal,d);
    if(distance<=0)continue;
    const hit=d.map(value=>value*distance),ab=subtract(b,a),ac=subtract(c,a),ah=subtract(hit,a),denominator=dot(ab,ab)*dot(ac,ac)-dot(ab,ac)**2,u=(dot(ah,ab)*dot(ac,ac)-dot(ah,ac)*dot(ab,ac))/denominator,v=(dot(ah,ac)*dot(ab,ab)-dot(ah,ab)*dot(ab,ac))/denominator;
    if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)return (distance-1)*radius;
  }
  throw new Error('radial ray missed tile base grid');
};

test('hydrology leaves the baseline sampler unchanged outside its regional influence',()=>{
  const old=baseTerrainSampler(baseBody),plain=terrainSampler(baseBody),river=terrainSampler(body);
  for(const d of [[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
    assert.deepEqual(plain(d),{...old(d),rockHeightM:old(d).elevationM,waterLevelM:old(d).ocean?0:null,visibleHeightM:old(d).ocean?0:old(d).elevationM,groundHeightM:old(d).elevationM,waterHeightM:old(d).ocean?0:null,waterDepthM:old(d).ocean?Math.max(0,-old(d).elevationM):0,wet:old(d).ocean,waterKind:null,bank:0,channelId:null,flow:[0,0],influence:0});
    assert.deepEqual(river(d),plain(d));
  }
});

test('physical sampler shares canonical wet triangles and their bounded dry-bank field',()=>{
  const field=riverPhysicalField(region);assert.equal(field.rejected,null);assert.ok(field.surface.indices.length>0&&field.bank);
  for(let triangle=0;triangle<field.surface.indices.length/3;triangle+=Math.max(1,Math.floor(field.surface.indices.length/21))){const ids=[field.surface.indices[triangle*3],field.surface.indices[triangle*3+1],field.surface.indices[triangle*3+2]],x=ids.reduce((sum,id)=>sum+field.surface.positions[id*2],0)/3,z=ids.reduce((sum,id)=>sum+field.surface.positions[id*2+1],0)/3,canonical=field.surface.query(x,z),sample=samplePhysicalRiverRegion(region,direction(x,z),100);assert.ok(canonical?.wet&&sample.wet);assert.ok(Math.abs(sample.waterLevelM-canonical.waterM)<1e-5);assert.ok(Math.abs(sample.rockHeightM-(canonical.waterM-canonical.depthM))<1e-5);assert.equal(sample.channelId,canonical.sourceId);}
  const dry=samplePhysicalRiverRegion(region,direction(0,50.01),100),nearest=field.bank.query(0,50.01,3000);assert.ok(nearest&&!dry.wet&&dry.influence>0);const corridor=Math.max(100,Math.min(3000,Math.abs(100-nearest.waterM)*4)),t=Math.max(0,Math.min(1,nearest.distanceM/corridor)),expected=(nearest.waterM-nearest.depthM)+(100-(nearest.waterM-nearest.depthM))*(t*t*(3-2*t));assert.ok(Math.abs(dry.rockHeightM-expected)<1e-7);assert.deepEqual(samplePhysicalRiverRegion(region,[-1,0,0],123),{rockHeightM:123,waterLevelM:null,wet:false,bank:0,channelId:null,waterKind:null,flow:[0,0],influence:0});
});

test('canonical outer banks stay continuous around a bend and confluence',()=>{
  const joined={...region,id:'joined',lakes:[],channels:[{id:'main',name:'main',parentId:null,points:[{x:-500,z:-120,waterM:30,widthM:40,depthM:8,distanceM:0},{x:0,z:-120,waterM:25,widthM:40,depthM:8,distanceM:500},{x:140,z:120,waterM:20,widthM:46,depthM:8,distanceM:780}]},{id:'tributary',name:'tributary',parentId:'main',points:[{x:-100,z:220,waterM:32,widthM:28,depthM:6,distanceM:0},{x:0,z:-120,waterM:25,widthM:40,depthM:8,distanceM:360}]}]},field=riverPhysicalField(joined),edges=new Map();assert.equal(field.rejected,null);for(let i=0;i<field.surface.indices.length;i+=3)for(const [a,b] of [[field.surface.indices[i],field.surface.indices[i+1]],[field.surface.indices[i+1],field.surface.indices[i+2]],[field.surface.indices[i+2],field.surface.indices[i]]]){const key=a<b?a+'/'+b:b+'/'+a,entry=edges.get(key)||{a,b,count:0};entry.count++;edges.set(key,entry);}let measured=0;for(const edge of edges.values()){if(edge.count!==1||measured>=48)continue;const ax=field.surface.positions[edge.a*2],az=field.surface.positions[edge.a*2+1],bx=field.surface.positions[edge.b*2],bz=field.surface.positions[edge.b*2+1],mx=(ax+bx)/2,mz=(az+bz)/2,dx=bx-ax,dz=bz-az,n=Math.hypot(dx,dz)||1;for(const side of [-1,1]){const x=mx-dz/n*side*.02,z=mz+dx/n*side*.02,wet=field.surface.query(mx+dz/n*side*.02,mz-dx/n*side*.02),dry=samplePhysicalRiverRegion(joined,direction(x,z),100);if(!wet||dry.wet)continue;assert.ok(Math.abs(dry.rockHeightM-wet.waterM)<.02,'canonical wet edge meets its dry bank');assert.ok(dry.rockHeightM>=wet.waterM-.01);measured++;break;}}assert.ok(measured>=12,'measured outer bend/confluence boundaries');
});

test('inland water keeps a carved rock field and a separate visible water surface',()=>{
  const s=terrainSampler(body)(direction(0,0)),q=surfaceQuery(body)(direction(0,0));
  assert.equal(s.ocean,false);assert.equal(s.wet,true);assert.equal(s.waterKind,'river');
  assert.ok(s.waterLevelM!==null&&s.rockHeightM<s.waterLevelM);
  assert.equal(s.visibleHeightM,s.waterLevelM);assert.equal(q.visibleHeightM,s.visibleHeightM);
  assert.equal(s.groundHeightM,s.rockHeightM);assert.equal(s.waterHeightM,s.waterLevelM);
  assert.equal(s.waterDepthM,s.waterHeightM-s.groundHeightM);
  assert.equal(q.walkable,false);assert.equal(q.ocean,false);
  const lake=surfaceQuery(body)(direction(350,320));assert.equal(lake.waterKind,'lake');assert.equal(lake.walkable,false);
  assert.equal(q.geologyVersion,'terrain-1.2.0');assert.equal(q.regionalGeologyVersion,'river-region-1');
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

test('orbit preview retains its palette while terrain tiles use opaque ground substrate',()=>{
  const temperate={...body,seed:'season-3',water:.65,hydrology:{...region,bodySeed:'season-3'}},sample=terrainSampler(temperate);
  const tile=directionTile(direction(0,150),6),data=buildTile(temperate,tile),size=data.width,x=32,y=32;
  const tileDirectionAtTexel=tileDirection(tile,(x-.5)/64,(y-.5)/64),tileSample=sample(tileDirectionAtTexel);
  const texel=Array.from(data.color.slice((y*size+x)*4,(y*size+x+1)*4));
  assert.equal(texel[3],255);assert.ok(texel.slice(0,3).every(value=>value>=0&&value<=255));
  const preview=planetSurface(temperate,128,40);let found=false;
  for(let py=0;py<preview.height&&!found;py++)for(let px=0;px<preview.width;px++){
    const theta=((px+.5)/preview.width)*Math.PI*2,phi=((py+.5)/preview.height)*Math.PI,d=[-Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)],s=sample(d);
    if(s.influence<=0||s.wet)continue;
    assert.deepEqual(Array.from(preview.data.slice((py*preview.width+px)*4,(py*preview.width+px+1)*4)),[...s.color.map(Math.floor),255]);found=true;
  }
  assert.equal(found,true,'preview resolution samples the regional dry bank');
});

test('tile colour is opaque ground substrate for inland water, dry bank and ocean bed',()=>{
  const inland=buildTile(body,directionTile(direction(0,0),6));
  const alpha=(data,x,y)=>data.color[(y*data.width+x)*4+3];
  assert.ok(inland.color.every((value,index)=>index%4!==3||value===255),'inland bed never masks coverage through alpha');
  const dry=buildTile(body,directionTile(direction(0,150),6));
  assert.equal(alpha(dry,32,32),255,'dry regional bank preserves the opaque terrain byte');
  const oceanBody={...baseBody,water:.8,hydrology:undefined};
  const ocean=buildTile(oceanBody,directionTile([1,0,0],6));
  assert.ok(ocean.color.every((value,index)=>index%4!==3||value===255),'baseline ocean preserves opaque colour-map bytes');
});

test('Maithea Orien Delta lake collar is continuous across lake and nearby river edges',()=>{
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1],catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===23165);
  assert.ok(catchment);const regional=buildRiverRegion(maithea,catchment),lake=regional.lakes[0],baseline=terrainSampler(maithea);
  assert.equal(regional.id,'G001/C2128,0,1/0/planet/1/drainage-1/n64/outlet/23165/river-region-1');assert.equal(createHash('sha256').update(JSON.stringify(regional)).digest('hex'),'603266aec921d8c83b857eb5b530309a09ac32841f9d6ac531e397842758e263','surface correction preserves the stored river-region-1 export');assert.equal(JSON.stringify(buildRiverRegion(maithea,catchment)),JSON.stringify(regional),'surface correction keeps canonical construction deterministic');
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

test('tiles and contact patches use the ground bed while wet blocking retains visible water',()=>{
  const tile=directionTile(direction(0,0),6),data=buildTile(body,tile),contact=contactGeometry(data,[0,0,0,0],radiusM,[0,0,0],'river');
  for(const i of [0,16,32,16*33+16,32*33+32]){
    const d=tileDirection(tile,(i%33)/32,Math.floor(i/33)/32),s=terrainSampler(body)(d);
    const tilePoint=[0,1,2].map(j=>(data.positions[i*3+j]+data.anchor[j])*radiusM);
    const contactPoint=[0,1,2].map(j=>contact.positions[i*3+j]);
    assert.ok(Math.hypot(...tilePoint)-radiusM<=s.groundHeightM+.02,'coarse envelope only lowers the analytic bed');
    assert.ok(Math.hypot(...tilePoint.map((v,j)=>v-contactPoint[j]))<.02);
  }
});

test('synthetic sloping lake shore has a submerged bed, separate water grid and no alpha coverage hole',()=>{
  const tile=directionTile(direction(350,320),6),data=buildTile(body,tile),n=PATCH_SEGMENTS,stride=n+1;
  const nearest=[...Array(stride*stride).keys()].map(i=>({i,d:tileDirection(tile,(i%stride)/n,Math.floor(i/stride)/n)})).sort((a,b)=>Math.acos(a.d[0]*direction(350,320)[0]+a.d[1]*direction(350,320)[1]+a.d[2]*direction(350,320)[2])-Math.acos(b.d[0]*direction(350,320)[0]+b.d[1]*direction(350,320)[1]+b.d[2]*direction(350,320)[2]))[0];
  const s=terrainSampler(body)(nearest.d),i=nearest.i;
  assert.ok(s.wet&&s.waterDepthM>0,'fixture selects a lake bed');
  assert.ok(data.oceanPositions===undefined,'inland water is not conflated with global ocean');
  assert.ok(data.surfaceHeight[i]<=s.groundHeightM+.001,'coarse wet envelope only lowers the bed');
  assert.ok(data.color.every((value,index)=>index%4!==3||value===255),'opaque terrain cannot create a shoreline alpha hole');
  assert.equal(surfaceQuery(body)(nearest.d).walkable,false,'wetness remains a query rule rather than terrain elevation');
});

test('ocean grids share the terrain anchor and base topology without skirts',()=>{
  const oceanBody={...baseBody,water:.8},data=buildTile(oceanBody,{face:0,level:3,x:2,y:2}),baseVertices=(PATCH_SEGMENTS+1)**2;
  assert.ok(data.oceanPositions&&data.oceanParents);
  assert.equal(data.oceanPositions.length,baseVertices*3);assert.equal(data.oceanParents.length,baseVertices*3);
  assert.equal(data.indices.slice(0,PATCH_SEGMENTS*PATCH_SEGMENTS*6).length,PATCH_SEGMENTS*PATCH_SEGMENTS*6);
  for(let i=0;i<baseVertices;i++)assert.ok(Math.abs(Math.hypot(...[0,1,2].map(j=>data.oceanPositions[i*3+j]+data.anchor[j]))-1)<1e-6);
});

test('hydrology fine contact mesh remains within two centimetres across the saved dry-bank failure fixture',()=>{
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1],catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===23165);
  assert.ok(catchment);const regional=buildRiverRegion(maithea,catchment),fixture={...maithea,hydrology:regional},radius=fixture.radiusM,centre=unit([-795709.2257620192,1391499.6290880316,-4941536.491626542]),east=unit([-centre[2],0,centre[0]]),north=unit(cross(centre,east)),query=surfaceQuery(fixture),cache=new Map();
  let drySamples=0;
  for(const x of [-1,-.5,0,.5,1])for(const y of [-1,-.5,0,.5,1]){
    const d=unit(centre.map((value,i)=>value+(east[i]*x+north[i]*y)/radius)),s=query(d);
    if(s.wet)continue;
    drySamples++;
    const tile=directionTile(d,22),key=`${tile.face}/${tile.level}/${tile.x}/${tile.y}`;
    if(!cache.has(key))cache.set(key,buildTile(fixture,tile));
    assert.ok(Math.abs(tileTriangleHeight(cache.get(key),d,radius)-s.groundHeightM)<.02,`fine contact mesh agrees at ${x},${y} m`);
  }
  assert.ok(drySamples>0,'fixture includes dry-bank samples within the one-metre contact neighbourhood');
});

test('Maithea coarse child and parent triangles conservatively expose authored river water',()=>{
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1],catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===23165);
  assert.ok(catchment);const regional=buildRiverRegion(maithea,catchment),fixture={...maithea,hydrology:regional},cache=new Map();
  let measured=0;
  for(const channel of regional.channels){const stride=Math.max(1,Math.ceil((channel.points.length-1)/32));for(let i=0;i<channel.points.length-1;i+=stride){
    const a=channel.points[i],b=channel.points[i+1],x=(a.x+b.x)/2,z=(a.z+b.z)/2,water=(a.waterM+b.waterM)/2,d=riverDirection(regional,x,z),tile=directionTile(d,12),key=`${tile.face}/${tile.level}/${tile.x}/${tile.y}`;
    if(!cache.has(key))cache.set(key,buildTile(fixture,tile));const data=cache.get(key);
    assert.ok(tileTriangleHeight(data,d,fixture.radiusM)<=water+.001,`child bed covers ${channel.id}/${i}`);
    assert.ok(tileTriangleHeight(data,d,fixture.radiusM,data.parents)<=water+.001,`parent morph bed covers ${channel.id}/${i}`);measured++;
  }}
  assert.ok(measured>40);assert.ok(cache.size>1,'coverage spans streamed tile chunks');
});

test('coarse wet envelope agrees across the cube-face boundary',()=>{
  const seamOrigin=unit([1,1,0]),seamRegion={...region,origin:seamOrigin,east:[0,0,-1],north:unit([-1,1,0]),lakes:[],channels:[{...region.channels[0],points:[{x:-1000,z:0,waterM:30,widthM:100,depthM:12,distanceM:0},{x:1000,z:0,waterM:0,widthM:100,depthM:12,distanceM:2000}]}]},seamBody={...body,hydrology:seamRegion},level=6,n=2**level,k=n/2,a=buildTile(seamBody,{face:0,level,x:k,y:n-1}),b=buildTile(seamBody,{face:2,level,x:n-1,y:k}),stride=PATCH_SEGMENTS+1;
  for(let i=0;i<=PATCH_SEGMENTS;i++)for(const field of ['positions','parents']){
    const ai=(PATCH_SEGMENTS*stride+i)*3,bi=(i*stride+PATCH_SEGMENTS)*3,pa=[0,1,2].map(j=>a[field][ai+j]+a.anchor[j]),pb=[0,1,2].map(j=>b[field][bi+j]+b.anchor[j]);
    assert.ok(Math.hypot(...pa.map((v,j)=>v-pb[j]))<2e-6,`${field} cube seam ${i}`);
  }
});

test('coarse envelope includes every overlapping channel bed at a junction',()=>{
  const junction={...region,boundsM:[-300,-300,300,300],lakes:[],channels:[
    {id:'low-main',name:'Low main',parentId:null,points:[{x:-160,z:0,waterM:10,widthM:14,depthM:5,distanceM:0},{x:160,z:0,waterM:10,widthM:14,depthM:5,distanceM:320}]},
    {id:'high-tributary',name:'High tributary',parentId:'low-main',points:[{x:0,z:120,waterM:90,widthM:14,depthM:5,distanceM:0},{x:0,z:0,waterM:10,widthM:14,depthM:5,distanceM:120}]},
  ]},largeRadius=5_194_907,fixture={...body,radiusM:largeRadius,hydrology:{...junction,radiusM:largeRadius}},localDirection=(x,z)=>unit([1,z/largeRadius,x/largeRadius]),d=localDirection(0,20),tile=directionTile(d,12),data=buildTile(fixture,tile);
  // At this point the high tributary is nearest, but the low main is also
  // inside the coarse footprint. The aggregate must return the low bed.
  assert.equal(conservativeRiverBedM(junction,d,230),5);
  assert.ok(Math.min(...data.surfaceHeight)<=5,'child lattice contains the low overlapping bed');
  assert.ok(Math.min(...data.parentHeight)<=5,'parent lattice contains the low overlapping bed');
});

test('conservative lake envelope avoids a circular short-axis moat',()=>{
  const ellipse={...region,lakes:[{...region.lakes[0],radiusXM:420,radiusZM:610,angle:0,x:0,z:0,waterM:30,depthM:5}],channels:[]},d=direction(500,0);
  assert.equal(conservativeRiverBedM(ellipse,d,10),null,'80 m outside the short ellipse axis is not inside a 10 m envelope');
});

test('regional landform uses wet-edge distance across unequal-width channel bisectors',()=>{
  const parallel={...region,boundsM:[-300,-300,300,300],lakes:[],channels:[
    {id:'narrow',name:'Narrow',parentId:null,points:[{x:-200,z:-55,waterM:20,widthM:20,depthM:4,distanceM:0},{x:200,z:-55,waterM:20,widthM:20,depthM:4,distanceM:400}]},
    {id:'wide',name:'Wide',parentId:null,points:[{x:-200,z:55,waterM:20,widthM:100,depthM:4,distanceM:0},{x:200,z:55,waterM:20,widthM:100,depthM:4,distanceM:400}]},
  ]},a=riverFeatureAt(parallel,direction(0,-8)),b=riverFeatureAt(parallel,direction(0,-7.99)),ha=regionalLandformHeight(parallel,direction(0,-8),100),hb=regionalLandformHeight(parallel,direction(0,-7.99),100);
  assert.equal(a?.kind,'river');assert.equal(b?.kind,'river');assert.ok(Math.abs(ha-hb)<.02,'edge-distance selection has no dry-land height step at the bisector');
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

test('Maithea carved-envelope normals remain continuous across a streamed hydrology edge',()=>{
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1],catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===23165),fixture={...maithea,hydrology:buildRiverRegion(maithea,catchment)},lake=fixture.hydrology.lakes[0],d=riverDirection(fixture.hydrology,lake.x,lake.z),tile=directionTile(d,12),other=tileNeighbour(tile,0),a=buildTile(fixture,tile),b=buildTile(fixture,other),stride=PATCH_SEGMENTS+1;
  for(let y=0;y<=PATCH_SEGMENTS;y++){const direction=tileDirection(tile,0,y/PATCH_SEGMENTS);let match=0,best=-Infinity;for(let i=0;i<stride*stride;i++){const q=tileDirection(other,(i%stride)/PATCH_SEGMENTS,Math.floor(i/stride)/PATCH_SEGMENTS),dot=direction[0]*q[0]+direction[1]*q[1]+direction[2]*q[2];if(dot>best){best=dot;match=i;}}assert.ok(1-best<1e-14);const ai=(y*stride)*3,bi=match*3,delta=Math.hypot(...[0,1,2].map(j=>a.normals[ai+j]-b.normals[bi+j]));assert.ok(delta<2e-6,`normal seam ${y}`);}
});
test('coarse envelope preserves its full bed core and fades continuously through the bounded apron',()=>{
  const footprint=100,base=100,core=conservativeRiverBedM(region,direction(0,150),footprint,base),justOutside=conservativeRiverBedM(region,direction(0,150.1),footprint,base),mid=conservativeRiverBedM(region,direction(0,175),footprint,base),support=conservativeRiverBedM(region,direction(0,-270),footprint,base);
  assert.equal(core,-12,'inside the conservative footprint retains the authored full bed');assert.ok(justOutside!==null&&Math.abs(justOutside-core)<.02,'apron starts with zero slope at the core boundary');assert.ok(mid!==null&&mid>core&&mid<base,'outer apron only lowers toward the baseline');assert.equal(support,null,'queries outside the bounded 2x footprint support remain untouched');
});





test('single coarse envelope stays continuous where a higher core overlaps a lower parallel apron',()=>{
  const parallel={...region,lakes:[],channels:[
    {id:'high',name:'high',parentId:null,points:[{x:-700,z:0,waterM:100,widthM:20,depthM:10,distanceM:0},{x:700,z:0,waterM:100,widthM:20,depthM:10,distanceM:1400}]},
    {id:'low',name:'low',parentId:null,points:[{x:-700,z:300,waterM:0,widthM:20,depthM:10,distanceM:0},{x:700,z:300,waterM:0,widthM:20,depthM:10,distanceM:1400}]}
  ]},footprint=100,base=100,left=conservativeRiverBedM(parallel,direction(0,109.999),footprint,base),right=conservativeRiverBedM(parallel,direction(0,110.001),footprint,base),lowerApron=conservativeRiverBedM({...parallel,channels:[parallel.channels[1]]},direction(0,110),footprint,base),highCore=90;
  assert.ok(left!==null&&right!==null&&lowerApron!==null);assert.ok(Math.abs(left-right)<.01,'minimum of core and apron has no boundary step');assert.ok(left<=highCore&&right<=highCore,'higher core remains conservatively covered');assert.ok(left<=lowerApron+.01&&right<=lowerApron+.01,'lower overlapping apron remains conservatively covered');
});
