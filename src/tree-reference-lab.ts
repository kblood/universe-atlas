import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadTreeAssetFamily,type TreeAssetFamily} from './tree-asset.ts';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(1);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#a6bfd0');
const camera=new THREE.PerspectiveCamera(50,1,.1,20000);const controls=new OrbitControls(camera,renderer.domElement);
const sun=new THREE.DirectionalLight(0xfff6e5,3);sun.position.set(-30,55,25);scene.add(sun);
scene.add(new THREE.HemisphereLight(0xc4dcf0,0x41472c,1));
let family:TreeAssetFamily|undefined,atlas:ReturnType<TreeAssetFamily['createBatch']>|undefined;
let references=new Map<string,THREE.Group>(),referenceTextures:THREE.Texture[]=[],referenceMaterials:THREE.MeshStandardMaterial[]=[];
let mode='atlas',detail='full',normalMode='source',population=1,height=16,manifest:any,loading=false,measuring=false;
function requireIdle(){if(measuring)throw new Error('Measurement already in progress');}
const status=document.getElementById('status')!;
async function sha(data:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');}
function geometry(data:any){
  if(!Array.isArray(data.position)||data.position.length<9||data.position.length%3||data.position.length>65535*3||data.normal?.length!==data.position.length||data.uv?.length!==data.position.length/3*2||!Array.isArray(data.index)||data.index.length%3||data.index.length>300000)throw new Error('Invalid reference geometry shape');
  if([...data.position,...data.normal,...data.uv].some(x=>!Number.isFinite(x)||Math.abs(x)>100000)||data.index.some((x:number)=>!Number.isInteger(x)||x<0||x>=data.position.length/3))throw new Error('Invalid reference geometry values');
  const g=new THREE.BufferGeometry();for(const [key,size] of [['position',3],['normal',3],['uv',2]] as const)g.setAttribute(key,new THREE.Float32BufferAttribute(data[key],size));
  g.setIndex(data.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData.sourceNormals=g.attributes.normal.array.slice();return g;
}
function dispose(){
  for(const group of references.values()){for(const child of group.children as THREE.InstancedMesh[]){child.geometry.dispose();child.dispose();}group.removeFromParent();}
  references.clear();for(const material of referenceMaterials)material.dispose();for(const texture of referenceTextures)texture.dispose();referenceMaterials=[];referenceTextures=[];
  atlas?.dispose();family?.dispose();atlas=undefined;family=undefined;
}
function show(){
  if(atlas)atlas.group.visible=mode==='atlas';for(const [id,group] of references)group.visible=mode==='reference'&&id===detail;
  status.textContent=manifest?JSON.stringify({preset:manifest.preset,heightM:height,population,mode,detail,normalMode,
    sourceRevision:manifest.source.revision,
    texturePolicy:'Atlas bark maps; Atlas top-left foliage tile on 1.2m square reference cards, V flipped so the sprig stem meets the attachment. Atlas native cards are 1x1.2m.',
    limits:'Static shape/LOD comparison. No external textures, source wind, shadow casting or game integration.',
    geometry:manifest.metrics.lods.map((l:any)=>({id:l.id,triangles:l.triangles,height:l.bounds.max[1]}))},null,2):'Awaiting files.';
}
function setMode(value:string){requireIdle();if(!['atlas','reference'].includes(value))throw new Error('Invalid mode');mode=value;(document.getElementById('mode') as HTMLSelectElement).value=value;show();}
function setDetail(value:string){requireIdle();if(!['full','wood-reduced','upstream-lod1','upstream-lod2'].includes(value))throw new Error('Invalid detail');detail=value;(document.getElementById('detail') as HTMLSelectElement).value=value;show();}
function setNormals(value:string){
  requireIdle();if(!['source','geometric'].includes(value))throw new Error('Invalid normal mode');normalMode=value;
  for(const group of references.values()){
    const g=(group.children[1] as THREE.Mesh).geometry;
    if(value==='geometric')g.computeVertexNormals();else {const normal=g.attributes.normal as THREE.BufferAttribute;normal.array.set(g.userData.sourceNormals);normal.needsUpdate=true;}
  }
  (document.getElementById('normals') as HTMLSelectElement).value=value;show();
}
function setPopulation(value:number,reframe=true){
  requireIdle();if(![1,3,64,192].includes(value))throw new Error('Invalid population');population=value;
  if(!atlas)return;
  atlas.setCount(0);const cols=Math.ceil(Math.sqrt(value)),rows=Math.ceil(value/cols),matrix=new THREE.Matrix4();
  for(let i=0;i<value;i++){
    const x=value===1?0:(i%cols-(cols-1)/2)*22,z=value===1?0:(Math.floor(i/cols)-(rows-1)/2)*22;
    matrix.makeTranslation(x,0,z);atlas.setInstance(i,matrix,height,0);
    for(const group of references.values())for(const mesh of group.children as THREE.InstancedMesh[]){mesh.setMatrixAt(i,matrix);mesh.count=value;mesh.instanceMatrix.needsUpdate=true;}
  }
  if(reframe){camera.position.set(value===1?24:cols*15,value===1?12:cols*8,value===1?36:cols*26);controls.target.set(0,height*.5,0);controls.update();}
  (document.getElementById('population') as HTMLSelectElement).value=String(value);show();
}
async function load(a:ArrayBuffer,b:ArrayBuffer,m:any,read:(path:string)=>Promise<ArrayBuffer>){
  requireIdle();if(loading)throw new Error('Load already in progress');loading=true;
  let nextFamily:TreeAssetFamily|undefined,nextAtlas:typeof atlas;const nextGroups=new Map<string,THREE.Group>(),nextTextures:THREE.Texture[]=[],nextMaterials:THREE.MeshStandardMaterial[]=[];
  try{
    if(m.operation!=='atlas-ez-tree-reference-1'||m.source?.revision!=='dcf309bd86bd521083d9c70f01f2de45fdc7c457'||!Number.isFinite(m.height)||m.height<10||m.height>22||!Array.isArray(m.artifacts))throw new Error('Unsupported reference manifest');
    nextFamily=await loadTreeAssetFamily(a,b);
    if(nextFamily.lods[0][0].material.name!=='MAT_AtlasBark'||nextFamily.lods[0][1].material.name!=='MAT_AtlasFoliage')throw new Error('Unexpected Atlas material roles');
    nextFamily.setDate(0n);nextAtlas=nextFamily.createBatch(0,192);
    for(const source of nextFamily.lods[0]){const mat=source.material.clone();mat.onBeforeCompile=()=>{};mat.customProgramCacheKey=()=> 'atlas-reference-material-1';nextMaterials.push(mat);}
    // Reuse one original Atlas foliage tile. Clone texture transforms without
    // taking ownership of the family's shared ImageBitmap source. EZ-Tree v=0
    // is the attachment edge; the unflipped glTF image stores stems at the
    // bottom of each tile. Reverse V within this tile to join stem to branch.
    for(const key of ['map','normalMap'] as const){
      const texture=nextMaterials[1][key]?.clone();if(texture){texture.repeat.set(.25,-.25);texture.offset.set(0,.25);texture.needsUpdate=true;nextMaterials[1][key]=texture;nextTextures.push(texture);}
    }
    for(const id of ['full','wood-reduced','upstream-lod1','upstream-lod2']){
      const path=`${id}.json`,record=m.artifacts.find((r:any)=>r.path===path);
      if(!record||record.bytes>32*1024*1024)throw new Error('Missing or oversized reference LOD');const bytes=await read(path);
      if(bytes.byteLength!==record.bytes||await sha(bytes)!==record.sha256)throw new Error('Reference LOD hash mismatch');
      const data=JSON.parse(new TextDecoder().decode(bytes)),group=new THREE.Group();nextGroups.set(id,group);
      for(const [i,part] of [data.wood,data.leaves].entries()){
        const mesh=new THREE.InstancedMesh(geometry(part),nextMaterials[i],192);mesh.count=0;mesh.frustumCulled=false;group.add(mesh);
      }
      const triangles=(data.wood.index.length+data.leaves.index.length)/3;
      if(data.id!==id||data.triangles!==triangles||m.metrics?.lods?.find((l:any)=>l.id===id)?.triangles!==triangles)throw new Error('Reference triangle metadata mismatch');
    }
  }catch(error){
    for(const group of nextGroups.values())for(const child of group.children as THREE.InstancedMesh[]){child.geometry.dispose();child.dispose();}
    for(const material of nextMaterials)material.dispose();for(const texture of nextTextures)texture.dispose();nextAtlas?.dispose();nextFamily?.dispose();throw error;
  }finally{loading=false;}
  dispose();family=nextFamily;atlas=nextAtlas;references=nextGroups;referenceTextures=nextTextures;referenceMaterials=nextMaterials;manifest=m;height=m.height;
  scene.add(atlas!.group,...references.values());setNormals(normalMode);setPopulation(population);show();
}
/** CPU submission and GPU elapsed render measurements; no full-game claim. */
async function measure(frames=60){
  requireIdle();if(loading||!family||!Number.isInteger(frames)||frames<10||frames>180)throw new Error('Invalid measurement');
  measuring=true;const orbitEnabled=controls.enabled;controls.enabled=false;
  renderer.setAnimationLoop(null);const gl=renderer.getContext() as WebGL2RenderingContext,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),cpu:number[]=[],queries:WebGLQuery[]=[];
  try{
    for(let i=0;i<20;i++){renderer.render(scene,camera);await new Promise(requestAnimationFrame);}
    for(let i=0;i<frames;i++){
      const q=ext?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
      const start=performance.now();try{renderer.render(scene,camera);}finally{if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push(q);}}
      cpu.push(performance.now()-start);await new Promise(requestAnimationFrame);
    }
    const gpu:number[]=[];
    for(let wait=0;queries.length&&wait<120;wait++){
      if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw new Error('Disjoint GPU measurement');
      while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift()!;gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
      if(queries.length)await new Promise(requestAnimationFrame);
    }
    if(queries.length)throw new Error('GPU query timeout');
    const stats=(x:number[])=>{const s=x.slice().sort((a,b)=>a-b);return s.length?{median:s[Math.floor(s.length*.5)],p95:s[Math.min(s.length-1,Math.floor(s.length*.95))]}:null;};
    return {mode,detail,population,normalMode,frames,canvas:{width:renderer.domElement.width,height:renderer.domElement.height,pixelRatio:renderer.getPixelRatio(),devicePixelRatio},cpuSubmissionMs:stats(cpu),gpuMs:stats(gpu),render:{...renderer.info.render},memory:{...renderer.info.memory},glError:gl.getError()};
  }finally{for(const q of queries)gl.deleteQuery(q);controls.enabled=orbitEnabled;measuring=false;renderer.setAnimationLoop(()=>renderer.render(scene,camera));}
}
document.getElementById('load')!.onclick=async()=>{
  try{
    const a=(document.getElementById('lod0') as HTMLInputElement).files?.[0],b=(document.getElementById('lod1') as HTMLInputElement).files?.[0],files=Array.from((document.getElementById('reference') as HTMLInputElement).files??[]);
    const mf=files.find(f=>f.webkitRelativePath.split('/').length===2&&f.name==='reference-manifest.json');if(!a||!b||!mf)throw new Error('Select Atlas pair and reference directory');
    const map=new Map(files.map(f=>[f.webkitRelativePath.split('/').slice(1).join('/'),f]));await load(await a.arrayBuffer(),await b.arrayBuffer(),JSON.parse(await mf.text()),async p=>{const file=map.get(p);if(!file)throw new Error(`Missing ${p}`);return file.arrayBuffer();});
  }catch(error){status.textContent=String(error);}
};
for(const [id,action] of [['mode',setMode],['detail',setDetail],['normals',setNormals]] as const)document.getElementById(id)!.onchange=e=>action((e.target as HTMLSelectElement).value);
document.getElementById('population')!.onchange=e=>setPopulation(Number((e.target as HTMLSelectElement).value));
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();setPopulation(1);
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
Object.assign(window,{__treeReferenceLab:{load,setMode,setDetail,setNormals,setPopulation,measure,renderer,scene,camera,controls,sun,get manifest(){return manifest;},get ready(){return !!family&&!loading;}}});
