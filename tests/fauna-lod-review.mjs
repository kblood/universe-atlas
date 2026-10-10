import * as THREE from 'three';
import {faunaBodyGeometry} from '../src/fauna-near-rig.ts';
import {createFaunaMaterial} from '../src/fauna-material.ts';
const data=await fetch('/test-results/animal-lod-review/data.json').then(r=>r.json());
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1440,1080);renderer.autoClear=false;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#25313b');scene.add(new THREE.HemisphereLight(0xffffff,0x63564c,2.5));const light=new THREE.DirectionalLight(0xfff3df,3);light.position.set(5,8,9);scene.add(light);
let camera=new THREE.OrthographicCamera(-2,2,2,-2,.01,100);const maskMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
const target=new THREE.WebGLRenderTarget(360,360,{depthBuffer:true}),rigs=new Map();let last;
const decode=s=>({...s,positions:new Float32Array(s.positions),normals:new Float32Array(s.normals),colors:new Uint8Array(s.colors),skinIndex:new Uint8Array(s.skinIndex),skinWeight:new Uint8Array(s.skinWeight),index:new Uint32Array(s.index)});
function rigFor(row,level,key){
  if(rigs.has(key))return rigs.get(key);
  const bones=row.plan.bones.map(()=>new THREE.Bone());row.plan.bones.forEach((b,i)=>{const parent=b.parent>=0?row.plan.bones[b.parent].rest:[0,0,0];bones[i].position.set(...b.rest.map((v,c)=>v-parent[c]));if(b.parent>=0)bones[b.parent].add(bones[i]);});bones[0].updateMatrixWorld(true);
  const skeleton=new THREE.Skeleton(bones,row.plan.bones.map(b=>new THREE.Matrix4().makeTranslation(...b.rest.map(v=>-v))));
  const mesh=new THREE.SkinnedMesh(faunaBodyGeometry(decode({...level,plan:row.plan})),createFaunaMaterial(true));mesh.bind(skeleton,new THREE.Matrix4());mesh.add(bones[0]);mesh.frustumCulled=false;
  const rig={mesh,bones,skeleton};rigs.set(key,rig);return rig;
}
function poseRig(rig,pose){const positions=Object.values(pose.pose.positions),quats=Object.values(pose.pose.quaternions);rig.bones.forEach((bone,i)=>{bone.position.fromArray(positions,i*3);bone.quaternion.fromArray(quats,i*4);});rig.bones[0].updateMatrixWorld(true);rig.skeleton.update();
  const differences=[...rig.skeleton.boneMatrices].flatMap((v,i)=>i<pose.palette.length&&!Object.is(v,pose.palette[i])?[{i,actual:v,expected:pose.palette[i]}]:[]);
  if(rig.skeleton.boneMatrices.slice(pose.palette.length).some(v=>v!==0))throw new Error('Nonzero padded bone texture slots');
  if(differences.length)throw new Error('Canonical palette mismatch '+JSON.stringify(differences.slice(0,4)));
}
function pixels(mesh,mask){scene.add(mesh);scene.overrideMaterial=mask?maskMaterial:null;renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setViewport(0,0,360,360);scene.background.set(mask?'#000000':'#25313b');renderer.clear();renderer.render(scene,camera);const pixels=new Uint8Array(360*360*4);renderer.readRenderTargetPixels(target,0,0,360,360,pixels);scene.remove(mesh);return pixels;}
function metrics(sourceMask,mask,sourceLit,lit){let union=0,intersection=0,sourceCount=0,retained=0,colour=0,footUnion=0,footIntersection=0;let yMin=360,yMax=0;
  for(let i=0;i<360*360;i++)if(sourceMask[i*4]>0){const y=Math.floor(i/360);yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);}
  const footTop=yMin+(yMax-yMin)*.22;
  for(let i=0;i<360*360;i++){const s=sourceMask[i*4]>0,c=mask[i*4]>0;if(s)sourceCount++;if(s||c)union++;if(s&&c){intersection++;retained++;for(let ch=0;ch<3;ch++)colour+=Math.abs(sourceLit[i*4+ch]-lit[i*4+ch]);}
    if(Math.floor(i/360)<=footTop){if(s||c)footUnion++;if(s&&c)footIntersection++;}
  }
  return {silhouetteIoU:union?intersection/union:1,sourceSilhouettePixels:sourceCount,retainedSourceFraction:sourceCount?retained/sourceCount:1,
    footRegionIoU:footUnion?footIntersection/footUnion:1,colourMeanAbsoluteChannelErrorOnOverlap:retained?colour/(retained*3):0,
    colourScope:'lit RGB includes changed normals/lighting and coat interpolation; not an isolated coat field metric',footScope:'bottom22% of source projected silhouette; review contact anatomy independently'};
}
async function review(rowIndex,poseName='rest',view='side'){
  const row=data.rows[rowIndex],pose=row.poses.find(p=>p.name===poseName),source=rigFor(row,row.source,rowIndex+'/source');poseRig(source,pose);
  source.mesh.computeBoundingBox();
  const box=new THREE.Box3().setFromObject(source.mesh),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z)*.64;
  const distance=view.startsWith('distance')?Number(view.slice(8)):null;
  if(distance){camera=new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(48)/2)*360/1000)),1,.01,1000);
    camera.position.copy(center).add(new THREE.Vector3(0,.25,1).normalize().multiplyScalar(distance));}
  else{camera=new THREE.OrthographicCamera(-span,span,span,-span,.01,100);camera.position.copy(center).add(view==='front'?new THREE.Vector3(12,0,0):new THREE.Vector3(0,0,12));}
  camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const sourceMask=pixels(source.mesh,true),sourceLit=pixels(source.mesh,false),panels=[];
  if(!sourceMask.some((v,i)=>i%4===0&&v>0))throw new Error('Empty source silhouette');
  for(let i=0;i<360;i++)if(sourceMask[i*4]>0||sourceMask[((359*360)+i)*4]>0||sourceMask[(i*360)*4]>0||sourceMask[(i*360+359)*4]>0)throw new Error('Source silhouette clips the review viewport');
  const methods=[{method:'full source',levels:[{target:1500,...row.source},{target:750,...row.source},{target:500,...row.source}]},...row.chains];
  renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,1440,1080);renderer.clear();
  for(let column=0;column<methods.length;column++)for(let band=0;band<3;band++){
    const method=methods[column],level=method.levels[band],rig=column===0?source:rigFor(row,level,`${rowIndex}/${column}/${band}`);poseRig(rig,pose);
    const mask=pixels(rig.mesh,true),lit=pixels(rig.mesh,false);
    panels.push({method:method.method,target:level.target,reached:level.reached,triangles:level.triangleCount??row.triangleCount,vertices:level.vertexCount??row.vertexCount,...metrics(sourceMask,mask,sourceLit,lit)});
    renderer.setRenderTarget(null);renderer.setViewport(column*360,(2-band)*360,360,360);renderer.setScissor(column*360,(2-band)*360,360,360);renderer.setScissorTest(true);scene.background.set('#25313b');scene.add(rig.mesh);renderer.clear();renderer.render(scene,camera);scene.remove(rig.mesh);
  }
  renderer.setScissorTest(false);last={id:row.id,pose:poseName,view,sourceDigest:row.sourceDigest,panels,
    ...(distance?{pixelScale:{distanceM:distance,runtimeFovDegrees:48,runtimeHeightPx:1000,panelCropPx:360,cropFovDegrees:camera.fov,scope:'central pixel-equivalent crop; standalone flat-ground body view, not actual planetary camera'}}:{})};
  document.getElementById('label').textContent=`${row.archetype} ${row.stage} | ${poseName} ${view} | columns: ${methods.map(m=>m.method).join(' / ')} | rows:1500 /750 /500 triangle targets`;return last;
}
window.__animalLodReview={ready:true,review,get last(){return last;},get count(){return data.rows.length;},renderer};await review(0);
