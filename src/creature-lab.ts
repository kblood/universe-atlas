import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {biosphereAt, generateBiosphere, type BiosphereWorld, type DatedBiosphere, type PlanetProfile, type Species} from "./biosphere-model.ts";
import {createCreatureRig, creatureTerrainHeight, type CreatureGait, type CreaturePoseDiagnostics, type CreatureRig, type TerrainKind} from "./creature-rig.ts";
import {individualCreatureGenome, realisticIndividualCreatureGenome, type CreatureGenome} from "./creature-model.ts";
import {type FaunaMorphologyFamily} from "./fauna-appearance.ts";
import {createFaunaSkinInspector} from "./fauna-skin-inspector.ts";
import {planetAnimalDefinition} from "#creature-kit/planet";
import {parseCreatureLabState, creatureLabUrl, creatureLabReplayInputError, creatureLabComposerInputError, creatureLabTemplateMismatch, creatureLabInputNotices, creatureLabLightInputError, type CreatureLabState, type SkinPose} from "./creature-lab-state.ts";
import {createComposerLab, type ComposerEyeFrame} from "./creature-lab-composer.ts";
import {loadFaunaTemplate, FAUNA_TEMPLATE_CONTROLS, type FaunaTemplateValues} from "./fauna-template.ts";
import {createFaunaTemplateInspector, type FaunaTemplateInspector, type LoadedFaunaTemplate} from "./fauna-template-inspector.ts";
import {DEER_INDIVIDUAL_RECIPE, applyDeerIndividualRecipe, templateMorphLocks, type TemplateRecipe, type TemplateIndividualIdentity} from "./fauna-template-phenotype.ts";
import {fitFaunaReviewShadow, FAUNA_REVIEW_SHADOWS} from "./fauna-review-lighting.ts";
import {applyFaunaReviewLighting, FAUNA_REVIEW_PRESETS, FAUNA_REVIEW_PRESET_IDS, faunaReviewFillKeyRatio, isFaunaReviewPresetId, type FaunaReviewPresetId} from "./fauna-review-environment.ts";
import {faunaTemplateRevisionLocation} from "./fauna-template-revisions.ts";
import "./creature-lab.css";

type Mode="gallery"|"anatomy"|"arena"|"ancestry"|"skin"|"composer";
type Growth="adult"|"juvenile";
type LabRig=CreatureRig & Partial<Pick<FaunaTemplateInspector,"bounds"|"diagnostics"|"setMorphs">>;
type AnimalSpecies=Species&{creature:CreatureGenome};
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;"," ":" "}[c]??({"\"":"&quot;","'":"&#39;"}[c]??c)));
const clone=<T>(v:T):T=>structuredClone(v);
const initialState=parseCreatureLabState(location.search);
const seed=$<HTMLInputElement>("seed"),profile=$<HTMLSelectElement>("profile"),date=$<HTMLInputElement>("date-myr"),speciesSelect=$<HTMLSelectElement>("species"),modeSelect=$<HTMLSelectElement>("mode");
const gaitSelect=$<HTMLSelectElement>("gait"),terrainSelect=$<HTMLSelectElement>("terrain"),crowdSelect=$<HTMLSelectElement>("crowd"),timeSlider=$<HTMLInputElement>("time"),normalize=$<HTMLInputElement>("normalize"),skeleton=$<HTMLInputElement>("skeleton"),neutral=$<HTMLInputElement>("neutral"),variant=$<HTMLSelectElement>("variant"),growth=$<HTMLSelectElement>("growth");
const skinSource=$<HTMLSelectElement>("skin-source");
const morphControls=Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map(id=>[id,$<HTMLInputElement>(`morph-${id}`)])) as Record<typeof FAUNA_TEMPLATE_CONTROLS[number],HTMLInputElement>;
const morphLocks=Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map(id=>[id,$<HTMLInputElement>(`lock-${id}`)])) as typeof morphControls;
let templateRecipe:TemplateRecipe=initialState.templateRecipe,lastRecipeIdentity:string|undefined;
for(const id of templateMorphLocks(initialState.morphLocks))morphLocks[id].checked=true;
const skinFamily=$<HTMLSelectElement>("skin-family"),skinView=$<HTMLSelectElement>("skin-view");
const skinFocus=$<HTMLSelectElement>("skin-focus"),skinPose=$<HTMLSelectElement>("skin-pose"),skinTime=$<HTMLInputElement>("skin-time"),skinCompare=$<HTMLInputElement>("skin-compare"),compareVariant=$<HTMLSelectElement>("compare-variant"),compareGrowth=$<HTMLSelectElement>("compare-growth");
seed.value=initialState.seed;profile.value=initialState.profile;gaitSelect.value="walk";const requestedSpecies=initialState.species;
skinSource.value=initialState.source;for(const id of FAUNA_TEMPLATE_CONTROLS)morphControls[id].value=String(initialState[id]);
skinFamily.value=initialState.family;skinView.value=initialState.view;variant.value=String(initialState.variant);growth.value=initialState.growth;skinFocus.value=initialState.frame;skinPose.value=initialState.pose;skinTime.value=String(initialState.time);skinCompare.checked=initialState.compare;compareVariant.value=String(initialState.compareVariant);compareGrowth.value=initialState.compareGrowth;neutral.checked=initialState.neutral;skeleton.checked=initialState.skeleton;

const scene=new THREE.Scene(); scene.background=new THREE.Color("#08131a"); scene.fog=null;
const camera=new THREE.PerspectiveCamera(47,1,.05,280);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$("viewport").append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=2;controls.maxDistance=180;controls.maxPolarAngle=Math.PI*.49;
// Review lighting: 'studio' is the original Lab rig; planet presets match the in-game surface light.
// Only composer and planet-skin modes offer (and link) a preset; every other mode keeps studio.
const lightSelect=$<HTMLSelectElement>("lighting");lightSelect.innerHTML=FAUNA_REVIEW_PRESET_IDS.map(id=>`<option value="${id}">${esc(FAUNA_REVIEW_PRESETS[id].label)}</option>`).join("");lightSelect.value=initialState.light;
let lightInputError=creatureLabLightInputError(location.search);let inputNotices=creatureLabInputNotices(location.search);
const lightingModes=new Set<string>(["composer","skin"]);
let lighting=applyFaunaReviewLighting(scene,"studio"),key=lighting.key;renderer.toneMappingExposure=lighting.preset.exposure;
function effectiveLight():FaunaReviewPresetId{return lightingModes.has(mode)&&isFaunaReviewPresetId(lightSelect.value)?lightSelect.value:"studio";}
/** Swaps the light rig when the effective preset changes; keeps shadow casting and refits the shadow frustum. */
function applyLighting(){
 const id=effectiveLight();$("lighting-row").hidden=!lightingModes.has(mode);if(lighting.preset.id===id)return;
 const cast=key.castShadow;lighting.dispose();lighting=applyFaunaReviewLighting(scene,id);key=lighting.key;key.castShadow=cast;renderer.toneMappingExposure=lighting.preset.exposure;
 if(terrainMesh&&!(mode==="arena"&&terrain==="steps"))(terrainMesh.material as THREE.MeshStandardMaterial).color.set(groundColor());
 reviewShadowEnvelope.makeEmpty();fitLabShadow(true);metricsPending=true;
}
function groundColor(){return mode==="arena"&&terrain==="steps"?"#4c5550":lightingModes.has(mode)?lighting.preset.ground:"#36504a";}
const worldGroup=new THREE.Group();scene.add(worldGroup);const actorGroup=new THREE.Group();worldGroup.add(actorGroup);
let terrainMesh:THREE.Mesh|undefined,grid:THREE.LineSegments|undefined;
let world!:BiosphereWorld,dated!:DatedBiosphere,selectedSpeciesId="",mode:Mode=initialState.mode,ready=false,error="",time=initialState.time,playing=true,skinPlaying=false,gait:CreatureGait="walk",terrain:TerrainKind="flat",actorCount=1,cpuMs=0,lastFrame=performance.now(),fps=0,frameN=0,lastFps=lastFrame,metricsPending=true;
let expectedTemplateHash=initialState.assetHash;
let expectedSidecarHash=initialState.sidecarHash,replayInputError=creatureLabReplayInputError(location.search);
let rebuildGeneration=0,templateCache:LoadedFaunaTemplate|undefined,templatePromise:Promise<LoadedFaunaTemplate>|undefined;
let templateCacheKey="",templatePromiseKey="";
let rigs:{rig:LabRig;source:"procedural"|"blender-reference";offset:THREE.Vector3;species:Species;id:string;genome:CreatureGenome}[]=[];let poses:CreaturePoseDiagnostics[]=[];let displayedSpeciesIds:string[]=[];let followed=new THREE.Vector3(),labelSignature="";
const composer=createComposerLab({group:actorGroup,initial:initialState,inputError:creatureLabComposerInputError(location.search),notices:inputNotices,getTime:()=>time,setTime:t=>{time=t;composer.syncTime(t);},rebuild:()=>rebuild(),refresh:()=>{updateRigs();metricsPending=true;},fit:()=>fitCamera(),
 progress:done=>{if(mode!=="composer")return;updateRigs();if(done){fitCamera();applyComposerText();}$("status").textContent=composer.status();metricsPending=true;}});

function wantsTemplate(){return mode==="skin"&&skinSource.value==="blender-reference";}
function morphValues():FaunaTemplateValues{return Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map(id=>[id,Number(morphControls[id].value)]));}
function refreshMorphLabels(){for(const id of FAUNA_TEMPLATE_CONTROLS)$("value-"+id).textContent=Number(morphControls[id].value).toFixed(2);refreshRecipeStatus();}
function lockedMorphs(){return FAUNA_TEMPLATE_CONTROLS.filter(id=>morphLocks[id].checked);}
function recipeIdentity():TemplateIndividualIdentity{return {seed:world.seed,profile:world.profile,species:selectedSpeciesId,variant:Number(variant.value),growth:growth.value as Growth};}
function refreshRecipeStatus(){$("template-recipe-status").textContent=`${templateRecipe==="manual"?"Manual shape":"Individual recipe active"} | ${lockedMorphs().length} locked traits`;}
function writeRecipeValues(){const values=applyDeerIndividualRecipe(recipeIdentity(),morphValues(),lockedMorphs());for(const id of FAUNA_TEMPLATE_CONTROLS)morphControls[id].value=String(values[id]);}
function syncIndividualRecipe(){
 if(!wantsTemplate())return;
 const identity=JSON.stringify(recipeIdentity());
 // Saved numeric values are authoritative on the initial load, even with an active recipe.
 if(templateRecipe===DEER_INDIVIDUAL_RECIPE&&lastRecipeIdentity!==undefined&&identity!==lastRecipeIdentity)writeRecipeValues();
 lastRecipeIdentity=identity;
}
async function ensureTemplate(){
 const route=faunaTemplateRevisionLocation("deer-doe-v1",{assetHash:expectedTemplateHash,sidecarHash:expectedSidecarHash}),key=route.relativeRoot;
 if(templateCache&&templateCacheKey===key)return templateCache;
 if(!templatePromise||templatePromiseKey!==key){releaseTemplate();templatePromiseKey=key;const promise=loadFaunaTemplate(new URL(route.runtimePath,location.href).href,new URL(route.sidecarPath,location.href).href).then(value=>{if(templatePromise!==promise){value.dispose();return value;}templateCache=value;templateCacheKey=key;return value;}).finally(()=>{if(templatePromise===promise){templatePromise=undefined;templatePromiseKey="";}});templatePromise=promise;}
 return templatePromise;
}
function releaseTemplate(){templateCache?.dispose();templateCache=undefined;templateCacheKey="";}
function animal(s:Species):s is AnimalSpecies{return s.kind==="animal"&&!!s.creature;}
function animals(){return world.species.filter(animal);}
function selected(){return animals().find(s=>s.id===selectedSpeciesId)||animals()[0];}
function isExtant(s:Species){return dated.stage==="complex"&&dated.species.some(x=>x.id===s.id);}
function linkHeight(x:number,z:number){return creatureTerrainHeight(x,z,mode==="arena"?terrain:"flat");}
function disposeActors(){composer.disposeActors();for(const r of rigs)r.rig.dispose();rigs=[];poses=[];followed.set(0,0,0);actorGroup.clear();}
function disposeTerrain(){if(terrainMesh){worldGroup.remove(terrainMesh);terrainMesh.geometry.dispose();(terrainMesh.material as THREE.Material).dispose();terrainMesh=undefined;}if(grid){worldGroup.remove(grid);grid.geometry.dispose();(grid.material as THREE.Material).dispose();grid=undefined;}}
function buildTerrain(){disposeTerrain();const rangeX=mode==="arena"?220:36,rangeZ=36,pos:number[]=[],idx:number[]=[];const quad=(a:number[],b:number[],c:number[],d:number[])=>{const n=pos.length/3;pos.push(...a,...b,...c,...d);idx.push(n,n+2,n+1,n+1,n+2,n+3);};if(mode==="arena"&&terrain==="steps"){const z0=-rangeZ,z1=rangeZ,bounds=Array.from({length:24},(_,i)=>-.35+.7*(i-11));const tread=(a:number,b:number)=>{const h=linkHeight((a+b)/2,0);quad([a,h,z0],[b,h,z0],[a,h,z1],[b,h,z1]);};tread(-rangeX,bounds[0]!);for(let i=0;i<bounds.length-1;i++)tread(bounds[i]!,bounds[i+1]!);tread(bounds.at(-1)!,rangeX);for(const b of bounds){const lo=linkHeight(b-.001,0),hi=linkHeight(b+.001,0);if(Math.abs(hi-lo)>1e-8)quad([b,lo,z0],[b,lo,z1],[b,hi,z0],[b,hi,z1]);}}else{const stepX=mode==="arena"?4:1,stepZ=mode==="arena"?2:1,nx=Math.floor(rangeX*2/stepX)+1,nz=Math.floor(rangeZ*2/stepZ)+1;for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const x=-rangeX+ix*stepX,z=-rangeZ+iz*stepZ;pos.push(x,linkHeight(x,z),z);}for(let z=0;z<nz-1;z++)for(let x=0;x<nx-1;x++){const a=z*nx+x;idx.push(a,a+nx,a+1,a+1,a+nx,a+nx+1);}}const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();terrainMesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:groundColor(),roughness:1,flatShading:mode==="arena"&&terrain==="steps",side:THREE.DoubleSide}));terrainMesh.receiveShadow=true;worldGroup.add(terrainMesh);const lines:number[]=[];for(let p=-32;p<=32;p+=8){lines.push(p,linkHeight(p,-32)+.012,-32,p,linkHeight(p,32)+.012,32,-32,linkHeight(-32,p)+.012,p,32,linkHeight(32,p)+.012,p);}const lg=new THREE.BufferGeometry();lg.setAttribute("position",new THREE.Float32BufferAttribute(lines,3));grid=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:"#9dc1b3",transparent:true,opacity:.25}));worldGroup.add(grid);}
function normalizedScale(s:AnimalSpecies){const g=s.creature;return normalize.checked&&mode!=="arena"&&mode!=="skin"?1/Math.max(.2,g.torsoLength+g.neckLength+g.tailLength):1;}
function addActor(s:AnimalSpecies,id:string,offset:THREE.Vector3,variantNumber=0,stage:Growth="adult",authored=wantsTemplate()){
 const creature=mode==="skin"?realisticIndividualCreatureGenome(s.creature,id,variantNumber,stage,skinFamily.value==="inherited"?undefined:skinFamily.value as FaunaMorphologyFamily):individualCreatureGenome(s.creature,id,variantNumber,stage);
 if(authored&&!templateCache)throw new Error("Blender reference has not loaded");
 const rig:LabRig=authored?createFaunaTemplateInspector(templateCache!,morphValues(),{pose:skinPose.value==="walk"?"walk":skinPose.value==="idle"?"idle":"neutral"}):mode==="skin"?createFaunaSkinInspector(creature,id,{pose:skinPose.value==="neutral"?"idle":skinPose.value as Exclude<SkinPose,"neutral">}):createCreatureRig(creature);
 rig.group.position.copy(offset);rig.group.scale.setScalar(normalizedScale(s));rig.setSkeletonVisible(skeleton.checked&&(mode==="anatomy"||mode==="skin"));rig.setNeutral(neutral.checked&&(mode==="anatomy"||mode==="skin"));actorGroup.add(rig.group);rigs.push({rig,source:authored?"blender-reference":"procedural",offset,species:s,id,genome:creature});
}
function ancestry(s:AnimalSpecies){const chain:AnimalSpecies[]=[];const visited=new Set<string>();let cursor:AnimalSpecies|undefined=s;while(cursor&&!visited.has(cursor.id)){chain.push(cursor);visited.add(cursor.id);const parentId:string|null=cursor.parentId;const parent:Species|undefined=parentId?world.species.find(p=>p.id===parentId):undefined;cursor=parent&&animal(parent)?parent:undefined;}return chain.reverse();}
function skinBounds(rig:LabRig,head=false){
 if(rig.bounds)return rig.bounds(head);
 const box=new THREE.Box3(),p=new THREE.Vector3();rig.group.updateMatrixWorld(true);
 rig.group.traverse(o=>{if(!(o instanceof THREE.SkinnedMesh))return;const ids=o.geometry.getAttribute("skinIndex"),weights=o.geometry.getAttribute("skinWeight");for(let i=0;i<ids.count;i++){if(head&&!(ids.getX(i)===6&&weights.getX(i)>.5))continue;o.getVertexPosition(i,p);box.expandByPoint(o.localToWorld(p));}});return box;
}
function skinViewDirection(){return skinView.value==="side"?new THREE.Vector3(0,0,1):skinView.value==="front"?new THREE.Vector3(1,0,0):new THREE.Vector3(1,.42,1).normalize();}
function arrangeSkinComparison(){
 if(mode!=="skin"||rigs.length!==2)return;
 // Keep ground centres at equal camera depth; body heights retain their natural perspective.
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),skinViewDirection()).normalize();
 const bounds=rigs.map(r=>skinBounds(r.rig));const widths=bounds.map(b=>{const size=b.getSize(new THREE.Vector3());return Math.abs(right.x)*size.x+Math.abs(right.z)*size.z;});
 const depth=skinViewDirection();depth.y=0;depth.normalize();
 const gap=.4,centres=[-(widths[1]!+gap)/2,(widths[0]!+gap)/2];
 rigs.forEach((r,i)=>{const move=centres[i]!-bounds[i]!.getCenter(new THREE.Vector3()).dot(right);r.offset.addScaledVector(right,move).addScaledVector(depth,-bounds[i]!.getCenter(new THREE.Vector3()).dot(depth));r.rig.group.position.copy(r.offset);});
}
const reviewShadowEnvelope=new THREE.Box3();
function fitLabShadow(force=false){
 if(!key.castShadow||(!rigs.length&&mode!=="composer"))return;
 const fullBounds=mode==="composer"?composer.envelope():new THREE.Box3().setFromObject(actorGroup);
 if(fullBounds.isEmpty())return;
 if(force||!reviewShadowEnvelope.containsBox(fullBounds)){
  reviewShadowEnvelope.copy(fullBounds).expandByScalar(.1);
  fitFaunaReviewShadow(key,reviewShadowEnvelope,{groundY:0,depthBiasM:FAUNA_REVIEW_SHADOWS.depthBiasM,normalBiasM:FAUNA_REVIEW_SHADOWS.normalBiasM});
 }
}
function fitSkinCamera(){
 const head=skinFocus.value==="head",box=new THREE.Box3();for(const r of rigs)box.union(skinBounds(r.rig,head));
 fitViewCamera(box,skinViewDirection(),head?.25:1,head?.12:.5);
}
/** Near plane of the Lab camera; the eye close-up moves it in so a centimetre-sized eye is not clipped. */
const CAMERA_NEAR=.05;
function setNear(near:number){if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}}
/** Composer eye close-up: the eye centre the camera follows while the animal plays (null when not following). */
let eyeFollow:THREE.Vector3|null=null,eyeFollowTime=NaN;
function fitViewCamera(box:THREE.Box3,direction:THREE.Vector3,minFit:number,minDistance:number){
 if(box.isEmpty())return;
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
 const extent=(axis:THREE.Vector3)=>Math.abs(axis.x)*size.x+Math.abs(axis.y)*size.y+Math.abs(axis.z)*size.z;
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),distance=Math.max(minFit,extent(right)/(2*tanV*camera.aspect*.8),extent(up)/(2*tanV*.8))+extent(direction)/2;
 setNear(CAMERA_NEAR);
 controls.minDistance=minDistance;controls.maxPolarAngle=Math.PI/2;controls.enableRotate=true;controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);controls.update();
 fitLabShadow(true);
}
/** Eye close-up: the visible eye (or a forward-facing pair) fills frame.fill of the viewport, seen along frame.direction
 * (the view's direction, or a front-quarter view of a lateral eye); the near plane drops with the distance. */
function fitEyeCamera(e:ComposerEyeFrame){
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
 const distance=Math.max(.004,e.half.up/(tanV*e.fill.up),e.half.right/(tanV*camera.aspect*e.fill.right))+e.half.depth;
 setNear(Math.min(CAMERA_NEAR,Math.max(5e-4,distance*.1)));
 controls.minDistance=.002;controls.maxPolarAngle=Math.PI/2;controls.enableRotate=true;controls.target.copy(e.centre);camera.position.copy(e.centre).addScaledVector(e.direction,distance);camera.lookAt(e.centre);controls.update();
 fitLabShadow(true);
}
function fitCamera(){eyeFollow=null;setNear(CAMERA_NEAR);if(mode==="skin"){fitSkinCamera();return;}if(mode==="composer"){const eye=composer.focus()==="eyes"&&!composer.building?composer.eyeFrame():null;if(eye){fitEyeCamera(eye);eyeFollow=eye.centre.clone();eyeFollowTime=time;return;}if(composer.focus()!=="body"&&!composer.building)fitViewCamera(composer.headEnvelope(),composer.viewDirection(),.12,.1);else fitViewCamera(composer.envelope(),composer.viewDirection(),.4,.15);return;}controls.maxPolarAngle=Math.PI*.49;const box=new THREE.Box3().setFromObject(actorGroup);controls.minDistance=2;if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),vFov=THREE.MathUtils.degToRad(camera.fov),hFov=2*Math.atan(Math.tan(vFov/2)*camera.aspect);let d:number;if(mode==="ancestry"){d=Math.max(size.x/(2*Math.tan(hFov/2)*.8),size.y/(2*Math.tan(vFov/2)*.72),4);controls.target.copy(center).add(new THREE.Vector3(0,size.y*.08,0));camera.position.set(center.x,center.y+size.y*.18,center.z+d);controls.enableRotate=false;}else if(mode==="gallery"){d=Math.max(size.x/(2*Math.tan(hFov/2)*.70),size.z/(2*Math.tan(vFov/2)*.60),size.y/(2*Math.tan(vFov/2)*.60),5);controls.target.copy(center);camera.position.set(center.x,center.y+d*.5,center.z+d*.9);controls.enableRotate=true;}else{d=Math.max(4,Math.max(size.x,size.y,size.z)*1.75);controls.target.copy(center);camera.position.set(center.x+d,center.y+d*.42,center.z+d);controls.enableRotate=true;}camera.lookAt(controls.target);controls.update();}
function buildActors(){disposeActors();key.castShadow=mode==="skin"||mode==="composer";if(mode==="composer"){displayedSpeciesIds=[];composer.build({skeleton:skeleton.checked,neutral:neutral.checked});buildTerrain();updateRigs();fitCamera();return;}const s=selected();displayedSpeciesIds=[];if(!s||dated.stage!=="complex"){buildTerrain();return;}if(mode==="gallery"){const list=animals();displayedSpeciesIds=list.map(x=>x.id);list.forEach((x,i)=>{const col=i%4,row=Math.floor(i/4);addActor(x,`${x.id}/gallery`,new THREE.Vector3((col-1.5)*4.1,0,(row-1)*4.3),i%4);});}
 else if(mode==="ancestry"){const chain=ancestry(s);displayedSpeciesIds=chain.map(x=>x.id);const widths=chain.map(x=>x.creature.torsoLength+x.creature.neckLength+x.creature.headLength+x.creature.tailLength),total=widths.reduce((a,b)=>a+b,0)+(chain.length-1)*.8;let cursor=-total/2;chain.forEach((x,i)=>{const width=widths[i]!;addActor(x,`${x.id}/ancestry`,new THREE.Vector3(cursor+width/2,0,0),0);cursor+=width+.8;});}
 else if(mode==="anatomy"||mode==="skin"){displayedSpeciesIds=[s.id];const comparing=mode==="skin"&&skinCompare.checked;addActor(s,`${s.id}/anatomy`,new THREE.Vector3(),Number(variant.value),growth.value as Growth);if(comparing){addActor(s,`${s.id}/anatomy`,new THREE.Vector3(),wantsTemplate()?Number(variant.value):Number(compareVariant.value),wantsTemplate()?growth.value as Growth:compareGrowth.value as Growth,false);displayedSpeciesIds.push(s.id);}}
 else if(isExtant(s)){const n=actorCount;displayedSpeciesIds=Array.from({length:n},()=>s.id);for(let i=0;i<n;i++){const off=new THREE.Vector3(0,0,(i-(n-1)/2)*2.25);off.y=linkHeight(0,off.z);addActor(s,`${s.id}/arena/${i}`,off,i%4,"adult");}}
 buildTerrain();updateRigs();arrangeSkinComparison();fitCamera();}
function labelFor(s:AnimalSpecies){const state=isExtant(s)?"EXTANT":"ARCHIVE";return `<div class="ancestor" data-creature-id="${esc(s.id)}"><button data-creature-id="${esc(s.id)}">${esc(s.name)}</button><span>${s.birthMyr} Myr · ${state}</span><span>${esc(s.creature.mutationLog.join(" · ")||"founder morphology")}</span></div>`;}
function exportDefinition(){
 const specimen=mode==="skin"?rigs.find(r=>r.source==="procedural"):undefined;if(!specimen)return;
 const definition=planetAnimalDefinition({individualId:specimen.id,speciesId:specimen.species.id,genome:specimen.genome});
 const url=URL.createObjectURL(new Blob([JSON.stringify(definition,null,2)],{type:"application/json"})),link=document.createElement("a");
 link.href=url;link.download="planet-animal-definition.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function applyComposerText(){
 const on=mode==="composer";composer.setActive(on);
 const definitionButton=$<HTMLButtonElement>("export-definition");definitionButton.hidden=mode!=="skin";definitionButton.disabled=!rigs.some(r=>r.source==="procedural");definitionButton.onclick=exportDefinition;
 for(const el of [date,speciesSelect,normalize,variant,growth])el.closest("label")!.hidden=on;
 document.querySelector<HTMLElement>(".header-controls")!.style.display=on?"none":"";
 document.querySelector<HTMLElement>(".side-panel .eyebrow")!.textContent=on?"MODULAR CREATURE EXPERIMENT":"RIGGED QUADRUPED EXPERIMENT";
 $("species-heading").textContent=on?"Composed creature":"Selected species";
 if(!on)return;
 const t=composer.text();modeSelect.value=mode;$("title").textContent=t.title;$("description").textContent=t.description;$("caption-title").textContent=t.captionTitle;$("caption-copy").textContent=t.captionCopy;$("species-detail").innerHTML=t.detail;
 $("caption-eyebrow").textContent="EXPERIMENTAL · COMMON METRE SCALE";$("anatomy-controls").style.display="grid";$("skin-controls").hidden=true;$("arena-controls").style.display="none";$("ancestry-panel").hidden=true;$("notice").hidden=true;
}
function updateText(){applyComposerText();if(mode==="composer")return;$("caption-eyebrow").textContent="COMMON METRE SCALE";const s=selected();const invalid=!s||dated.stage!=="complex";$("title").textContent=mode==="gallery"?"Reference specimen gallery":mode==="skin"?"Planetary skin inspection":mode==="anatomy"?"Anatomical inspection":mode==="arena"?"Gait arena":"Dated ancestry";$("description").textContent=mode==="skin"?"The connected skin, facial anatomy and dated pose used by nearby animals on planets. Select a species, growth stage and pose time to inspect it.":mode==="ancestry"?"Each figure is a real parent in the selected species chain, oldest to selected.":"Articulated anatomy prototype. Choose Planet skin to inspect the connected body used by nearby animals in the game.";$("anatomy-controls").style.display=mode==="anatomy"||mode==="skin"?"grid":"none";$("skin-controls").hidden=mode!=="skin";$("skin-compare-controls").hidden=!skinCompare.checked||wantsTemplate();$("template-controls").hidden=!wantsTemplate();$("compare-label").textContent=wantsTemplate()?"Compare with procedural specimen":"Compare two individuals";skinPose.disabled=false;skinTime.disabled=false;$<HTMLButtonElement>("skin-play").disabled=false;for(const option of skinPose.options)option.disabled=wantsTemplate()?!["neutral","idle","walk"].includes(option.value):option.value==="neutral";variant.disabled=false;growth.disabled=false;skinFamily.disabled=wantsTemplate()&&!skinCompare.checked;refreshMorphLabels();normalize.disabled=mode==="skin";modeSelect.value=mode;$("arena-controls").style.display=mode==="arena"?"grid":"none";$("ancestry-panel").hidden=mode!=="ancestry";const archive=s&&!isExtant(s);const notice=$("notice");notice.hidden=!invalid&&!((mode==="arena")&&archive);notice.textContent=invalid?"This date predates macroscopic life. Creature figures are unavailable until the complex-life stage.":archive&&mode==="arena"?"Archive comparison: this species is not extant at the selected date, so the arena remains empty.":"";if(!s){$("species-detail").textContent="No animal species exist for this world profile.";return;}$("species-detail").innerHTML=`<div><b>${esc(s.name)}</b></div><div>${esc(s.creature.archetype)} quadruped · ${isExtant(s)?"extant":"archive comparison"}</div><div>Born ${s.birthMyr} Myr · ${s.deathMyr??"present"}</div><div>Torso ${s.creature.torsoLength.toFixed(2)} m · legs ${s.creature.legLength.toFixed(2)} m</div>`;if(mode==="skin"&&rigs[0]){const g=rigs[0].genome;$("species-detail").innerHTML+=`<div>Displayed: ${esc(g.morphology?.family||g.archetype)} | ${esc(g.morphology?.footType||"foot")}<br>Torso ${g.torsoLength.toFixed(2)} m | legs ${g.legLength.toFixed(2)} m${g.morphology?.trunkLength?"<br>Trunk follows head; curling is not animated":""}${g.morphology?.wingState==="folded"?"<br>Resting wings; grounded specimen":""}${(()=>{const added=g.mutationLog.filter(line=>!s.creature.mutationLog.includes(line));return added.length?`<br>This individual: ${esc(added.join(" · "))}`:"";})()}</div>`;}$("ancestry-list").innerHTML=mode==="ancestry"?ancestry(s).map(labelFor).join(""):"";$("caption-title").textContent=mode==="ancestry"?`${ancestry(s).length} generations → ${s.name}`:mode==="gallery"?`${animals().length} labelled animal species`:s.name;$("caption-copy").textContent=mode==="arena"?"Terrain geometry samples the same deterministic height function used by the foot solver.":mode==="ancestry"?"Branching relationships remain in the archive cards; the displayed row is the selected parentId chain.":mode==="skin"?(skinCompare.checked?`First: specimen ${Number(variant.value)+1} (${growth.value}); second: specimen ${Number(compareVariant.value)+1} (${compareGrowth.value}). Shared metre scale, lighting and pose time.`:"Actual metre scale. Choose comparison to inspect individual or growth differences."):"Common metre scale is preserved unless normalized display scale is enabled.";if(wantsTemplate()){$("title").textContent="Blender reference inspection";$("description").textContent="Authored red deer candidate. Inspect bounded morphs, standing and a centred walk. Appearance and motion remain under review.";$("caption-title").textContent=templateCache?.sidecar.id||"Loading deer reference";$("caption-copy").textContent=skinCompare.checked?"Left: authored reference. Right: procedural specimen. Shared metre scale, light and pose time. Centred gait inspection; contact validation is separate.":"Reference candidate at its authored metre scale. Centred walk uses a treadmill view; genuine world contacts require a travelling-root check.";$("species-detail").innerHTML=`<div><b>Red deer hind reference</b></div><div>Asset ${esc(templateCache?.sidecar.id||"loading")} | reference candidate</div>${skinCompare.checked?`<div>Procedural comparison: ${esc(s.name)} | specimen ${Number(variant.value)+1}</div>`:""}`;}document.querySelectorAll<HTMLElement>("[data-creature-id]").forEach(el=>el.onclick=()=>{const id=el.dataset.creatureId;if(id){selectedSpeciesId=id;speciesSelect.value=id;rebuild();}});}
function updateMetrics(){if(mode==="composer"){const calls=renderer.info.render.calls,shadow=key.castShadow?composer.shadowCasters():0;$("metrics").innerHTML=`${composer.metrics()}<div><b>Draw calls</b> ${calls}${shadow?` (${calls-shadow} scene + ${shadow} shadow)`:""}</div><div><b>Triangles drawn</b> ${renderer.info.render.triangles}${shadow?" (scene and shadow passes)":""}</div><div><b>Lighting</b> ${esc(lighting.preset.label)} · fill/key ${faunaReviewFillKeyRatio(lighting.preset).toFixed(2)}</div><div><b>CPU</b> ${cpuMs.toFixed(2)} ms · ${fps.toFixed(0)} fps</div>`;if(ready&&!error)$("status").textContent=composer.status(calls);return;}const worst=poses.reduce((a,p)=>({penetration:Math.max(a.penetration,p.maxPenetration),reach:Math.max(a.reach,p.maxReachError)}),{penetration:0,reach:0});$("metrics").innerHTML=`<div><b>Actors</b> ${rigs.length}</div><div><b>Calls</b> ${renderer.info.render.calls}</div><div><b>Triangles</b> ${renderer.info.render.triangles}</div><div><b>CPU</b> ${cpuMs.toFixed(2)} ms · ${fps.toFixed(0)} fps</div><div><b>Foot penetration</b> ${worst.penetration.toFixed(4)+" m"}</div><div><b>Reach error</b> ${worst.reach.toFixed(4)+" m"}</div>`;}
function updateSelections(){const prior=selectedSpeciesId||requestedSpecies||"";const list=animals();speciesSelect.innerHTML=list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${isExtant(s)?"":" · archive"}</option>`).join("");selectedSpeciesId=list.some(s=>s.id===prior)?prior:(dated.species.filter(animal)[0]?.id||list[0]?.id||"");speciesSelect.value=selectedSpeciesId;}
async function rebuild(){
 const generation=++rebuildGeneration;
 applyLighting();applyComposerText();showInputNotices();
 try{
  error="";ready=false;if(lightingModes.has(mode)&&lightInputError&&mode!=="composer")throw new Error(lightInputError);if(wantsTemplate()&&!["neutral","idle","walk"].includes(skinPose.value))skinPose.value="neutral";if(!wantsTemplate()&&skinPose.value==="neutral")skinPose.value="idle";dated=biosphereAt(world,Number(date.value));updateSelections();syncIndividualRecipe();
  if(wantsTemplate()&&replayInputError)throw new Error(replayInputError);
  if(wantsTemplate()&&(!templateCache||templateCacheKey!==faunaTemplateRevisionLocation('deer-doe-v1',{assetHash:expectedTemplateHash,sidecarHash:expectedSidecarHash}).relativeRoot)){disposeActors();buildTerrain();updateText();$("status").textContent="Loading Blender reference candidate...";await ensureTemplate();if(generation!==rebuildGeneration){if(!wantsTemplate())releaseTemplate();return;}}
  if(wantsTemplate()&&templateCache){const mismatch=creatureLabTemplateMismatch({assetHash:expectedTemplateHash,sidecarHash:expectedSidecarHash},templateCache);if(mismatch)throw new Error(mismatch+" Switch Source to Planet procedural skin and back to Blender reference to inspect the current candidate, then copy a new link.");}
  buildActors();if(!wantsTemplate())releaseTemplate();updateText();labelSignature="";renderLabels();metricsPending=true;ready=true;$("status").textContent=mode==="composer"?composer.status():`${world.name} | ${dated.stage} | ${rigs.length} rigged actor${rigs.length===1?"":"s"}`;
 }catch(e){if(generation!==rebuildGeneration)return;error=e instanceof Error?e.message:String(e);disposeActors();$("status").textContent=`Creature lab error: ${error}`;$("notice").hidden=false;$("notice").textContent=`Could not load or display the requested specimen: ${error}`;}
}
// Package C rekey (contract §2.4): generateBiosphere now requires a
// bodyAddress. This lab has no real catalogue body behind it, so it keeps
// the demo-planet mode with a fixed placeholder address (see biosphere-lab.ts).
const LAB_DEMO_BODY_ADDRESS="creature-lab/demo-planet";
function regenerate(preserveInitial=false){try{world=generateBiosphere(seed.value.trim()||"LETHRA-BIOSPHERE-01",profile.value as PlanetProfile,LAB_DEMO_BODY_ADDRESS);date.value=String(preserveInitial?initialState.date:0);time=preserveInitial?initialState.time:0;timeSlider.value=String(time);skinTime.value=String(time);rebuild();}catch(e){error=e instanceof Error?e.message:String(e);ready=false;}}
function updateRigs(){if(mode==="composer"){composer.update(time);followEye();}poses=rigs.map(r=>{const p=r.rig.update(time,mode==="arena"?gait:"idle",mode==="arena"?terrain:"flat");return p;});if(mode==="arena"&&poses[0]&&rigs[0]){const p=poses[0].root,o=rigs[0].offset;const next=new THREE.Vector3(p[0]+o.x,p[1]+o.y+.7,p[2]+o.z);if(followed.lengthSq()===0)followed.copy(next);const delta=next.clone().sub(followed);camera.position.add(delta);controls.target.add(delta);followed.copy(next);}fitLabShadow();}
/** Keeps the eye in the close-up whenever the pose changes (playing, Pose time, Phase): the camera and its target move
 * with the eye centre (orbit and zoom kept). */
function followEye(){
 if(!eyeFollow||composer.focus()!=="eyes"||time===eyeFollowTime)return;
 eyeFollowTime=time;
 const e=composer.eyeFrame();if(!e)return;
 const delta=e.centre.clone().sub(eyeFollow);camera.position.add(delta);controls.target.add(delta);eyeFollow.copy(e.centre);
}
function skinDetails(){const out:{version:string;vertices:number;triangles:number;bones:number;features:unknown[];structuralTriangles:number;morphology:unknown}[]=[];for(const r of rigs)r.rig.group.traverse(o=>{if(o instanceof THREE.SkinnedMesh)out.push({version:o.geometry.userData.bodyVersion,vertices:o.geometry.getAttribute("position").count,triangles:(o.geometry.index?.count||0)/3,bones:o.skeleton.bones.length,features:structuredClone(o.geometry.userData.faceFeatures||[]),structuralTriangles:o.geometry.userData.structuralTriangleCount||0,morphology:structuredClone(o.geometry.userData.morphology||null)});});return out;}
function lightingDetails(){const p=lighting.preset;return {preset:p.id,label:p.label,fillKeyRatio:faunaReviewFillKeyRatio(p),exposure:renderer.toneMappingExposure,shadows:key.castShadow,keyIntensity:key.intensity,hemisphereIntensity:lighting.hemisphere.intensity,ambientIntensity:lighting.ambient.intensity,background:p.background,ground:p.ground};}
function exportJson(){const individuals=rigs.map(r=>({id:r.id,source:r.source,speciesId:r.species.id,genome:r.source==="procedural"?clone(r.genome):null}));const out={specimenUrl:creatureLabUrl(location.href,specimenState()),composer:mode==="composer"?composer.details():null,world,dated,mode,selectedSpeciesId,displayedSpeciesIds,time,gait,playing,terrain,actorCount,skinDetails:skinDetails(),authoredDetails:rigs.flatMap(r=>r.rig.diagnostics?[{...r.rig.diagnostics(),sidecarHash:templateCache?.sidecarHash??null}]:[]),settings:{variant:Number(variant.value),growth:growth.value,normalize:normalize.checked,neutral:neutral.checked,skeleton:skeleton.checked},individuals,poses,renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,memory:{...renderer.info.memory}},lighting:lightingDetails(),cpuMs};const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`creature-lab-${world.digest}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function specimenState():CreatureLabState{return {seed:world.seed,profile:world.profile,species:selectedSpeciesId,mode,variant:Number(variant.value),growth:growth.value as Growth,frame:skinFocus.value as "body"|"head",family:skinFamily.value as CreatureLabState["family"],view:skinView.value as CreatureLabState["view"],pose:skinPose.value as SkinPose,time,date:dated.dateMyr,compare:skinCompare.checked,compareVariant:Number(compareVariant.value),compareGrowth:compareGrowth.value as Growth,neutral:neutral.checked,skeleton:skeleton.checked,source:skinSource.value as CreatureLabState["source"],assetHash:wantsTemplate()?(expectedTemplateHash||(ready?templateCache?.sourceHash:"")||""):"",sidecarHash:wantsTemplate()?(expectedSidecarHash||(ready?templateCache?.sidecarHash:"")||""):"",replayVersion:wantsTemplate()&&ready?2:initialState.replayVersion,templateRecipe,morphLocks:lockedMorphs().join(","),...morphValues(),recipe:"",compareRecipe:"",composerSeed:initialState.composerSeed,motion:initialState.motion,herd:1,light:effectiveLight(),...(mode==="composer"?composer.state():{})} as CreatureLabState;}
$("share-specimen").onclick=async()=>{if(!ready||error){$("share-status").textContent="Load a valid specimen before copying its link.";return;}setSkinPlaying(false);composer.setPlaying(false);const url=creatureLabUrl(location.href,specimenState());history.replaceState(null,"",url);try{await navigator.clipboard.writeText(url);$("share-status").textContent="Specimen link copied.";$("share-fallback").hidden=true;}catch{$<HTMLInputElement>("share-link").value=url;$("share-fallback").hidden=false;$<HTMLInputElement>("share-link").select();$("share-status").textContent="Select and copy this specimen link.";}};
function setSkinPlaying(value:boolean){skinPlaying=value;$("skin-play").textContent=skinPlaying?"Pause pose":"Play pose";}
$("skin-play").onclick=()=>setSkinPlaying(!skinPlaying);
skinSource.onchange=()=>{expectedTemplateHash="";expectedSidecarHash="";replayInputError=null;setSkinPlaying(false);rebuild();};
function applyMorphSliders(){setSkinPlaying(false);refreshMorphLabels();if(!wantsTemplate())return;for(const r of rigs)r.rig.setMorphs?.(morphValues());for(const r of rigs){r.offset.set(0,0,0);r.rig.group.position.set(0,0,0);}updateRigs();arrangeSkinComparison();fitCamera();metricsPending=true;}
for(const id of FAUNA_TEMPLATE_CONTROLS){
 morphControls[id].oninput=()=>{templateRecipe="manual";applyMorphSliders();};
 morphLocks[id].onchange=refreshRecipeStatus;
}
$("template-apply-recipe").onclick=()=>{if(!wantsTemplate())return;templateRecipe=DEER_INDIVIDUAL_RECIPE;lastRecipeIdentity=JSON.stringify(recipeIdentity());writeRecipeValues();applyMorphSliders();};
$("template-reset").onclick=()=>{templateRecipe="manual";for(const id of FAUNA_TEMPLATE_CONTROLS){morphControls[id].value="0";morphLocks[id].checked=false;}applyMorphSliders();};
lightSelect.onchange=()=>{inputNotices=inputNotices.filter(n=>!/^Lighting/.test(n));showInputNotices();if(lightInputError&&mode==="skin"){lightInputError=null;rebuild();return;}applyLighting();};
function showInputNotices(){const el=$("input-notices"),list=mode==="skin"?inputNotices.filter(n=>/^Lighting/.test(n)):[];el.hidden=!list.length;el.textContent=list.join(" ");}
skinFamily.onchange=rebuild;skinView.onchange=()=>skinCompare.checked?rebuild():fitCamera();skinPose.onchange=rebuild;skinCompare.onchange=rebuild;compareVariant.onchange=rebuild;compareGrowth.onchange=rebuild;
function setMode(v:Mode){mode=v;modeSelect.value=v;$<HTMLInputElement>("skin-time").value=String(time);rebuild();}
$<HTMLSelectElement>("skin-focus").onchange=fitCamera;
$<HTMLInputElement>("skin-time").oninput=()=>{const value=Number($<HTMLInputElement>("skin-time").value);if(Number.isFinite(value)){setSkinPlaying(false);time=Math.max(0,Math.min(120,value));updateRigs();if($<HTMLSelectElement>("skin-focus").value==="head")fitCamera();metricsPending=true;}};
$("regenerate").onclick=()=>regenerate();seed.onkeydown=e=>{if(e.key==="Enter")regenerate();};profile.onchange=()=>regenerate();date.onchange=rebuild;modeSelect.onchange=()=>setMode(modeSelect.value as Mode);speciesSelect.onchange=()=>{selectedSpeciesId=speciesSelect.value;rebuild();};normalize.onchange=rebuild;skeleton.onchange=rebuild;neutral.onchange=rebuild;variant.onchange=rebuild;growth.onchange=rebuild;gaitSelect.onchange=()=>{gait=gaitSelect.value as CreatureGait;};terrainSelect.onchange=()=>{terrain=terrainSelect.value as TerrainKind;rebuild();};crowdSelect.onchange=()=>{actorCount=Number(crowdSelect.value);rebuild();};$("play").onclick=()=>{playing=!playing;$("play").textContent=playing?"Pause":"Play";};$("reset").onclick=()=>{time=0;timeSlider.value="0";updateRigs();};timeSlider.onfocus=()=>{playing=false;$("play").textContent="Play";};timeSlider.oninput=()=>{time=Number(timeSlider.value);playing=false;$("play").textContent="Play";updateRigs();};$("export-json").onclick=exportJson;
function layout(){const vp=$("viewport"),panel=document.querySelector<HTMLElement>(".side-panel"),labels=$("creature-labels"),header=document.querySelector<HTMLElement>(".topbar"),bottom=innerWidth<=850&&panel?`${Math.ceil(panel.getBoundingClientRect().height)}px`:"32px",top=`${Math.ceil(header?.getBoundingClientRect().height||82)}px`;vp.style.top=top;vp.style.bottom=bottom;labels.style.top=top;labels.style.bottom=bottom;camera.aspect=Math.max(1,vp.clientWidth)/Math.max(1,vp.clientHeight);camera.updateProjectionMatrix();renderer.setSize(Math.max(1,vp.clientWidth),Math.max(1,vp.clientHeight));if(ready)fitCamera();}addEventListener("resize",layout);const layoutObserver=new ResizeObserver(()=>layout());layoutObserver.observe(document.querySelector<HTMLElement>(".side-panel")!);layoutObserver.observe(document.querySelector<HTMLElement>(".topbar")!);
Object.defineProperty(window,"__creatureLab",{configurable:false,writable:false,value:{get ready(){return ready;},get error(){return error||null;},get world(){return clone(world);},get dated(){return clone(dated);},get mode(){return mode;},get selectedSpeciesId(){return selectedSpeciesId;},get displayedSpeciesIds(){return [...displayedSpeciesIds];},get time(){return time;},get gait(){return gait;},get playing(){return playing;},get skinPlaying(){return skinPlaying;},get terrain(){return terrain;},get actorCount(){return rigs.length;},get poses(){return clone(poses);},get skinDetails(){return skinDetails();},get authoredDetails(){return rigs.flatMap(r=>r.rig.diagnostics?[{...r.rig.diagnostics(),sidecarHash:templateCache?.sidecarHash??null}]:[]);},get specimenState(){return specimenState();},get specimenUrl(){return creatureLabUrl(location.href,specimenState());},get individuals(){return rigs.map(r=>({id:r.id,speciesId:r.species.id,genome:r.source==="procedural"?clone(r.genome):null,source:r.source,scale:r.rig.group.scale.toArray()}));},get renderer(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,memory:{...renderer.info.memory}};},get cpuMs(){return cpuMs;},get fps(){return fps;},get composer(){return mode==="composer"?composer.details():null;},get eyeView(){return mode==="composer"&&composer.focus()==="eyes"?composer.eyeView(camera):null;},get camera(){camera.updateMatrixWorld();return {position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,aspect:camera.aspect,near:camera.near,projectionMatrix:camera.projectionMatrix.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray()};},get lighting(){return lightingDetails();}}});
function frame(now:number){const start=performance.now(),dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;if(skinPlaying&&mode==="skin"){time=(time+dt)%120;skinTime.value=time.toFixed(2);}if(playing&&mode==="arena"){time=(time+dt)%20;timeSlider.value=time.toFixed(2);}if(mode==="composer"&&composer.playing){time=(time+dt)%120;composer.syncTime(time);}updateRigs();controls.update();positionCreatureLabels();renderer.render(scene,camera);cpuMs=performance.now()-start;if(metricsPending){metricsPending=false;updateMetrics();}frameN++;if(now-lastFps>500){fps=frameN*1000/(now-lastFps);frameN=0;lastFps=now;updateMetrics();}requestAnimationFrame(frame);}
layout();regenerate(true);layout();requestAnimationFrame(frame);
function renderLabels(){const layer=$("creature-labels"),ids=mode==="gallery"||mode==="ancestry"?displayedSpeciesIds:[],signature=`${mode}/${dated?.dateMyr}/${ids.join("/")}`;if(signature===labelSignature)return;labelSignature=signature;layer.className=mode;layer.innerHTML=ids.map(id=>{const s=animals().find(x=>x.id===id);return s?`<button class="creature-card ${isExtant(s)?"":"archive"}" data-creature-id="${esc(id)}">${esc(s.name)}<span>${s.birthMyr} Myr · ${isExtant(s)?"EXTANT":"ARCHIVE"}</span></button>`:"";}).join("");layer.querySelectorAll<HTMLButtonElement>("[data-creature-id]").forEach(b=>b.onclick=()=>{selectedSpeciesId=b.dataset.creatureId!;speciesSelect.value=selectedSpeciesId;mode="anatomy";modeSelect.value=mode;rebuild();});positionCreatureLabels();}
function positionCreatureLabels(){const layer=$("creature-labels");if(mode!=="gallery"&&mode!=="ancestry")return;const lr=layer.getBoundingClientRect(),v=new THREE.Vector3(),box=new THREE.Box3();for(let i=0;i<rigs.length;i++){const card=layer.querySelector<HTMLElement>(`[data-creature-id="${CSS.escape(rigs[i]!.species.id)}"]`);if(!card)continue;box.setFromObject(rigs[i]!.rig.group);box.getCenter(v);v.y=box.min.y-.08;v.project(camera);card.style.left=`${(v.x+1)*.5*lr.width}px`;card.style.top=`${(1-v.y)*.5*lr.height+4}px`;}}
addEventListener("creature-label-refresh",renderLabels);renderLabels();
