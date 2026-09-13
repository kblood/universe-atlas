import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RiverWater} from '../src/river-water.ts';
import {riverPhysicalField} from '../src/river-physical-field.ts';
import {createOceanWaterMaterial,setOceanWaterDebug,setOceanWaterPatchFrame} from '../src/ocean-water-material.ts';
import {acquireWaterNormalAtlas,canonicalWaterAtlasUv,createWaterNormalAtlasPixels,releaseWaterNormalAtlas,SHARED_WATER_NORMAL_ATLAS_BYTES,WATER_NORMAL_ATLAS_METRES_PER_REPEAT,waterNormalAtlasDiagnostics,waterNormalSlope} from '../src/water-normal-atlas.ts';
const body={id:'water',name:'Water',seed:'water',kind:'planet',type:'Terrestrial world',parentId:'s',massKg:1,radiusM:6_371_000,temperatureK:288,color:'#fff',orbit:null,water:.6,rings:false};
const region={version:'river-region-1',id:'c/river-region-1',parentCatchmentId:'c',bodyId:'water',bodySeed:'water',radiusM:body.radiusM,origin:[0,1,0],east:[1,0,0],north:[0,0,-1],boundsM:[-2000,-2000,2000,2000],channels:[{id:'main',name:'Main',parentId:null,points:[{x:-1000,z:0,waterM:40,widthM:80,depthM:8,distanceM:0},{x:0,z:100,waterM:20,widthM:100,depthM:9,distanceM:1000},{x:1000,z:0,waterM:0,widthM:120,depthM:10,distanceM:2000}]}],lakes:[{id:'lake',name:'Lake',x:-500,z:700,radiusXM:300,radiusZM:160,angle:.2,waterM:35,depthM:12}],sites:[],stats:{samples:3,lengthM:2000,maxCutM:1,maxFillM:1,buildAlgorithm:'fixture'}};
test('water uses finite outward-wound indexed local geometry',()=>{const water=new RiverWater(body,region);for(const mesh of water.group.children){const p=mesh.geometry.getAttribute('position'),i=mesh.geometry.index;assert.ok(i&&p.count>2);for(const v of p.array)assert.ok(Number.isFinite(v));for(let q=0;q<i.count;q+=3){const a=new Float32Array(p.array.slice(i.getX(q)*3,i.getX(q)*3+3)),b=new Float32Array(p.array.slice(i.getX(q+1)*3,i.getX(q+1)*3+3)),c=new Float32Array(p.array.slice(i.getX(q+2)*3,i.getX(q+2)*3+3));const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],anchor=mesh.position;assert.ok(n[0]*anchor.x+n[1]*anchor.y+n[2]*anchor.z>=-1e-12);}}water.dispose();assert.equal(water.group.children.length,0);});
test('canonical river render barycentres interpolate physical query water and depth',()=>{const dry={...region,lakes:[]},field=riverPhysicalField(dry),water=new RiverWater(body,dry);let checked=0;for(const mesh of water.group.children.filter(m=>m.userData.water.kind==='river')){const g=mesh.geometry,i=g.index,coord=g.getAttribute('waterCoord'),height=g.getAttribute('waterHeight'),depth=g.getAttribute('waterDepth');for(let n=0;n<i.count;n+=3){const a=i.getX(n),b=i.getX(n+1),c=i.getX(n+2),x=(coord.getX(a)+coord.getX(b)+coord.getX(c))/3,z=(coord.getY(a)+coord.getY(b)+coord.getY(c))/3,q=field.surface.query(x,z);assert.ok(q);assert.ok(Math.abs(q.waterM-(height.getX(a)+height.getX(b)+height.getX(c))/3)<1e-4);assert.ok(Math.abs(q.depthM-(depth.getX(a)+depth.getX(b)+depth.getX(c))/3)<1e-4);checked++;}}assert.ok(checked>0);water.dispose();});
test('physical buckets merge without dropping coverage beyond the draw cap',()=>{const channels=Array.from({length:70},(_,i)=>({id:`b${i}`,name:'b',parentId:null,points:[{x:i*4100,z:0,widthM:8,waterM:10,depthM:2,distanceM:0},{x:i*4100+80,z:0,widthM:8,waterM:10,depthM:2,distanceM:80}]})),wide={...region,boundsM:[-100,-100,70*4100+100,100],channels,lakes:[]},field=riverPhysicalField(wide),water=new RiverWater(body,wide),river=water.group.children.filter(m=>m.userData.water.kind==='river'),rendered=river.reduce((n,m)=>n+m.geometry.index.count,0);assert.equal(water.diagnostics().rejected,null);assert.ok(river.length<=64&&water.diagnostics().resident<=64);assert.equal(rendered,field.surface.indices.length);assert.ok(water.diagnostics().accountedBytes<=16*1024*1024);water.dispose();});
test('water culls from body-relative eye and remains within its budgets',()=>{const water=new RiverWater(body,region);water.update([0,1.01,0],[1,0,0],2,1.3);const d=water.diagnostics();assert.ok(d.draws<=64&&d.resident<=64&&d.accountedBytes<=d.budgetBytes);water.dispose();assert.equal(water.diagnostics().resident,0);});
test('elevated physical chunks retain conservative double-precision angular bounds',()=>{const high={...region,lakes:[],channels:[{...region.channels[0],points:[{...region.channels[0].points[0],x:-2000,waterM:1000},{...region.channels[0].points[1],x:2000,waterM:1000}]}]},water=new RiverWater(body,high);try{const chunks=water.chunks;assert.ok(chunks.length);for(const c of chunks){assert.ok(c.radius>0);const data=c.mesh.geometry.getAttribute('position');for(let i=0;i<data.count;i++){let x=c.mesh.position.x+data.getX(i),y=c.mesh.position.y+data.getY(i),z=c.mesh.position.z+data.getZ(i),n=Math.hypot(x,y,z);x/=n;y/=n;z/=n;const angle=Math.acos(Math.max(-1,Math.min(1,c.center[0]*x+c.center[1]*y+c.center[2]*z)));assert.ok(angle<=c.radius+1e-8);}}}finally{water.dispose();}});
test('lake perimeter uses <=16 m chords and impossible complete coverage rejects explicitly',()=>{const water=new RiverWater(body,region),lake=water.group.children.at(-1).geometry,outer=300,sides=Math.ceil(2*Math.PI*outer/16),rings=Math.ceil(outer/16),coords=lake.getAttribute('waterCoord');assert.ok(lake.getAttribute('position').count>100,'rings replace a coarse lake fan');const first=1+(rings-1)*sides;for(let i=0;i<sides;i++){const a=first+i,b=first+(i+1)%sides,dx=coords.getX(a)-coords.getX(b),dz=coords.getY(a)-coords.getY(b);assert.ok(Math.hypot(dx,dz)<=16.000001,'perimeter chord stays below the shoreline precision limit');}water.dispose();const tooMany={...region,lakes:Array.from({length:65},(_,i)=>({...region.lakes[0],id:'l'+i}))};const rejected=new RiverWater(body,tooMany);assert.equal(rejected.group.children.length,0);assert.match(rejected.diagnostics().rejected,/64 complete chunks/);const fullLakes={...region,lakes:Array.from({length:64},(_,i)=>({...region.lakes[0],id:'f'+i}))};assert.doesNotThrow(()=>new RiverWater(body,fullLakes));assert.match(new RiverWater(body,fullLakes).diagnostics().rejected,/64 complete chunks/);const huge=new RiverWater(body,{...region,lakes:[{...region.lakes[0],radiusXM:20_000,radiusZM:20_000}]});assert.match(huge.diagnostics().rejected,/16 MiB/);});
test('zero-width source and ocean mouth remain finite without widening the channel',()=>{const points=region.channels[0].points.map((p,i)=>({...p,widthM:i===0||i===2?0:p.widthM,waterM:i===2?0:p.waterM})),water=new RiverWater(body,{...region,channels:[{...region.channels[0],points}]});for(const mesh of water.group.children){for(const v of mesh.geometry.getAttribute('position').array)assert.ok(Number.isFinite(v));}assert.equal(water.diagnostics().rejected,null);water.dispose();});
test('lake fragment ownership keeps boundary-crossing river coverage outside its ellipse',()=>{
  const crossing={...region,channels:[{...region.channels[0],points:[{x:-900,z:700,waterM:35,widthM:80,depthM:6,distanceM:0},{x:900,z:700,waterM:35,widthM:80,depthM:6,distanceM:1800}]}]};
  const water=new RiverWater(body,crossing),river=water.group.children.find(m=>m.userData.water.kind==='river'),lake=water.group.children.find(m=>m.userData.water.kind==='lake');
  assert.ok(river&&lake);assert.ok(river.geometry.index.count>0,'the canonical physical surface retains complete wet coverage up to the exact shoreline');
  const ellipse=river.material.uniforms.lakeEllipse.value[0],rotation=river.material.uniforms.lakeRotation.value[0],contains=(x,z)=>{const dx=x-ellipse.x,dz=z-ellipse.y,u=(dx*rotation.x+dz*rotation.y)/ellipse.z,v=(-dx*rotation.y+dz*rotation.x)/ellipse.w;return u*u+v*v<=1;};
  assert.equal(contains(-500,700),true);assert.equal(contains(-900,700),false);assert.match(river.material.fragmentShader,/const int LAKE_COUNT=1/);
  for(const mesh of water.group.children){for(const name of ['waterCoord','waterDepth','shoreDistance','flowVector']){const attribute=mesh.geometry.getAttribute(name);assert.ok(attribute&&attribute.count>0,`${name} is baked per vertex`);for(const v of attribute.array)assert.ok(Number.isFinite(v));}}
  const depths=river.geometry.getAttribute('waterDepth').array;assert.equal(Math.min(...depths),0);assert.ok(Math.max(...depths)>=6,'channel centre preserves authored depth');
  const shader=river.material.fragmentShader;assert.match(shader,/waterCoordV/);assert.match(shader,/dot\(q,q\)<=1\.0\)discard/);assert.match(shader,/fresnel/);assert.match(shader,/reflect\(-view,n\),base/);assert.match(shader,/dFdx\(waterCoordV\)/);assert.match(shader,/waterNormalAtlas/);assert.match(shader,/atlasA/);assert.match(shader,/waterNormalRepeatM/);assert.match(shader,/\.020\+\.980/);assert.match(shader,/waterDepthV/);assert.match(shader,/eyeRelative-waterLocalPosition/);assert.doesNotMatch(shader,/waterUv/);assert.equal(water.completeCoverage(),true);water.dispose();assert.equal(water.completeCoverage(),false);
});
test('inland water has no surface lift and exposes frozen flat/depth diagnostics',()=>{
  const water=new RiverWater(body,region),river=water.group.children.find(m=>m.userData.water.kind==='river');
  assert.ok(river);assert.doesNotMatch(river.material.vertexShader,/waterBias|WATER_BIAS/);
  assert.match(river.material.vertexShader,/waterHeight\*\(waterRelief-1\.0\)/);
  water.update([0,1.01,0],[1,0,0],7,1);water.setDebug({freezeWater:true,flat:true,depth:true});water.update([0,1.01,0],[1,0,0],19,1);
  assert.equal(river.material.uniforms.waterTime.value,7);assert.equal(river.material.uniforms.waterFlat.value,1);assert.equal(river.material.uniforms.waterDepthDebug.value,1);
  water.dispose();
});
test('ocean material shares terrain morph exactly and keeps frame values local',()=>{
  const morph={value:.25},edges={value:{x:1,y:0,z:1,w:0}},texels={value:64};
  const ocean=createOceanWaterMaterial({radiusM:body.radiusM,normalAnchorDir:[0,1,0],phaseOriginM:[31,0,-17],patchMorph:morph,patchEdges:edges,patchTexels:texels});
  assert.equal(ocean.uniforms.patchMorph,morph);assert.equal(ocean.uniforms.patchEdges,edges);assert.equal(ocean.uniforms.patchTexels,texels);
  assert.match(ocean.vertexShader,/mix\(parentPosition,position,patchMorph\*\(1\.0-lockEdge\)\)/);
  assert.doesNotMatch(ocean.vertexShader,/normalize\(transformed\)|oceanBias|waterBias/);
  assert.match(ocean.fragmentShader,/oceanWater marker/);
  assert.match(ocean.fragmentShader,/modulo 4096 m/);assert.match(ocean.fragmentShader,/eastLength>.01\?eastCandidate\/eastLength/);
  assert.ok(ocean.fragmentShader.indexOf('#include <logdepthbuf_fragment>')<ocean.fragmentShader.indexOf('if(oceanDepthDebug>.5)'),'debug views retain logarithmic depth');
  setOceanWaterPatchFrame(ocean,{localEyeM:[12,3,-8],sunDirection:[1,2,3],timeSeconds:4});
  assert.deepEqual(ocean.uniforms.oceanEyeM.value.toArray(),[12,3,-8]);assert.equal(ocean.uniforms.oceanTime.value,4);
  setOceanWaterDebug(ocean,{freezeWater:true,flat:true,depth:true});setOceanWaterPatchFrame(ocean,{localEyeM:[2,4,6],sunDirection:[0,1,0],timeSeconds:9});
  assert.equal(ocean.uniforms.oceanTime.value,4);assert.equal(ocean.uniforms.oceanFlat.value,1);assert.equal(ocean.uniforms.oceanDepthDebug.value,1);ocean.dispose();ocean.dispose();assert.equal(waterNormalAtlasDiagnostics().references,0);
});
test('shared water normal atlas is deterministic, canonical-periodic and released after its final user',()=>{
  const first=createWaterNormalAtlasPixels(),second=createWaterNormalAtlasPixels();assert.deepEqual(first,second);assert.equal(first.length,128*128*4);assert.equal(WATER_NORMAL_ATLAS_METRES_PER_REPEAT,16);assert.ok(SHARED_WATER_NORMAL_ATLAS_BYTES>first.byteLength*2);
  for(const phase of [1,.5,8])assert.deepEqual(canonicalWaterAtlasUv(37,-91,phase),canonicalWaterAtlasUv(37+4096,-91-4096,phase));
  for(const [u,v] of [[.37,.61],[.12,.88]]){const eps=1e-7,a=waterNormalSlope(eps,v),b=waterNormalSlope(1-eps,v),c=waterNormalSlope(u,eps),d=waterNormalSlope(u,1-eps);assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-5);assert.ok(Math.hypot(c[0]-d[0],c[1]-d[1])<1e-5);}
  const a=acquireWaterNormalAtlas(),b=acquireWaterNormalAtlas();assert.equal(a,b);assert.equal(a.wrapS,a.wrapT);assert.equal(a.generateMipmaps,true);assert.equal(waterNormalAtlasDiagnostics().references,2);releaseWaterNormalAtlas();assert.equal(waterNormalAtlasDiagnostics().references,1);releaseWaterNormalAtlas();assert.deepEqual(waterNormalAtlasDiagnostics(),{references:0,allocated:false,size:128,metresPerRepeat:16,accountedBytes:0});
});

test('lake reflection uniforms use rebased local coordinates and reserve only admitted target bytes',()=>{
  const water=new RiverWater(body,region),chunk=water.group.children[0];
  assert.match(chunk.material.vertexShader,/lakeReflectionMatrix\*vec4\(transformed,1\.0\)/);
  assert.doesNotMatch(chunk.material.vertexShader,/lakeReflectionMatrix\*modelMatrix/);
  const before=water.diagnostics();assert.equal(before.reflectionBytes,0);
  assert.equal(water.canAllocateLakeReflection(256*256*8),true);
  water.setLakeReflectionBytes(256*256*8);const allocated=water.diagnostics();
  assert.equal(allocated.reflectionBytes,256*256*8);assert.ok(allocated.accountedBytes<=allocated.budgetBytes);
  water.setLakeReflectionBytes(0);assert.equal(water.diagnostics().reflectionBytes,0);water.dispose();
});
import * as THREE from 'three';
import {LakeReflection} from '../src/lake-reflection.ts';

function reflectionRenderer(throwOnRender=false){
  const viewport=new THREE.Vector4(3,4,5,6),scissor=new THREE.Vector4(7,8,9,10);let target=null,scissorTest=true;
  return {autoClear:false,clippingPlanes:[] ,localClippingEnabled:false,xr:{enabled:true},info:{render:{calls:0}},getRenderTarget:()=>target,setRenderTarget:v=>{target=v;},getViewport:v=>v.copy(viewport),setViewport:(x,y,w,h)=>x instanceof THREE.Vector4?viewport.copy(x):viewport.set(x,y,w,h),getScissor:v=>v.copy(scissor),setScissor:(x,y,w,h)=>x instanceof THREE.Vector4?scissor.copy(x):scissor.set(x,y,w,h),getScissorTest:()=>scissorTest,setScissorTest:v=>{scissorTest=v;},clear:()=>{},render:()=>{if(throwOnRender)throw new Error('capture failure');},state:()=>({viewport:viewport.clone(),scissor:scissor.clone(),scissorTest,target})};
}
test('lake reflection uses the upward plane to discard sub-water geometry and restores state',()=>{
  const group=new THREE.Group();group.scale.setScalar(body.radiusM);group.updateMatrixWorld(true);const scene=new THREE.Scene();scene.add(group);const waterGroup=new THREE.Group();group.add(waterGroup);
  let tick=1000;const frames=[],lake=new LakeReflection(body,region,f=>frames.push(f),waterGroup,{canAllocate:()=>true,setBytes:()=>{}},()=>tick),camera=new THREE.PerspectiveCamera();camera.position.set(0,body.radiusM+100,0);camera.lookAt(0,body.radiusM,1);camera.updateMatrixWorld();
  const renderer=reflectionRenderer();let observed;
  lake.update(renderer,scene,camera,group,false,false,'0',render=>{observed=renderer.clippingPlanes[0];renderer.info.render.calls=7;render();});
  assert.ok(observed.distanceToPoint(new THREE.Vector3(0,body.radiusM+36,0))>0,'upward side is retained');assert.ok(observed.distanceToPoint(new THREE.Vector3(0,body.radiusM+34,0))<0,'sub-water side is clipped by Three vClipPosition sign');
  assert.equal(renderer.autoClear,false);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.localClippingEnabled,false);assert.equal(renderer.clippingPlanes.length,0);assert.deepEqual(renderer.state().viewport.toArray(),[3,4,5,6]);assert.deepEqual(renderer.state().scissor.toArray(),[7,8,9,10]);assert.equal(renderer.state().scissorTest,true);assert.equal(frames.at(-1).coordinateFrame,'planet-local-at-capture');
  const captures=lake.diagnostics().captures;camera.position.x+=10;tick+=99;lake.update(renderer,scene,camera,group,false,false,'0',render=>render());assert.equal(lake.diagnostics().captures,captures,'moving camera remains cadence-gated');tick++;lake.update(renderer,scene,camera,group,false,false,'0',render=>render());assert.equal(lake.diagnostics().captures,captures+1,'moving capture resumes at 10 Hz');tick+=100;lake.update(renderer,scene,camera,group,false,false,'0',render=>render());assert.equal(lake.diagnostics().captures,captures+1,'static settled scene reuses its capture after a full cadence interval');for(let i=0;i<100;i++){tick+=10;camera.position.x+=.1;lake.update(renderer,scene,camera,group,false,false,'0',render=>render());}assert.equal(lake.diagnostics().captures,captures+11,'100 Hz pose updates make exactly ten captures per elapsed second');lake.dispose();lake.dispose();
});

test('lake reflection restores renderer and water visibility when capture throws',()=>{
  const group=new THREE.Group();group.scale.setScalar(body.radiusM);group.updateMatrixWorld(true);const scene=new THREE.Scene();scene.add(group);const waterGroup=new THREE.Group();group.add(waterGroup);
  const lake=new LakeReflection(body,region,()=>{},waterGroup,{canAllocate:()=>true,setBytes:()=>{}}),camera=new THREE.PerspectiveCamera();camera.position.set(0,body.radiusM+100,0);camera.lookAt(0,body.radiusM,1);camera.updateMatrixWorld();const renderer=reflectionRenderer(true);
  assert.throws(()=>lake.update(renderer,scene,camera,group,false,false,'0',render=>render()),/capture failure/);
  assert.equal(renderer.getRenderTarget(),null);assert.equal(renderer.autoClear,false);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.localClippingEnabled,false);assert.equal(renderer.clippingPlanes.length,0);assert.equal(waterGroup.visible,true);lake.dispose();
});

test('lake reflection range and cache use physical planet-local metres across renderer scale and rebases',()=>{
  let tick=0,bytes=0;const group=new THREE.Group();group.scale.setScalar(body.radiusM*.5);group.updateMatrixWorld(true);const scene=new THREE.Scene();scene.add(group);const waterGroup=new THREE.Group();group.add(waterGroup);const frames=[];
  const lake=new LakeReflection(body,region,f=>frames.push(f),waterGroup,{canAllocate:()=>true,setBytes:n=>{bytes=n;}},()=>tick),camera=new THREE.PerspectiveCamera(),renderer=reflectionRenderer();
  // 1200 render units is 2400 physical metres at this scale, so it must not allocate.
  camera.position.set(0,body.radiusM*.5+1200,0);camera.lookAt(0,body.radiusM*.5,1);camera.updateMatrixWorld();lake.update(renderer,scene,camera,group,false,false,'scale',render=>render());assert.equal(bytes,0);assert.equal(frames.at(-1).valid,false);
  camera.position.set(0,body.radiusM*.5+100,0);camera.lookAt(0,body.radiusM*.5,1);camera.updateMatrixWorld();tick+=100;lake.update(renderer,scene,camera,group,false,false,'scale',render=>render());const captures=lake.diagnostics().captures,matrix=frames.at(-1).matrix.elements.slice();
  group.position.x+=5000;camera.position.x+=5000;group.updateMatrixWorld(true);camera.updateMatrixWorld();tick+=100;lake.update(renderer,scene,camera,group,false,false,'scale',render=>render());assert.equal(lake.diagnostics().captures,captures,'same local pose reuses capture after floating-origin translation');assert.deepEqual(frames.at(-1).matrix.elements,matrix,'cached UV matrix remains in its capture-local frame');
  camera.rotateZ(.2);camera.updateMatrixWorld();tick+=100;lake.update(renderer,scene,camera,group,false,false,'scale',render=>render());assert.equal(lake.diagnostics().captures,captures+1,'camera roll invalidates the reflected orientation');lake.dispose();
});
