import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadTreeAssetFamily,type TreeAssetFamily} from './tree-asset.ts';
import {OctahedralImpostor} from './vendor/three-ez-impostor/impostor-reference.js';
import {RenderProfile} from './render-profile.ts';

const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#a6bfd0');
const camera=new THREE.PerspectiveCamera(50,1,.1,10000);camera.position.set(28,18,46);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,8,0);controls.update();
const sun=new THREE.DirectionalLight(0xfff6e5,3);sun.position.set(-30,55,25);scene.add(sun,new THREE.HemisphereLight(0xc4dcf0,0x41472c,1));
const profile=new RenderProfile(renderer.getContext() as WebGL2RenderingContext);profile.setEnabled(true);
const status=document.getElementById('status')!,mask={value:0};
let attempted=false,ready=false,family:TreeAssetFamily|undefined,source:THREE.Group|undefined,proxy:OctahedralImpostor|undefined;
let mode:'mesh'|'impostor'='mesh',metadata:Record<string,unknown>={};
let sphere=new THREE.Sphere(),last=performance.now();
const captureTargets=new Set<NonNullable<Parameters<typeof renderer.setRenderTarget>[0]>>();
function setMode(value:typeof mode){if(!['mesh','impostor'].includes(value))throw new Error('Unsupported mode');mode=value;if(source)source.visible=mode==='mesh';if(proxy)proxy.visible=mode==='impostor';(document.getElementById('mode') as HTMLSelectElement).value=mode;}
function addMask(material:THREE.MeshStandardMaterial){
  const original=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,host)=>{original.call(material,shader,host);shader.uniforms.labMask=mask;shader.fragmentShader='uniform float labMask;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\nif(labMask>.5)gl_FragColor=vec4(vec3(1),1);');};
  material.customProgramCacheKey=()=>key+'/reference-mask';material.needsUpdate=true;
}
async function digest(bytes:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
async function load(near:ArrayBuffer,mid:ArrayBuffer,options:{grid?:number;textureSize?:number}={}){
  if(attempted)throw new Error('Reload the one-capture research lab before another capture');attempted=true;
  const grid=options.grid??16,textureSize=options.textureSize??2048;
  if(![8,16,32].includes(grid)||![1024,2048,4096].includes(textureSize)||textureSize%grid)throw new Error('Unsupported bounded atlas settings');
  family=await loadTreeAssetFamily(near,mid);source=new THREE.Group();
  for(const mesh of family.lods[0]){
    const material=mesh.material.clone();material.onBeforeCompile=()=>{};material.customProgramCacheKey=()=> 'atlas-static-source';
    source.add(new THREE.Mesh(mesh.geometry,material));
  }
  source.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(source);bounds.getBoundingSphere(sphere);
  const originals=new Map(source.children.map(x=>[x,(x as THREE.Mesh).material]));
  const captureMaterials=new Set<THREE.Material>();
  source.traverse(object=>{if((object as THREE.Mesh).isMesh)object.onBeforeRender=(_r,_s,_c,_g,material)=>{if(![...originals.values()].includes(material))captureMaterials.add(material);};});
  const saved={target:renderer.getRenderTarget(),ratio:renderer.getPixelRatio(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha()};
  const setTarget=renderer.setRenderTarget.bind(renderer),start=performance.now();
  renderer.setRenderTarget=(target,...args)=>{if(target&&target!==saved.target)captureTargets.add(target);return setTarget(target,...args);};
  try{
    proxy=new OctahedralImpostor({target:source,renderer,baseType:THREE.MeshStandardMaterial,useHemiOctahedron:true,textureSize,spritesPerSide:grid,alphaClamp:.4});
  }finally{
    renderer.setRenderTarget=setTarget;renderer.setRenderTarget(saved.target);renderer.setPixelRatio(saved.ratio);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.setClearColor(saved.clear,saved.alpha);
    for(const [object,material] of originals){(object as THREE.Mesh).material=material;delete object.userData.ez_originalMaterial;object.onBeforeRender=()=>{};}
    for(const material of captureMaterials)material.dispose();
  }
  const captureWallMs=performance.now()-start;
  // Upstream billboard position/size lives in a shader uniform, outside its
  // unit-plane CPU bounds. Disable culling for this single-object comparison.
  proxy.frustumCulled=false;proxy.material.roughness=.9;proxy.material.metalness=0;
  for(const mesh of source.children)addMask((mesh as THREE.Mesh).material as THREE.MeshStandardMaterial);addMask(proxy.material);
  // Use exactly the capture's own sphere for matched framing. The upstream
  // union-of-mesh-spheres differs from Box3.getBoundingSphere.
  const transform=(proxy.material as any).ezImpostorUniforms.impostorTransform.value as THREE.Matrix4;
  sphere.center.setFromMatrixPosition(transform);sphere.radius=new THREE.Vector3().setFromMatrixScale(transform).x/2;
  scene.add(source,proxy);setMode(mode);
  metadata={revision:'ca0046a49fef8f8c75745a6e49e52752ef3cf8e3',inputHashes:{near:await digest(near),mid:await digest(mid)},grid,textureSize,viewPixels:textureSize/grid,captureWallMs,
    center:sphere.center.toArray(),radius:sphere.radius,sourceTriangles:family.lods[0].reduce((n,m)=>n+m.geometry.index!.count/3,0),proxyTriangles:2,
    atlasRGBA8MipEstimateBytes:Math.round(2*textureSize**2*4*4/3),retainedCaptureTargets:captureTargets.size,
    sourceMaterials:family.lods[0].map(m=>({name:m.material.name,roughness:m.material.roughness,metalness:m.material.metalness,alphaTest:m.material.alphaTest})),proxyMaterial:{roughness:.9,metalness:0,alphaClamp:.4},
    limitations:['Unmodified upstream hemi-only reconstruction; below-centre views outside its support','Static 16m source, no Atlas wind or physical-height deformation','Proxy uses one roughness; source uses separate bark/leaf PBR','No ground, shadows, species or game integration']};
  status.textContent=JSON.stringify(metadata,null,2);profile.clear();ready=true;return metadata;
}
function probe(representation:typeof mode,direction:number[],pixels=128,supersample=1,silhouette=true){
  if(!ready||!source||!proxy)throw new Error('Not loaded');
  if(!['mesh','impostor'].includes(representation)||direction.length!==3||direction.some(x=>!Number.isFinite(x))||![32,64,128,256].includes(pixels)||![1,2,4].includes(supersample))throw new Error('Invalid probe');
  const toward=new THREE.Vector3().fromArray(direction);if(toward.lengthSq()<1e-12)throw new Error('Zero direction');toward.normalize();
  const distance=sphere.radius*30,view=new THREE.PerspectiveCamera(2*Math.atan(sphere.radius*1.05/distance)*180/Math.PI,1,.1,distance+sphere.radius*2);
  view.position.copy(sphere.center).addScaledVector(toward,distance);view.up.set(...(Math.abs(toward.y)>.999?[0,0,1]:[0,1,0]) as [number,number,number]);view.lookAt(sphere.center);view.updateMatrixWorld(true);
  const size=pixels*supersample,target=new THREE.WebGLRenderTarget(size,size,{depthBuffer:true});
  const saved={target:renderer.getRenderTarget(),background:scene.background,mode,clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha()};
  const data=new Uint8Array(size*size*4);
  try{
    setMode(representation);scene.background=null;renderer.setClearColor(0,0);mask.value=Number(silhouette);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,view);renderer.readRenderTargetPixels(target,0,0,size,size,data);
    const gl=renderer.getContext(),error=gl.getError();if(error!==gl.NO_ERROR)throw new Error(`Probe GL error ${error}`);
    if(supersample===1)return Array.from(data);
    const reduced=new Float32Array(pixels*pixels*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)for(let c=0;c<4;c++)reduced[(Math.floor(y/supersample)*pixels+Math.floor(x/supersample))*4+c]+=data[(y*size+x)*4+c]/(supersample*supersample);
    return Array.from(reduced);
  }finally{renderer.setRenderTarget(saved.target);renderer.setClearColor(saved.clear,saved.alpha);scene.background=saved.background;mask.value=0;setMode(saved.mode);target.dispose();}
}
function dispose(){ready=false;renderer.setAnimationLoop(null);for(const target of captureTargets)target.dispose();for(const mesh of source?.children??[]){((mesh as THREE.Mesh).material as THREE.Material).dispose();}proxy?.geometry.dispose();proxy?.material.dispose();family?.dispose();renderer.dispose();}
document.getElementById('load')!.onclick=async()=>{try{const near=(document.getElementById('near') as HTMLInputElement).files?.[0],mid=(document.getElementById('mid') as HTMLInputElement).files?.[0];if(!near||!mid)throw new Error('Select both GLBs');status.textContent='Capturing…';await load(await near.arrayBuffer(),await mid.arrayBuffer());}catch(error){status.textContent=String(error);}};
(document.getElementById('mode') as HTMLSelectElement).onchange=e=>setMode((e.target as HTMLSelectElement).value as typeof mode);
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
renderer.setAnimationLoop(()=>{const now=performance.now();profile.beginFrame(now-last);last=now;profile.pass('tree-reference',()=>renderer.render(scene,camera));profile.endFrame(renderer.info.render.calls,renderer.info.render.triangles);});
Object.assign(window,{__impostorReferenceLab:{load,setMode,probe,dispose,renderer,scene,camera,controls,profile,sun,get metadata(){return metadata;},get ready(){return ready;},get source(){return source;},get proxy(){return proxy;}}});
