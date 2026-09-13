import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RiverWater} from '../src/river-water.ts';
import {createOceanWaterMaterial,setOceanWaterDebug,setOceanWaterPatchFrame} from '../src/ocean-water-material.ts';
const body={id:'water',name:'Water',seed:'water',kind:'planet',type:'Terrestrial world',parentId:'s',massKg:1,radiusM:6_371_000,temperatureK:288,color:'#fff',orbit:null,water:.6,rings:false};
const region={version:'river-region-1',id:'c/river-region-1',parentCatchmentId:'c',bodyId:'water',bodySeed:'water',radiusM:body.radiusM,origin:[0,1,0],east:[1,0,0],north:[0,0,-1],boundsM:[-2000,-2000,2000,2000],channels:[{id:'main',name:'Main',parentId:null,points:[{x:-1000,z:0,waterM:40,widthM:80,depthM:8,distanceM:0},{x:0,z:100,waterM:20,widthM:100,depthM:9,distanceM:1000},{x:1000,z:0,waterM:0,widthM:120,depthM:10,distanceM:2000}]}],lakes:[{id:'lake',name:'Lake',x:-500,z:700,radiusXM:300,radiusZM:160,angle:.2,waterM:35,depthM:12}],sites:[],stats:{samples:3,lengthM:2000,maxCutM:1,maxFillM:1,buildAlgorithm:'fixture'}};
test('water uses finite outward-wound indexed local geometry',()=>{const water=new RiverWater(body,region);for(const mesh of water.group.children){const p=mesh.geometry.getAttribute('position'),i=mesh.geometry.index;assert.ok(i&&p.count>2);for(const v of p.array)assert.ok(Number.isFinite(v));for(let q=0;q<i.count;q+=3){const a=new Float32Array(p.array.slice(i.getX(q)*3,i.getX(q)*3+3)),b=new Float32Array(p.array.slice(i.getX(q+1)*3,i.getX(q+1)*3+3)),c=new Float32Array(p.array.slice(i.getX(q+2)*3,i.getX(q+2)*3+3));const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],anchor=mesh.position;assert.ok(n[0]*anchor.x+n[1]*anchor.y+n[2]*anchor.z>=-1e-12);}}water.dispose();assert.equal(water.group.children.length,0);});
test('water culls from body-relative eye and remains within its budgets',()=>{const water=new RiverWater(body,region);water.update([0,1.01,0],[1,0,0],2,1.3);const d=water.diagnostics();assert.ok(d.draws<=64&&d.resident<=64&&d.accountedBytes<=d.budgetBytes);water.dispose();assert.equal(water.diagnostics().resident,0);});
test('lake perimeter uses <=16 m chords and impossible complete coverage rejects explicitly',()=>{const water=new RiverWater(body,region),lake=water.group.children.at(-1).geometry,outer=300,sides=Math.ceil(2*Math.PI*outer/16),rings=Math.ceil(outer/16),coords=lake.getAttribute('waterCoord');assert.ok(lake.getAttribute('position').count>100,'rings replace a coarse lake fan');const first=1+(rings-1)*sides;for(let i=0;i<sides;i++){const a=first+i,b=first+(i+1)%sides,dx=coords.getX(a)-coords.getX(b),dz=coords.getY(a)-coords.getY(b);assert.ok(Math.hypot(dx,dz)<=16.000001,'perimeter chord stays below the shoreline precision limit');}water.dispose();const tooMany={...region,lakes:Array.from({length:65},(_,i)=>({...region.lakes[0],id:'l'+i}))};const rejected=new RiverWater(body,tooMany);assert.equal(rejected.group.children.length,0);assert.match(rejected.diagnostics().rejected,/64 complete chunks/);const huge=new RiverWater(body,{...region,lakes:[{...region.lakes[0],radiusXM:20_000,radiusZM:20_000}]});assert.match(huge.diagnostics().rejected,/16 MiB/);});
test('zero-width source and ocean mouth remain finite without widening the channel',()=>{const points=region.channels[0].points.map((p,i)=>({...p,widthM:i===0||i===2?0:p.widthM,waterM:i===2?0:p.waterM})),water=new RiverWater(body,{...region,channels:[{...region.channels[0],points}]});for(const mesh of water.group.children){for(const v of mesh.geometry.getAttribute('position').array)assert.ok(Number.isFinite(v));}assert.equal(water.diagnostics().rejected,null);water.dispose();});
test('lake fragment ownership keeps boundary-crossing river coverage outside its ellipse',()=>{
  const crossing={...region,channels:[{...region.channels[0],points:[{x:-900,z:700,waterM:35,widthM:80,depthM:6,distanceM:0},{x:900,z:700,waterM:35,widthM:80,depthM:6,distanceM:1800}]}]};
  const water=new RiverWater(body,crossing),river=water.group.children.find(m=>m.userData.water.kind==='river'),lake=water.group.children.find(m=>m.userData.water.kind==='lake');
  assert.ok(river&&lake);assert.equal(river.geometry.index.count,12,'the crossing ribbon remains continuous up to the exact shoreline');
  const ellipse=river.material.uniforms.lakeEllipse.value[0],rotation=river.material.uniforms.lakeRotation.value[0],contains=(x,z)=>{const dx=x-ellipse.x,dz=z-ellipse.y,u=(dx*rotation.x+dz*rotation.y)/ellipse.z,v=(-dx*rotation.y+dz*rotation.x)/ellipse.w;return u*u+v*v<=1;};
  assert.equal(contains(-500,700),true);assert.equal(contains(-900,700),false);assert.match(river.material.fragmentShader,/const int LAKE_COUNT=1/);
  for(const mesh of water.group.children){for(const name of ['waterCoord','waterDepth','shoreDistance','flowVector']){const attribute=mesh.geometry.getAttribute(name);assert.ok(attribute&&attribute.count>0,`${name} is baked per vertex`);for(const v of attribute.array)assert.ok(Number.isFinite(v));}}
  const depths=river.geometry.getAttribute('waterDepth').array;assert.equal(Math.min(...depths),0);assert.ok(Math.max(...depths)>=6,'channel centre preserves authored depth');
  const shader=river.material.fragmentShader;assert.match(shader,/waterCoordV/);assert.match(shader,/dot\(q,q\)<=1\.0\)discard/);assert.match(shader,/fresnel/);assert.match(shader,/reflect\(-view,n\),base/);assert.match(shader,/dFdx\(waterCoordV\)/);assert.match(shader,/rippleFade/);assert.match(shader,/microFade/);assert.match(shader,/vec2\(15\.7,8\.3\)/);assert.match(shader,/\.025\+\.72\*fresnel/);assert.match(shader,/waterDepthV/);assert.match(shader,/eyeRelative-waterLocalPosition/);assert.doesNotMatch(shader,/waterUv/);assert.equal(water.completeCoverage(),true);water.dispose();assert.equal(water.completeCoverage(),false);
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
  assert.equal(ocean.uniforms.oceanTime.value,4);assert.equal(ocean.uniforms.oceanFlat.value,1);assert.equal(ocean.uniforms.oceanDepthDebug.value,1);ocean.dispose();
});
