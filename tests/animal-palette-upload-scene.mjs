import * as THREE from 'three';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildComposerSource} from '../src/fauna-composer-source.ts';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {buildFaunaComposerLevels} from '../src/fauna-composer-render-source.ts';

const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(640,480);document.body.append(renderer.domElement);
const gl=renderer.getContext(),scene=new THREE.Scene();scene.background=new THREE.Color('#193338');scene.add(new THREE.HemisphereLight(0xffffff,0x888888,3));
const camera=new THREE.PerspectiveCamera(45,640/480,.1,100);camera.position.set(3,3,7);camera.lookAt(1,1,0);
const source=buildComposerSource(composerPreset('turtle'),{presentation:'realism-1'}),levels=buildFaunaComposerLevels(source,[4500,1000]);
const assert=(value,message)=>{if(!value)throw new Error(message);};
const pixels=()=>{const out=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,out);return out;};
const wait=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function run(partial,merged,fixture=source,restore=false){
 const source=fixture,levels=buildFaunaComposerLevels(source,[4500,1000]);
 const controller=new FaunaComposerRenderer({provider:{async build(job){return {key:job.key,source,levels,buildMs:0};}},pose:(g,c)=>poseComposer(g,'walk',c.rigSeconds),
  capacity:32,maxBones:160,maxBytes:40e6,workerReserveBytes:1,partialPaletteUploads:partial,mergedGpuContext:gl,
  ...(merged?{mergedGpuContext:gl,mergedTiers:{far:{storage:'packed-1',maxVertices:16000,maxIndices:96000,maxBytes:10e6,activeIndexPasses:true}}}:{})});
 scene.add(controller.group);
 const candidates=Array.from({length:4},(_,i)=>({id:'member/'+i,definition:{recipe:source.graph.recipe},sourceKey:'exact-fixture',matrix:new THREE.Matrix4().makeTranslation(i*1.4-1.4,0,0),distanceM:merged?300:5,cameraVisible:true,rigSeconds:.375,poseKey:'clock/.375'}));
 const uploads=[],native=gl.texSubImage2D;let paletteHandle;
 gl.texSubImage2D=function(...args){if(paletteHandle&&this.getParameter(this.TEXTURE_BINDING_2D)===paletteHandle)uploads.push({width:args[4],height:args[5],bytes:args[4]*args[5]*16});return native.apply(this,args);};
 try{
  for(let i=0;i<150;i++){controller.update(candidates);renderer.render(scene,camera);if(controller.diagnostics().active===4&&!controller.diagnostics().running&&!controller.diagnostics().upgradesPending)break;await wait();}
  assert(controller.diagnostics().active===4,'four actual animals must be rendered');
  controller.update(candidates);renderer.render(scene,camera);
  paletteHandle=renderer.properties.get(controller.paletteUniform.value).__webglTexture;
  assert(paletteHandle,'real uploaded bone texture required');
  const before=pixels();uploads.length=0;
  candidates[1].rigSeconds=1.375;candidates[1].poseKey='clock/1.375';controller.update(candidates);renderer.render(scene,camera);const after=pixels();
  assert(uploads.length>0,'pose change must issue actual palette uploads');
  const changed=uploads.slice(),palette=controller.paletteData.slice(),diagnostics=controller.diagnostics();
  uploads.length=0;controller.update(candidates);renderer.render(scene,camera);assert(uploads.length===0,'unchanged pose must issue no palette upload');
  // Accumulate two changes before a draw: no intermediate readback or upload.
  candidates[0].rigSeconds=2.375;candidates[0].poseKey='clock/2.375';controller.update(candidates);
  candidates[3].rigSeconds=3.375;candidates[3].poseKey='clock/3.375';controller.update(candidates);renderer.render(scene,camera);
  const deferred=pixels();let restoration=null;
  if(restore){
   const width=controller.paletteBones;
   const lost=new Promise(resolve=>renderer.domElement.addEventListener('webglcontextlost',resolve,{once:true}));
   const restored=new Promise(resolve=>renderer.domElement.addEventListener('webglcontextrestored',resolve,{once:true}));
   const extension=gl.getExtension('WEBGL_lose_context');assert(extension,'context loss extension unavailable');extension.loseContext();await lost;await new Promise(resolve=>setTimeout(resolve,40));extension.restoreContext();await restored;
   for(let i=0;i<150;i++){controller.update(candidates);renderer.render(scene,camera);if(controller.diagnostics().active===4&&!controller.pendingPresentationWork)break;await wait();}
   const actual=pixels();assert(controller.paletteBones===width,'fixture must retain the same CPU palette width');assert(deferred.every((v,i)=>v===actual[i]),'restored partial palette changed native pixels');restoration={unchangedPaletteWidth:true,pixelsExact:true};
  }
  assert(gl.getError()===gl.NO_ERROR,'WebGL error');
  let visibleChange=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])visibleChange++;
  assert(visibleChange>100,'actual posed animals must change visible pixels');
  return {partial,merged,changed,bytes:changed.reduce((n,u)=>n+u.bytes,0),width:controller.paletteBones*4,height:controller.capacity,visibleChange,diagnostics,palette,after,deferred,restoration};
 }finally{gl.texSubImage2D=native;controller.dispose();assert(controller.ownedBytes===0,'owned resources must be released');}
}
window.__paletteUpload={ready:false};
try{
 const cases=[];
 for(const merged of [false,true]){
  const full=await run(false,merged),partial=await run(true,merged);
  assert(full.palette.every((v,i)=>Object.is(v,partial.palette[i])),'partial upload changed CPU matrices');
  assert(full.after.every((v,i)=>v===partial.after[i]),'partial upload changed native final pixels');
  assert(full.deferred.every((v,i)=>v===partial.deferred[i]),'deferred dirty rows changed native final pixels');
  assert(partial.bytes<full.bytes/4,'partial upload must save actual transfer bytes');
  cases.push({merged,fullBytes:full.bytes,partialBytes:partial.bytes,partialCalls:partial.changed,visibleChange:partial.visibleChange,pixelsExact:true,deferredPixelsExact:true});
 }
 const worm=buildComposerSource(composerPreset('worm'),{presentation:'realism-1'});const restored=await run(true,true,worm,true);cases.push({restoration:restored.restoration});
 window.__paletteUpload={ready:true,ok:true,cases};
}catch(error){window.__paletteUpload={ready:true,ok:false,error:String(error.stack)};}
