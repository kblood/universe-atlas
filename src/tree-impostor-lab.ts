import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadTreeAssetFamily,type TreeAssetFamily} from './tree-asset.ts';
import {loadTreeCapture,TreeCapturedImpostor,type TreeCapture,type TreeCaptureFiltering} from './tree-captured-impostor.ts';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,logarithmicDepthBuffer:true});
renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#a6bfd0');
const camera=new THREE.PerspectiveCamera(50,1,.1,10000);camera.position.set(90,40,220);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,8,0);controls.update();
const sun=new THREE.DirectionalLight(0xfff6e5,3);sun.position.set(-30,55,25);scene.add(sun);
scene.add(new THREE.HemisphereLight(0xc4dcf0,0x41472c,1));
let family:TreeAssetFamily|undefined,batch:ReturnType<TreeAssetFamily['createBatch']>|undefined,capture:TreeCapture|undefined,impostor:TreeCapturedImpostor|undefined;
let mode:'mesh'|'capture'='mesh',loading=false,activeLod:0|1=0,captureFiltering:TreeCaptureFiltering='legacy-unassociated';const mask={value:0};
let sourceCoverage:'mask'|'hash'='mask',sourceCutoff=.5;
const status=document.getElementById('status')!;
function setMode(value:typeof mode){mode=value;if(batch)batch.group.visible=mode==='mesh';if(impostor)impostor.mesh.visible=mode==='capture';(document.getElementById('mode') as HTMLSelectElement).value=value;}
function setSourceCoverage(value:typeof sourceCoverage){
  if(value!=='mask'&&value!=='hash')throw new Error('Invalid source coverage mode');sourceCoverage=value;
  if(family&&batch){
    for(const material of [family.lods[activeLod][1].material,batch.meshes[1].customDepthMaterial!,batch.meshes[1].customDistanceMaterial!] as THREE.MeshStandardMaterial[]){
      material.alphaHash=value==='hash';material.alphaTest=value==='hash'?0:sourceCutoff;material.needsUpdate=true;
    }
  }
  (document.getElementById('coverage') as HTMLSelectElement).value=value;
}
function setCaptureFiltering(value:TreeCaptureFiltering){
  if(value!=='legacy-unassociated'&&value!=='coverage-weighted')throw new Error('Invalid capture filtering mode');
  captureFiltering=value;(document.getElementById('filtering') as HTMLSelectElement).value=value;
}
function dispose(){impostor?.dispose();batch?.dispose();family?.dispose();capture?.dispose();impostor=undefined;batch=undefined;family=undefined;capture=undefined;}
async function hash(buffer:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),v=>v.toString(16).padStart(2,'0')).join('');}
const supportedInputs=[
  ['atlas-branching-v1.glb','atlas-branching-v1.lod1.glb'],
  ['atlas-ez-oak.glb','atlas-ez-oak.lod1.glb'],
  ['atlas-ez-conifer.glb','atlas-ez-conifer.lod1.glb'],
] as const;
function captureInputPair(manifest:any){
  const files=manifest?.input?.files;
  if(!files||typeof files!=='object')throw new Error('Capture manifest does not declare source GLB hashes');
  const pair=supportedInputs.find(([a,b])=>typeof files[a]==='string'&&typeof files[b]==='string');
  if(!pair)throw new Error('Capture inputs are not a supported Atlas or EZ-Tree Oak/Pine GLB pair');
  const lod=manifest.options?.lod??0;
  if(lod!==0&&lod!==1)throw new Error('Capture LOD must be 0 or 1');
  return {pair,lod:lod as 0|1};
}
async function load(lod0:ArrayBuffer,lod1:ArrayBuffer,manifest:any,read:(path:string)=>Promise<ArrayBuffer>,filtering:TreeCaptureFiltering='legacy-unassociated'){
  if(loading)throw new Error('Capture comparison already loading');loading=true;
  let nextFamily:TreeAssetFamily|undefined,nextCapture:TreeCapture|undefined,nextBatch:typeof batch,nextImpostor:TreeCapturedImpostor|undefined;
  try{
    const {pair,lod}=captureInputPair(manifest);
    if(await hash(lod0)!==manifest.input.files[pair[0]]||await hash(lod1)!==manifest.input.files[pair[1]])throw new Error('Selected mesh pair does not match capture input hashes');
    nextFamily=await loadTreeAssetFamily(lod0,lod1);nextCapture=await loadTreeCapture(manifest,read,{filtering});
    nextBatch=nextFamily.createBatch(lod,1);nextBatch.setInstance(0,new THREE.Matrix4(),manifest.options.heightM,0);nextFamily.setDate(0n);
    nextImpostor=new TreeCapturedImpostor(nextCapture,nextFamily.lods[lod].map(m=>m.material));
    for(const mesh of nextFamily.lods[lod]){
      const material=mesh.material,previous=material.onBeforeCompile,key=material.customProgramCacheKey();
      material.onBeforeCompile=(shader,host)=>{previous.call(material,shader,host);shader.uniforms.treeLabMask=mask;shader.fragmentShader='uniform float treeLabMask;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\nif(treeLabMask>.5)gl_FragColor=vec4(vec3(1),1);');};
      material.customProgramCacheKey=()=>key+'/capture-lab-mask';material.needsUpdate=true;
    }
    scene.add(nextBatch.group,nextImpostor.mesh);
  }catch(error){nextImpostor?.dispose();nextBatch?.dispose();nextFamily?.dispose();nextCapture?.dispose();throw error;}
  finally{loading=false;}
  dispose();family=nextFamily;batch=nextBatch;capture=nextCapture;impostor=nextImpostor;activeLod=captureInputPair(manifest).lod;captureFiltering=filtering;sourceCutoff=family!.lods[activeLod][1].material.alphaTest;setMode(mode);setSourceCoverage(sourceCoverage);
  impostor!.uniforms.captureParallax.value=Number((document.getElementById('parallax') as HTMLInputElement).checked);
  impostor!.uniforms.captureHash.value=Number((document.getElementById('hash') as HTMLInputElement).checked);
  status.textContent=JSON.stringify({heightM:manifest.options.heightM,lod:activeLod,filtering:capture!.filtering,views:manifest.views.length,gpuTextureBytes:capture!.bytes,
    format:'RGBA8 colour + RGBA16F normal/depth + RGBA8 class (R used); explicit independent mip chains',
    limits:'Single tree and exact captured height. No game integration, instancing, cast shadows, wind or handoff.'},null,2);
}
/** Fixed orthographic view for silhouette comparisons; returns pixels for the
 * independent browser harness. It restores all renderer and visibility state. */
function probe(direction:readonly number[],representation:'mesh'|'capture',pixels=128,supersample=1){
  if(!capture||!impostor||!batch)throw new Error('Load a capture first');
  if(direction.length!==3||direction.some(x=>!Number.isFinite(x))||!Number.isInteger(pixels)||pixels<32||pixels>512||![1,2,4].includes(supersample)||pixels*supersample>2048)throw new Error('Invalid probe');
  const toward=new THREE.Vector3().fromArray(direction);if(toward.lengthSq()<1e-12)throw new Error('Invalid probe direction');toward.normalize();
  const center=new THREE.Vector3().fromArray(capture.manifest.center),radius=capture.manifest.radius;
  const view=new THREE.OrthographicCamera(-radius,radius,radius,-radius,.5,2*radius+1.5);view.position.copy(center).addScaledVector(toward,radius+1);
  view.up.set(...(Math.abs(toward.y)>.999?[0,0,1]:[0,1,0]) as [number,number,number]);view.lookAt(center);view.updateMatrixWorld(true);
  const resolution=pixels*supersample;
  const target=new THREE.WebGLRenderTarget(resolution,resolution,{depthBuffer:true});target.samples=supersample===1?4:0;
  const oldTarget=renderer.getRenderTarget(),oldMode=mode,background=scene.background,oldClear=new THREE.Color(),alpha=renderer.getClearAlpha();renderer.getClearColor(oldClear);
  const data=new Uint8Array(resolution*resolution*4);
  try{
    setMode(representation);mask.value=1;impostor.uniforms.captureMask.value=1;scene.background=null;renderer.setClearColor(0,0);
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,view);renderer.readRenderTargetPixels(target,0,0,resolution,resolution,data);
    const gl=renderer.getContext(),error=gl.getError();if(error!==gl.NO_ERROR)throw new Error(`Probe GL error ${error}`);
    if(supersample===1)return Array.from(data);
    const reduced=new Float32Array(pixels*pixels*4);
    for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++)for(let c=0;c<4;c++)reduced[(Math.floor(y/supersample)*pixels+Math.floor(x/supersample))*4+c]+=data[(y*resolution+x)*4+c]/(supersample*supersample);
    return Array.from(reduced);
  }finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldClear,alpha);scene.background=background;mask.value=0;impostor.uniforms.captureMask.value=0;setMode(oldMode);target.dispose();}
}
document.getElementById('load')!.onclick=async()=>{
  try{
    const a=(document.getElementById('lod0') as HTMLInputElement).files?.[0],b=(document.getElementById('lod1') as HTMLInputElement).files?.[0];
    const files=Array.from((document.getElementById('capture') as HTMLInputElement).files??[]),manifestFile=files.find(f=>f.webkitRelativePath.split('/').length===2&&f.name==='capture-manifest.json');
    if(!a||!b||!manifestFile)throw new Error('Select both GLBs and one capture directory');
    const fileMap=new Map(files.map(file=>[file.webkitRelativePath.split('/').slice(1).join('/'),file]));status.textContent='Checking inputs and loading capture…';
    await load(await a.arrayBuffer(),await b.arrayBuffer(),JSON.parse(await manifestFile.text()),async path=>{const file=fileMap.get(path);if(!file)throw new Error(`Missing capture ${path}`);return file.arrayBuffer();},captureFiltering);
  }catch(error){status.textContent=String(error);}
};
(document.getElementById('mode') as HTMLSelectElement).onchange=event=>setMode((event.target as HTMLSelectElement).value as typeof mode);
(document.getElementById('coverage') as HTMLSelectElement).onchange=event=>setSourceCoverage((event.target as HTMLSelectElement).value as typeof sourceCoverage);
document.getElementById('filtering')!.onchange=event=>setCaptureFiltering((event.target as HTMLSelectElement).value as TreeCaptureFiltering);
document.getElementById('parallax')!.onchange=event=>{if(impostor)impostor.uniforms.captureParallax.value=Number((event.target as HTMLInputElement).checked);};
document.getElementById('hash')!.onchange=event=>{if(impostor)impostor.uniforms.captureHash.value=Number((event.target as HTMLInputElement).checked);};
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
Object.assign(window,{__treeImpostorLab:{load,setMode,setSourceCoverage,setCaptureFiltering,probe,renderer,scene,camera,controls,sun,get capture(){return capture;},get filtering(){return captureFiltering;},get family(){return family;},get ready(){return !!impostor&&!loading;}}});
