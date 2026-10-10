import * as THREE from 'three';
import {FaunaFieldRenderer} from '../src/fauna-field-renderer.ts';
import {FaunaSkinnedBatch,FaunaBonePaletteWriter} from '../src/fauna-skinned-batch.ts';
import {FaunaLodPoseWriter} from '../src/fauna-lod-pose.ts';
import {faunaMemberActivityAtWorldNs} from '../src/fauna-runtime.ts';
import {createFaunaMaterial} from '../src/fauna-material.ts';
import {faunaBodyGeometry} from '../src/fauna-near-rig.ts';
const streaming=new URLSearchParams(location.search),paletteRingSize=Number(streaming.get('paletteRingSize')||1),paletteUploadMode=streaming.get('paletteUploadMode')||'full';
const data=await fetch(streaming.get('data')||'/test-results/body-lod-assets/data.json').then(r=>r.json());
const movingStride=Number(streaming.get('movingStride')||1);
if(!Number.isInteger(movingStride)||movingStride<1||movingStride>128)throw new Error('Invalid moving stride');
let method='existing-qem';
function selectMethod(next){method=next;for(const row of data.rows)if(row.chains){const chain=row.chains.find(c=>c.method===method);if(!chain)throw new Error('Unknown frozen LOD method '+method);row.name=row.id;row.levels=chain.levels.map(l=>({...l,plan:row.plan}));}}
selectMethod(method);
const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(1440,1000);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#242b34');
scene.add(new THREE.HemisphereLight(0xeaf5ff,0x2b241d,2));
const light=new THREE.DirectionalLight(0xfff0dc,3);light.position.set(35,90,55);light.castShadow=true;
light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-80;light.shadow.camera.right=80;light.shadow.camera.top=130;light.shadow.camera.bottom=-80;light.shadow.camera.far=250;scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,220),new THREE.MeshStandardMaterial({color:'#69735d',roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.set(30,-.02,55);ground.receiveShadow=true;scene.add(ground);
const camera=new THREE.PerspectiveCamera(48,1.44,.1,500);camera.position.set(32,85,165);camera.lookAt(32,0,62);
let active=null,mode='body2',target=500,count=512,paused=true,frame=0,lastCpu=0,poseMode='canonical',handles=[],restPose=false;
const origin=new THREE.Vector3(),root=new THREE.Matrix4(),writer=new FaunaBonePaletteWriter(),cheap=new FaunaLodPoseWriter();
const members=Array.from({length:512},(_,i)=>({id:'lab/'+i,anchorOffsetX:0,anchorOffsetZ:0,orbitRadiusM:4,
  orbitAngularSpeed:.1,orbitPhase:i*.1,gaitPeriodS:12}));
const keys=members.map(()=>({})),palettes=members.map(()=>new Float32Array(22*16));
const decode=l=>({...l,positions:new Float32Array(l.positions),normals:new Float32Array(l.normals),colors:new Uint8Array(l.colors),
  skinIndex:new Uint8Array(l.skinIndex),skinWeight:new Uint8Array(l.skinWeight),index:new Uint16Array(l.index)});
function choose(next,nextTarget=500,n=512,nextMethod=method){selectMethod(nextMethod);active?.dispose();mode=next;target=nextTarget;count=n;frame=0;
  if(mode==='body2')active=new FaunaFieldRenderer({bodyPlan:true});
  else if(mode==='source'){
    if(count!==6)throw new Error('Full source is a six-specimen rest gallery, not a field renderer');
    const group=new THREE.Group(),meshes=[];
    for(let i=0;i<count;i++){
      const d=decode(data.rows[i].source),bones=d.plan.bones.map(()=>new THREE.Bone());
      d.plan.bones.forEach((b,j)=>{const parent=b.parent>=0?d.plan.bones[b.parent].rest:[0,0,0];bones[j].position.set(...b.rest.map((v,k)=>v-parent[k]));if(b.parent>=0)bones[b.parent].add(bones[j]);});
      bones[0].updateMatrixWorld(true);
      const skeleton=new THREE.Skeleton(bones,d.plan.bones.map(b=>new THREE.Matrix4().makeTranslation(-b.rest[0],-b.rest[1],-b.rest[2])));
      const mesh=new THREE.SkinnedMesh(faunaBodyGeometry(d),createFaunaMaterial(true));mesh.bindMode=THREE.DetachedBindMode;mesh.bind(skeleton,new THREE.Matrix4());
      mesh.position.x=i*4;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh);
    }
    active={group,dispose(){meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();m.skeleton.dispose();});group.removeFromParent();}};
  }
  else{active=new FaunaSkinnedBatch({capacity:count,maxVerticesPerAnimal:target===1500?900:target===500?500:200,maxIndicesPerAnimal:target*3,maxGeometryEntries:data.rows.length,maxBufferBytes:count>128?64*1024*1024:16*1024*1024,paletteRingSize,paletteUploadMode});
    data.rows.forEach((r,i)=>{const l=r.levels.find(l=>l.target===target);if(!active.registerGeometry('sample/'+i,decode(l)))throw new Error('LOD admission failed');});
    for(let i=0;i<count;i++)if(!active.prepareAnimal(members[i].id,'sample/'+(i%data.rows.length)))throw new Error('Actor admission failed');
    handles=members.map((m,i)=>cheap.prepare(data.rows[i%data.rows.length].levels.find(l=>l.target===target).plan,m));
  }scene.add(active.group);document.getElementById('label').textContent=`Prototype only | ${mode==='body2'?'current body2 four primitive batches':mode==='source'?'loaded full source':`derived target ${target}`} | ${count} animals`;
}
function update(){const start=performance.now(),seconds=restPose?0:paused?2:++frame/60;
  if(mode==='source'){for(const mesh of active.group.children)mesh.skeleton.update();lastCpu=performance.now()-start;return;}
  active.beginFrame(origin);
  for(let i=0;i<count;i++){
    const row=data.rows[i%data.rows.length],memberSeconds=restPose?0:paused||i%movingStride?2:seconds,
      activity=faunaMemberActivityAtWorldNs(members[i],BigInt(Math.round(memberSeconds*1e9)));
    root.makeTranslation((i%16)*4,0,Math.floor(i/16)*4);
    if(mode==='body2')active.submit(row.genome,root,memberSeconds,restPose?'idle':activity.pose.gait,30,keys[i],restPose?0:activity.stateS);
    else{const level=row.levels.find(l=>l.target===target),palette=palettes[i];
      if(restPose)for(let bone=0;bone<22;bone++)new THREE.Matrix4().toArray(palette,bone*16);
      else if(poseMode==='approximate')cheap.write(handles[i],activity,memberSeconds,palette);
      else writer.pose({member:members[i],activity,ground:()=>0,rigSeconds:memberSeconds},level.plan,palette);
      active.submit(members[i].id,root,palette);}
  }active.endFrame();lastCpu=performance.now()-start;
}
choose('body2');renderer.setAnimationLoop(()=>{update();renderer.render(scene,camera);});
window.__lodLab={renderer,scene,camera,choose,setPaused(value){paused=value;},setPoseMode(value){poseMode=value;handles.forEach(h=>cheap.invalidate(h));},
  setRestPose(value){restPose=value;handles.forEach(h=>cheap.invalidate(h));},
  closeup(sample=0){choose(mode,target,6);camera.position.set(sample*4+7,3.5,9);camera.lookAt(sample*4,1,0);},
  field(){const rows=Math.ceil(count/16),z=(rows-1)*2;camera.position.set(32,count>128?85:45,z+(count>128?103:75));camera.lookAt(32,0,z);},
  info(){return {mode,method,poseMode,target,count,lastCpu,sourceModuleDigest:data.moduleDigest,render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},
    batches:active.group.children.map(m=>({name:m.name,instances:m.count,triangles:(m.geometry.index?.count||m.geometry.attributes.position.count)/3})),
    backend:active.diagnostics?.(),rows:data.rows.map(r=>({name:r.name,genome:r.genome,level:r.levels.find(l=>l.target===target)?.quality}))};}};
