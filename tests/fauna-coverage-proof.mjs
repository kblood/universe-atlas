/** Lab-only identical planes isolate the actual field/batch material hooks. */
import * as THREE from 'three';
import {FaunaFieldRenderer} from '../src/fauna-field-renderer.ts';
import {FaunaSkinnedBatch} from '../src/fauna-skinned-batch.ts';
import {FAUNA_COVERAGE_VERSION,faunaCoverageEnd} from '../src/fauna-coverage.ts';
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true});renderer.setSize(64,64);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;document.body.append(renderer.domElement);
const target=new THREE.WebGLRenderTarget(64,64),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.2,1.2,1.2,-1.2,.1,10);camera.position.z=3;
scene.add(new THREE.AmbientLight(0xffffff,2));
const plane=new THREE.PlaneGeometry(2,2),n=plane.attributes.position.count,skinIndex=new Uint8Array(n*4),skinWeight=new Uint8Array(n*4);for(let i=0;i<n;i++)skinWeight[i*4]=255;
const body={positions:plane.attributes.position.array,normals:plane.attributes.normal.array,colors:new Uint8Array(n*3).fill(255),skinIndex,skinWeight,index:plane.index.array,
 plan:{genome:{appearance:{roughness:.86}},bones:Array.from({length:22},()=>({rest:[0,0,0],parent:-1}))}};
const batch=new FaunaSkinnedBatch({capacity:1,maxVerticesPerAnimal:n,maxIndicesPerAnimal:plane.index.count,maxGeometryEntries:1});
if(!batch.registerGeometry('exact-plane',body)||!batch.prepareAnimal('exact-plane','exact-plane'))throw new Error('Plane batch fixture admission failed');
const field=new FaunaFieldRenderer({bodyPlan:true,complementaryCoverage:true}),fallback=field.meshes[0],interval=fallback.geometry.attributes.instanceFaunaCoverage;
fallback.geometry.dispose();fallback.geometry=plane.clone();fallback.geometry.setAttribute('instanceFaunaCoverage',interval);fallback.count=1;fallback.setMatrixAt(0,new THREE.Matrix4());fallback.setColorAt(0,new THREE.Color(1,1,1));fallback.instanceMatrix.needsUpdate=true;fallback.instanceColor.needsUpdate=true;
scene.add(batch.group,field.group);const identity=new THREE.Matrix4(),palette=new Float32Array(352);for(let bone=0;bone<22;bone++)identity.toArray(palette,bone*16);
const materials={batch:{lit:batch.mesh.material,depth:batch.mesh.customDepthMaterial,distance:batch.mesh.customDistanceMaterial},fallback:{lit:fallback.material,depth:fallback.customDepthMaterial,distance:fallback.customDistanceMaterial}};
const distanceLight=new THREE.PointLight();distanceLight.position.set(0,0,4);distanceLight.shadow.camera.near=.1;distanceLight.shadow.camera.far=10;distanceLight.updateMatrixWorld();
for(const material of [materials.batch.distance,materials.fallback.distance])renderer.properties.get(material).light=distanceLight;
// Rendering a distance material directly requires the same shadow uniforms.
for(const material of [materials.batch.distance,materials.fallback.distance]){const previous=material.onBeforeCompile;material.onBeforeCompile=(shader,r)=>{previous.call(material,shader,r);shader.uniforms.referencePosition.value.set(0,0,4);shader.uniforms.nearDistance.value=0;shader.uniforms.farDistance.value=10;};}
function renderMask(kind,start,length,pass){batch.mesh.material=materials.batch[pass];fallback.material=materials.fallback[pass];
 batch.beginFrame(new THREE.Vector3());batch.submit('exact-plane',identity,palette,{coverageStart:start,coverage:length});batch.endFrame();interval.setXY(0,start,faunaCoverageEnd(start,length));interval.needsUpdate=true;
 batch.group.visible=kind==='batch';field.group.visible=kind==='fallback';renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);const bytes=new Uint8Array(64*64*4);renderer.readRenderTargetPixels(target,0,0,64,64,bytes);
 return Uint8Array.from({length:64*64},(_,i)=>bytes.subarray(i*4,i*4+4).some(v=>v!==0)?1:0);}
const rows=[];
for(const pass of ['lit','depth','distance']){const reference=renderMask('batch',0,1,pass),fallbackFull=renderMask('fallback',0,1,pass);
 let referenceDifferences=0;for(let i=0;i<reference.length;i++)referenceDifferences+=reference[i]!==fallbackFull[i]?1:0;
 for(const coverage of [0,.01,.1,.25,.49999997,.5,.50000003,.75,.9,.99,1]){const c=Math.fround(coverage),a=renderMask('batch',0,c,pass),b=renderMask('fallback',c,1-c,pass);let holes=0,overlap=0,outside=0,drawn=0;
  for(let i=0;i<reference.length;i++){if(reference[i]){drawn++;if(!a[i]&&!b[i])holes++;if(a[i]&&b[i])overlap++;}else if(a[i]||b[i])outside++;}
  rows.push({pass,coverage:c,referencePixels:drawn,referenceDifferences,holes,overlap,outside});}}
window.__faunaCoverageProof={version:FAUNA_COVERAGE_VERSION,scope:'Actual field/batch lit/depth/distance hooks on identical lab planes; validates screen-hash ownership, not distinct LOD silhouette equality',rows};
