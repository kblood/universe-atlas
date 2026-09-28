import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {installLeafTransmission} from './tree-leaf-transmission.ts';

// Synthetic calibration, deliberately separate from the tree art/coverage lab.
// Read a float linear target before tone mapping or sRGB encoding.
export type LeafProbe={
  adapter?:boolean;factor?:number;tint?:[number,number,number];
  light?:'directional'|'point'|'spot'|'area'|'hemi'|'ambient'|'probe'|'environment';
  backLight?:boolean;backView?:boolean;angle?:number;normalMap?:boolean;
  shadows?:boolean;blocker?:boolean;specular?:number;castShadow?:boolean;
  baseColor?:[number,number,number];cameraX?:number;
  shadowNormalBias?:number;shadowBias?:number;roughness?:number;normalScale?:number;
};
RectAreaLightUniformsLib.init();
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setSize(256,256);renderer.setPixelRatio(1);renderer.toneMapping=THREE.NoToneMapping;
renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
document.querySelector('#view')!.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0,0,0);
const camera=new THREE.PerspectiveCamera(35,1,.1,30);camera.position.set(.02,0,4);camera.lookAt(0,0,0);
const target=new THREE.WebGLRenderTarget(256,256,{type:THREE.FloatType,format:THREE.RGBAFormat,depthBuffer:true});
target.texture.colorSpace=THREE.LinearSRGBColorSpace;
const normalMap=new THREE.DataTexture(new Uint8Array([191,128,238,255]),1,1);normalMap.needsUpdate=true;
const parameters={color:new THREE.Color().setRGB(.3,.55,.12),roughness:.8,metalness:0,side:THREE.DoubleSide};
const plain=new THREE.MeshPhysicalMaterial(parameters),adapted=new THREE.MeshPhysicalMaterial(parameters);
const control=installLeafTransmission(adapted);
const geometry=new THREE.PlaneGeometry(2,2);geometry.computeTangents();
const leaf=new THREE.Mesh(geometry,plain);leaf.receiveShadow=true;scene.add(leaf);
const occluder=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.05),new THREE.MeshBasicMaterial({color:0x888888}));
occluder.castShadow=true;scene.add(occluder);
// Shadow-only blocker: hides it in the colour pass while keeping shadow draws.
occluder.material.colorWrite=false;occluder.material.depthWrite=false;

const directional=new THREE.DirectionalLight(0xffffff,.5);
directional.castShadow=true;directional.shadow.mapSize.set(1024,1024);
Object.assign(directional.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:12});
directional.shadow.camera.updateProjectionMatrix();directional.shadow.bias=-.0001;
const point=new THREE.PointLight(0xffffff,4.5,0,2);point.castShadow=true;point.shadow.mapSize.set(512,512);point.shadow.bias=-.0001;
const spot=new THREE.SpotLight(0xffffff,4.5,0,Math.PI/4,0,2);spot.castShadow=true;spot.shadow.mapSize.set(512,512);spot.shadow.bias=-.0001;
const area=new THREE.RectAreaLight(0xffffff,2,2,2);
const hemi=new THREE.HemisphereLight(0x3355ff,0xff4400,.5);
const ambient=new THREE.AmbientLight(0xffffff,.5);
const probe=new THREE.LightProbe(new THREE.SphericalHarmonics3());
probe.sh.coefficients[0].set(.5,.5,.5);probe.sh.coefficients[2].set(.1,.05,-.05);
const lights={directional,point,spot,area,hemi,ambient,probe};
scene.add(...Object.values(lights),directional.target,spot.target);

// A directional, non-uniform environment makes a wrong hemisphere observable.
const envScene=new THREE.Scene();
const envMaterials=[0xff2200,0x0022ff,0x2244ff,0xff4400,0x33ff55,0xff2255].map(color=>new THREE.MeshBasicMaterial({color,side:THREE.BackSide}));
const envBox=new THREE.Mesh(new THREE.BoxGeometry(10,10,10),envMaterials);envScene.add(envBox);
const pmrem=new THREE.PMREMGenerator(renderer),envTarget=pmrem.fromScene(envScene,.05,.1,20);pmrem.dispose();
envBox.geometry.dispose();envMaterials.forEach(m=>m.dispose());

function configure(options:LeafProbe={}){
  const o={adapter:true,factor:0,tint:[1,1,1] as [number,number,number],light:'directional' as const,backLight:false,backView:false,angle:0,normalMap:false,shadows:false,blocker:false,specular:0,castShadow:false,baseColor:[.3,.55,.12] as [number,number,number],cameraX:options.light==='area'?.6:.02,shadowNormalBias:0,shadowBias:-.0001,roughness:.8,normalScale:1,...options};
  control.set({factor:o.factor,tint:o.tint});
  control.assertInstalled();
  for(const m of [plain,adapted]){
    if(!!m.normalMap!==o.normalMap){m.normalMap=o.normalMap?normalMap:null;m.needsUpdate=true;}
    m.specularIntensity=o.specular;
    m.color.setRGB(...o.baseColor);
    m.roughness=o.roughness;m.normalScale.setScalar(o.normalScale);
  }
  leaf.material=o.adapter?adapted:plain;
  leaf.rotation.y=o.angle;leaf.receiveShadow=o.shadows;leaf.castShadow=o.castShadow;
  camera.position.set(o.cameraX,0,o.backView?-4:4);camera.lookAt(0,0,0);
  const z=o.backLight?-3:3;
  for(const [name,light] of Object.entries(lights)){light.visible=name===o.light;light.position.set(.2,.15,z);}
  area.lookAt(0,0,0);hemi.position.set(0,0,z);
  for(const light of [directional,point,spot]){light.shadow.normalBias=o.shadowNormalBias;light.shadow.bias=o.shadowBias;}
  occluder.position.set(.08,.06,z/3);occluder.visible=o.blocker&&o.shadows;
  scene.environment=o.light==='environment'?envTarget.texture:null;
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  return o;
}

function probePixels(options:LeafProbe={}){
  const effective=configure(options),pixels=new Float32Array(256*256*4);
  renderer.setRenderTarget(target);renderer.render(scene,camera);
  renderer.readRenderTargetPixels(target,0,0,256,256,pixels);renderer.setRenderTarget(null);
  renderer.render(scene,camera);
  const center=[0,0,0];let finite=true;
  for(const value of pixels)if(!Number.isFinite(value))finite=false;
  for(let y=120;y<136;y++)for(let x=120;x<136;x++)for(let c=0;c<3;c++)center[c]+=pixels[(y*256+x)*4+c]/256;
  const error=renderer.getContext().getError();
  const result={effective,center,finite,glError:error,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  document.querySelector('#report')!.textContent=JSON.stringify(result,null,2);
  return {...result,pixels:Array.from(pixels)};
}
function dispose(){target.dispose();envTarget.dispose();normalMap.dispose();geometry.dispose();plain.dispose();adapted.dispose();occluder.geometry.dispose();occluder.material.dispose();for(const light of [directional,point,spot])light.dispose();renderer.dispose();}
(window as any).__leafTransmissionLab={probe:probePixels,configure,renderer,scene,camera,leaf,plain,adapted,control,dispose};
document.querySelector('#front')!.addEventListener('click',()=>probePixels({factor:.5}));
document.querySelector('#back')!.addEventListener('click',()=>probePixels({factor:.5,backLight:true}));
document.querySelector('#baseline')!.addEventListener('click',()=>probePixels({adapter:false,backLight:true}));
probePixels();
