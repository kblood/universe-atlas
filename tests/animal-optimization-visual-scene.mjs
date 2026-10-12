import * as THREE from 'three';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildComposerSource} from '../src/fauna-composer-source.ts';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {buildFaunaComposerRequestedLevels} from '../src/fauna-composer-render-source.ts';
import {FaunaComposerPaletteWriter} from '../src/fauna-composer-palette.ts';

const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(640,480);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.append(renderer.domElement);
const gl=renderer.getContext(),scene=new THREE.Scene();scene.background=new THREE.Color('#17343c');scene.add(new THREE.HemisphereLight(0xffffff,0x888888,2));
const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(4,10,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:'#507160',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.002;ground.receiveShadow=true;scene.add(ground);
const camera=new THREE.PerspectiveCamera(45,640/480,.05,1000);camera.position.set(3,2,4);camera.lookAt(0,.6,0);
const pixels=()=>{const out=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,out);return out;};
const assert=(x,m)=>{if(!x)throw new Error(m);};const wait=()=>new Promise(r=>requestAnimationFrame(r));
function diff(a,b){let changed=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(max,d);}return {changed,max};}
async function setup(preset,options={},tier='far'){
 const source=buildComposerSource(composerPreset(preset),{presentation:'realism-1'});
 const controller=new FaunaComposerRenderer({provider:{async build(job){return {key:job.key,source,levels:buildFaunaComposerRequestedLevels(source,job.tiers,[4500,1000]),buildMs:0};}},pose:(g,c)=>poseComposer(g,'walk',c.rigSeconds),capacity:1,partialPaletteUploads:true,mergedGpuContext:gl,
  mergedTiers:{far:{storage:'packed-1',maxVertices:4000,maxIndices:12000,maxBytes:2e6,activeIndexPasses:true}},...options});
 controller.setViewCameras([camera]);scene.add(controller.group);
 const c={id:'original/'+preset,definition:{recipe:preset},sourceKey:'exact/'+preset,matrix:new THREE.Matrix4(),distanceM:tier==='near'?5:300,presentationDistanceM:10,cameraVisible:true,rigSeconds:.731,poseKey:'fixed/.731',animationContext:'ground1/walk'};
 const tick=()=>{controller.update([c]);renderer.render(scene,camera);};
 for(let i=0;i<150;i++){tick();if(controller.diagnostics().active===1&&!controller.pendingPresentationWork)break;await wait();}assert(controller.diagnostics().active===1,'actual animal required');
 return {source,controller,c,tick,dispose:()=>controller.dispose()};
}
window.__optimizationVisual={ready:false};
try{
 const cases=[];
 for(const preset of ['dinosaur','turtle','worm','centipede','giraffe','bird']){
  const full=await setup(preset,{fastFarMatrices:false});full.tick();const a=pixels();full.dispose();
  const fast=await setup(preset,{fastFarMatrices:true});fast.tick();const b=pixels(),comparison=diff(a,b);assert(comparison.max===0,preset+' fast matrix pixels differ');fast.dispose();cases.push({preset,fastFarPixels:comparison});
 }
 for(const tier of ['near','far']){
  const ordinary=await setup('turtle',{distanceShadows:false},tier);ordinary.tick();const full=pixels();ordinary.dispose();
  const adaptive=await setup('turtle',{distanceShadows:true},tier);adaptive.tick();const close=pixels();assert(diff(full,close).max===0,'close shadows must remain exact');
  adaptive.c.presentationDistanceM=1000;adaptive.tick();const distant=pixels(),change=diff(close,distant);window.__shadowDebug={tier,change,shadowMap:!!sun.shadow.map,cast:adaptive.controller.group.children.map(m=>({cast:m.castShadow,count:m.count,visible:m.visible})),options:adaptive.controller.diagnostics()};assert(change.changed>100,'distant shadows must actually change pixels');assert(adaptive.controller.group.children.every(m=>!m.castShadow),'all distant shadow draw calls must be skipped');
  adaptive.c.presentationDistanceM=10;adaptive.tick();assert(diff(close,pixels()).max===0,'returning near must restore the same shadow');adaptive.dispose();cases.push({tier,closeShadowPixelsExact:true,distantShadowPixels:change});
 }
 // Measure projected displacement from the independent canonical palette at the
 // actual 300 m viewing scale, with a 1080-pixel vertical viewport equivalent.
 for(const preset of ['dinosaur','turtle','worm','centipede','giraffe','bird']){
  const s=await setup(preset,{adaptiveAnimation:true,fastFarMatrices:true});s.c.presentationDistanceM=300;
  const writer=new FaunaComposerPaletteWriter(s.source.graph),reference=new Float32Array(s.source.graph.bones.length*16),v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),matrix=new THREE.Matrix4();
  let maxDisplacementM=0,maxPixelEquivalent=0;
  for(let frame=1;frame<=60;frame++){
   s.c.rigSeconds=.731+frame/60;s.c.poseKey=String(frame);s.tick();const snap=s.controller.snapshotOf(s.c.id),skin=s.source.skin;
   writer.write(poseComposer(s.source.graph,'walk',s.c.rigSeconds),reference);
   for(let vertex=0;vertex<skin.vertexCount;vertex+=7){
    const posePoint=(palette,out)=>{out.set(0,0,0);for(let k=0;k<4;k++){const at=vertex*4+k,w=skin.skinWeight[at];if(!w)continue;matrix.fromArray(palette,skin.skinIndex[at]*16);v.fromArray(skin.positions,vertex*3).applyMatrix4(matrix);out.addScaledVector(v,w);}return out;};
    posePoint(reference,a);posePoint(snap.palette,b);const distance=a.distanceTo(b);maxDisplacementM=Math.max(maxDisplacementM,distance);maxPixelEquivalent=Math.max(maxPixelEquivalent,distance*1080/(2*Math.tan(Math.PI/8)*300));
   }
  }
  assert(maxPixelEquivalent<2,preset+' interpolation exceeds 2 px at far viewing scale');const diagnostics=s.controller.diagnostics();assert(diagnostics.temporalSamples<30,'far solver must run less often than frames');s.dispose();cases.push({preset,maxDisplacementM,maxPixelEquivalent,solverSamples:diagnostics.temporalSamples,frames:60});
 }
 assert(gl.getError()===gl.NO_ERROR,'WebGL errors');window.__optimizationVisual={ready:true,ok:true,cases};
}catch(error){window.__optimizationVisual={ready:true,ok:false,error:String(error.stack),debug:window.__shadowDebug};}
