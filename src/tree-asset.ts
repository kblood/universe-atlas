import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {phaseFromPeriod} from './world-time.ts';
import {installLeafTransmission,type LeafTransmissionOptions} from './tree-leaf-transmission.ts';
import {InstanceUpdateRanges} from './instance-update-ranges.ts';
import {installTreeForestCoverage} from './tree-forest-coverage.ts';
import {quantizeForestCoverage} from './forest-coverage.ts';
import {attachLocalAerial} from './local-aerial-perspective.ts';

/** Experimental author-6 adapter. Assets are supplied explicitly; this does not
 * replace the canonical forest or invent a second species catalogue. */
export const TREE_REFERENCE_HEIGHT_M=16;
export const TREE_WIND_PERIOD_NS=7_000_000_000n;
export const treeWindPhase=(date:bigint)=>phaseFromPeriod(date,TREE_WIND_PERIOD_NS);

type GLBDocument={json:any;binary:Uint8Array};
function readGLB(buffer:ArrayBuffer):GLBDocument {
  const view=new DataView(buffer);
  if(buffer.byteLength<28||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw new Error('Expected a complete glTF 2 GLB');
  const length=view.getUint32(12,true),start=20+length;
  if(view.getUint32(16,true)!==0x4e4f534a||start+8>buffer.byteLength||view.getUint32(start+4,true)!==0x004e4942||start+8+view.getUint32(start,true)!==buffer.byteLength)throw new Error('Expected JSON and embedded binary chunks');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
  if(json.buffers?.length!==1||json.buffers[0].uri||json.extensionsRequired?.length)throw new Error('Only self-contained author-6 GLBs are supported');
  if(json.nodes?.length!==1||json.nodes[0].mesh!==0||['matrix','translation','rotation','scale'].some(k=>json.nodes[0][k])||json.meshes?.length!==1||json.meshes[0].primitives?.length!==2)throw new Error('Expected one untransformed two-material tree');
  if(json.materials?.length!==2||json.materials[0].name!=='MAT_AtlasBark'||json.materials[1].name!=='MAT_AtlasFoliage'||json.images?.length!==4)throw new Error('Expected author-6 bark and foliage');
  if((json.materials[0].alphaMode??'OPAQUE')!=='OPAQUE'||json.materials[1].alphaMode!=='MASK'||(json.materials[1].alphaCutoff??.5)<=0)throw new Error('Tree foliage requires alpha MASK with a positive cutoff');
  const formats:Record<string,string>={_WIND:'SCALAR',_BRANCH_LEVEL:'SCALAR',_LEAF_CENTER:'VEC3',_LEAF_PIVOT:'VEC3',POSITION:'VEC3',NORMAL:'VEC3',TEXCOORD_0:'VEC2',TANGENT:'VEC4'};
  for(const [index,p] of json.meshes[0].primitives.entries()){
    if(p.material!==index||p.mode!==undefined&&p.mode!==4||p.targets||Object.keys(p.attributes??{}).length!==8||!Object.keys(formats).every(k=>Number.isInteger(p.attributes?.[k])))throw new Error('Incomplete tree vertex contract');
    const count=json.accessors[p.attributes.POSITION]?.count;
    for(const [name,type] of Object.entries(formats)){
      const a=json.accessors[p.attributes[name]];
      if(!a||a.type!==type||a.componentType!==5126||a.normalized||a.sparse||!Number.isInteger(count)||count<1||a.count!==count)throw new Error(`Invalid tree accessor ${name}`);
    }
  }
  return {json,binary:new Uint8Array(buffer,start+8,view.getUint32(start,true))};
}
function imageBytes(doc:GLBDocument,index:number){
  const image=doc.json.images[index],view=doc.json.bufferViews[image.bufferView];
  if(image.uri||image.mimeType!=='image/png'||!view||view.buffer!==0||!Number.isInteger(view.byteLength)||view.byteLength<=0)throw new Error('Expected an embedded PNG');
  const start=view.byteOffset??0,end=start+view.byteLength;
  if(start<0||end>doc.binary.length)throw new Error('Image outside GLB binary');
  return doc.binary.subarray(start,end);
}
/** Check byte identity before sharing materials. LOD1 images are never decoded:
 * its parser receives texture-free material placeholders with stable indices. */
export function prepareTreeLODPair(lod0:ArrayBuffer,lod1:ArrayBuffer){
  const a=readGLB(lod0),b=readGLB(lod1);
  for(const key of ['materials','textures','samplers'])if(JSON.stringify(a.json[key])!==JSON.stringify(b.json[key]))throw new Error(`Tree LOD ${key} differ`);
  let embeddedTextureBytes=0;
  for(let i=0;i<4;i++){
    const x=imageBytes(a,i),y=imageBytes(b,i);embeddedTextureBytes+=x.length;
    if(x.length!==y.length||x.some((v,k)=>v!==y[k]))throw new Error(`Tree LOD image ${i} differs`);
  }
  const json=structuredClone(b.json);
  json.materials=json.materials.map((m:any)=>({name:m.name}));delete json.images;delete json.textures;delete json.samplers;
  // Keep the original binary offsets. Unused compressed PNG bytes remain in
  // this temporary parse input, but do not allocate image/GPU resources.
  const text=new TextEncoder().encode(JSON.stringify(json)),length=(text.length+3)&~3;
  const buffer=new ArrayBuffer(28+length+b.binary.length),view=new DataView(buffer),bytes=new Uint8Array(buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);
  view.setUint32(12,length,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+length);bytes.set(text,20);
  view.setUint32(20+length,b.binary.length,true);view.setUint32(24+length,0x004e4942,true);bytes.set(b.binary,28+length);
  return {lod1GeometryBuffer:buffer,embeddedTextureBytes};
}

/** CPU reference for shader audits. Scale skeleton/attachment coordinates,
 * keeping every offset within a leaf card in metres, then rotate rigidly. */
export function treeVertexMeters(position:THREE.Vector3,pivot:THREE.Vector3,leaf:boolean,heightM:number,windWeight:number,phase:number,instancePhase=0){
  if(!Number.isFinite(heightM)||heightM<10||heightM>22)throw new Error('Prototype supports tree heights 10–22 m');
  if(!leaf)return position.clone().multiplyScalar(heightM/TREE_REFERENCE_HEIGHT_M);
  return position.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),Math.sin(phase+instancePhase)*.12*windWeight).addScaledVector(pivot,heightM/TREE_REFERENCE_HEIGHT_M);
}

const declarations=`
attribute float _wind, _branch_level;
attribute vec3 _leaf_pivot;
attribute vec2 instanceTree;
uniform float atlasTreePhase;
mat3 atlasLeafRotation(){
  float angle=sin(atlasTreePhase+instanceTree.y)*.12*_wind;
  float c=cos(angle),s=sin(angle);
  return mat3(c,s,0.,-s,c,0.,0.,0.,1.);
}
`;
function deform(material:THREE.Material,phase:{value:number}){
  material.onBeforeCompile=shader=>{
    shader.uniforms.atlasTreePhase=phase;
    shader.vertexShader=declarations+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      if(_branch_level>3.5){objectNormal=atlasLeafRotation()*objectNormal;
        #ifdef USE_TANGENT
        objectTangent=atlasLeafRotation()*objectTangent;
        #endif
      }`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed=_branch_level>3.5 ? _leaf_pivot*instanceTree.x+atlasLeafRotation()*(position-_leaf_pivot) : position*instanceTree.x;`);
  };
  material.customProgramCacheKey=()=> 'atlas-tree-physical-1';
}
export type TreeAssetFamily=Awaited<ReturnType<typeof loadTreeAssetFamily>>;
export type TreeAssetOptions={foliageCoverage?:'mask'|'hash';leafTransmission?:LeafTransmissionOptions;forestCoverage?:boolean;
  localAerial?:{planet:THREE.Object3D;frame:THREE.Object3D;radiusM:number;sun:{value:THREE.Vector3};enabled:{value:number};eyeHeight:{value:number}}};
export async function loadTreeAssetFamily(lod0:ArrayBuffer,lod1:ArrayBuffer,options:TreeAssetOptions={}){
  if(options.foliageCoverage!==undefined&&!['mask','hash'].includes(options.foliageCoverage))throw new Error('Unsupported foliage coverage mode');
  if(options.forestCoverage!==undefined&&typeof options.forestCoverage!=='boolean')throw new Error('Invalid forest coverage option');
  const prepared=prepareTreeLODPair(lod0,lod1),loader=new GLTFLoader();
  const loaded:THREE.Group[]=[];
  const textures=new Set<THREE.Texture>(),materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>();
  function collect(group:THREE.Group){group.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    geometries.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:[o.material]){
      materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);
    }
  });}
  function dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)t.image.close();}}
  try {
    for(const bytes of [lod0,prepared.lod1GeometryBuffer]){const gltf=await loader.parseAsync(bytes,'');loaded.push(gltf.scene);collect(gltf.scene);}
    const lods=loaded.map(group=>{
      const meshes:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>[]=[];
      group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>);});
      if(meshes.length!==2||meshes.some(m=>Array.isArray(m.material)))throw new Error('Expected two tree primitives');
      return meshes.sort((a,b)=>a.material.name.localeCompare(b.material.name));
    });
    for(let i=0;i<2;i++){lods[1][i].material.dispose();materials.delete(lods[1][i].material);lods[1][i].material=lods[0][i].material;}
    // Explicit experiment: hashing samples fractional mip coverage instead of
    // discarding every leaf texel below the GLB's fixed MASK cutoff. Preserve
    // the imported MASK path by default, including historical captures.
    if(options.foliageCoverage==='hash'){
      lods[0][1].material.alphaTest=0;lods[0][1].material.alphaHash=true;
    }
    const phase={value:0};
    for(const material of materials)deform(material,phase);
    if(options.forestCoverage)for(const material of materials)installTreeForestCoverage(material);
    if(options.localAerial){
      const air=options.localAerial;
      // Both LOD batches have identity transforms in the forest's retained
      // frame. Their shared materials therefore use identical air uniforms.
      // Install before transmission, which guards the final material hook.
      for(const mesh of lods[0])attachLocalAerial(mesh,air.planet,air.radiusM,air.sun,air.enabled,air.eyeHeight,undefined,air.frame);
    }
    // Conservative origin-centred sphere over both LODs, every supported
    // skeleton height and rigid leaf-wind angle. Used before CPU culling.
    let maxRadiusM=0;
    for(const level of lods)for(const mesh of level){
      const p=mesh.geometry.getAttribute('position'),pivot=mesh.geometry.getAttribute('_leaf_pivot'),branch=mesh.geometry.getAttribute('_branch_level');
      for(let i=0;i<p.count;i++){
        const radius=branch.getX(i)>3.5
          ? Math.hypot(pivot.getX(i),pivot.getY(i),pivot.getZ(i))*22/TREE_REFERENCE_HEIGHT_M+Math.hypot(p.getX(i)-pivot.getX(i),p.getY(i)-pivot.getY(i),p.getZ(i)-pivot.getZ(i))
          : Math.hypot(p.getX(i),p.getY(i),p.getZ(i))*22/TREE_REFERENCE_HEIGHT_M;
        maxRadiusM=Math.max(maxRadiusM,radius);
      }
    }
    // Compose only after wind. Both LODs share this one foliage material;
    // bark and all custom shadow materials retain their previous lighting.
    const leafTransmission=options.leafTransmission===undefined?null:installLeafTransmission(lods[0][1].material,options.leafTransmission);
    let disposed=false,activeBatches=0;
    return {
      lods,textures,leafTransmission,maxRadiusM,forestCoverage:!!options.forestCoverage,embeddedTextureBytes:prepared.embeddedTextureBytes,
      setDate(date:bigint){leafTransmission?.assertInstalled();phase.value=treeWindPhase(date);},
      createBatch(lod:0|1,capacity:number){
        if(disposed)throw new Error('Tree family is disposed');
        if(!Number.isInteger(capacity)||capacity<1||capacity>4096)throw new Error('Invalid tree capacity');
        const group=new THREE.Group(),tree=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2).setUsage(THREE.DynamicDrawUsage);
        // Three clears ranges after bufferSubData, but not initial bufferData.
        // Clear only once the GPU has consumed this owned attribute, including
        // its first upload; hidden batches keep their pending ranges intact.
        tree.onUpload(()=>tree.clearUpdateRanges());
        const treeUpdates=new InstanceUpdateRanges();
        const forest=options.forestCoverage?new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2).setUsage(THREE.DynamicDrawUsage):null;
        const forestUpdates=new InstanceUpdateRanges();
        if(forest){
          for(let i=0;i<capacity;i++)forest.setXY(i,1,0);
          forest.onUpload(()=>forest.clearUpdateRanges());
        }
        const matrixUpdates=[new InstanceUpdateRanges(),new InstanceUpdateRanges()];
        const colorUpdates=[new InstanceUpdateRanges(),new InstanceUpdateRanges()];
        const meshes=lods[lod].map((source,part)=>{
          const geometry=source.geometry.clone();geometry.setAttribute('instanceTree',tree);
          if(forest)geometry.setAttribute('instanceForest',forest);
          const mesh=new THREE.InstancedMesh(geometry,source.material,capacity);mesh.count=0;
          if(options.localAerial)mesh.onBeforeRender=lods[0][part].onBeforeRender;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;
          mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3).setUsage(THREE.DynamicDrawUsage);
          mesh.instanceMatrix.onUpload(()=>mesh.instanceMatrix.clearUpdateRanges());
          mesh.instanceColor.onUpload(()=>mesh.instanceColor!.clearUpdateRanges());
          // Caller can install conservative curved-world bounds after integration.
          // Shader scale/wind invalidates Three's unmodified geometry bounds.
          mesh.frustumCulled=false;
          const common={map:source.material.map,alphaTest:source.material.alphaTest,alphaHash:source.material.alphaHash,side:source.material.side};
          mesh.customDepthMaterial=new THREE.MeshDepthMaterial({...common,depthPacking:THREE.RGBADepthPacking});
          mesh.customDistanceMaterial=new THREE.MeshDistanceMaterial(common);
          deform(mesh.customDepthMaterial,phase);deform(mesh.customDistanceMaterial,phase);
          if(options.forestCoverage){installTreeForestCoverage(mesh.customDepthMaterial);installTreeForestCoverage(mesh.customDistanceMaterial);}
          group.add(mesh);return mesh;
        });
        activeBatches++;let batchDisposed=false;
        return {group,meshes,
          setCount(count:number){
            if(batchDisposed||!Number.isInteger(count)||count<0||count>meshes[0].count)throw new Error('Tree count can only truncate initialized slots');
            for(const mesh of meshes)mesh.count=count;
          },
          /** Matrix contains yaw/translation and metres-to-scene-units only.
           * Tree height is applied in the shader so leaves retain their size. */
          setInstance(index:number,matrix:THREE.Matrix4,heightM:number,phaseOffset=0){
            if(batchDisposed||!Number.isInteger(index)||index<0||index>=capacity||index>meshes[0].count||!Number.isFinite(heightM)||heightM<10||heightM>22||!Number.isFinite(phaseOffset)||matrix.elements.some(x=>!Number.isFinite(x)))throw new Error('Invalid tree instance or gap in initialized slots');
            const e=matrix.elements,a=new THREE.Vector3(e[0],e[1],e[2]),b=new THREE.Vector3(e[4],e[5],e[6]),c=new THREE.Vector3(e[8],e[9],e[10]);
            const scale2=a.lengthSq(),tolerance=scale2*1e-6;
            if(!Number.isFinite(scale2)||scale2<=0||Math.abs(b.lengthSq()-scale2)>tolerance||Math.abs(c.lengthSq()-scale2)>tolerance||Math.abs(a.dot(b))>tolerance||Math.abs(a.dot(c))>tolerance||Math.abs(b.dot(c))>tolerance||matrix.determinant()<=0||e[3]!==0||e[7]!==0||e[11]!==0||e[15]!==1)throw new Error('Tree matrix requires rotation and positive uniform scene-unit scale');
            // Phase stays representable as Float32 even for a caller's very
            // large finite offset; the absolute universe date stays BigInt.
            const tau=2*Math.PI;phaseOffset=((phaseOffset%tau)+tau)%tau;
            const scale=Math.fround(heightM/TREE_REFERENCE_HEIGHT_M),offset=Math.fround(phaseOffset);
            const newSlot=index===meshes[0].count;
            if(newSlot&&forest&&(forest.getX(index)!==1||forest.getY(index)!==0)){
              forest.setXY(index,1,0);forestUpdates.include(index,2);forestUpdates.flush(forest);
            }
            if(tree.getX(index)!==scale||tree.getY(index)!==offset){
              tree.setXY(index,scale,offset);treeUpdates.include(index,2);treeUpdates.flush(tree);
            }
            for(const [part,mesh] of meshes.entries()){
              const color=mesh.instanceColor!;
              if(newSlot&&(color.getX(index)!==1||color.getY(index)!==1||color.getZ(index)!==1)){
                color.setXYZ(index,1,1,1);colorUpdates[part].include(index,3);colorUpdates[part].flush(color);
              }
              const base=index*16,values=mesh.instanceMatrix.array;
              if(matrix.elements.some((value,component)=>values[base+component]!==Math.fround(value))){
                mesh.setMatrixAt(index,matrix);matrixUpdates[part].include(index,16);matrixUpdates[part].flush(mesh.instanceMatrix);
              }
              mesh.count=Math.max(mesh.count,index+1);
            }
          },
          /** Linear RGB multipliers over the authored bark and leaf textures.
           * Each part keeps its shared material; only this slot's color changes.
           * Fresh or re-grown slots are white. Call when a retained slot changes tree identity;
           * transform/rebase updates deliberately retain its current colors. */
          setAppearance(index:number,bark:readonly[number,number,number],foliage:readonly[number,number,number]){
            const colors=[bark,foliage];
            if(batchDisposed||!Number.isInteger(index)||index<0||index>=meshes[0].count||colors.some(color=>!Array.isArray(color)||color.length!==3||[0,1,2].some(i=>!Number.isFinite(color[i])||color[i]<0||color[i]>2)))throw new Error('Tree appearance requires an initialized slot and linear RGB multipliers in [0,2]');
            for(const [part,mesh] of meshes.entries()){
              const attribute=mesh.instanceColor!,color=colors[part],base=index*3;
              if(color.some((value,component)=>attribute.array[base+component]!==Math.fround(value))){
                attribute.setXYZ(index,...color);colorUpdates[part].include(index,3);colorUpdates[part].flush(attribute);
              }
            }
          },
          setCoverage(index:number,coverage:number,seed:number){
            if(batchDisposed||!forest||!Number.isInteger(index)||index<0||index>=meshes[0].count||!Number.isFinite(coverage)||coverage<0||coverage>1||!Number.isInteger(seed)||seed<0||seed>255)throw new Error('Invalid canonical forest coverage');
            const value=quantizeForestCoverage(coverage)/256;
            if(forest.getX(index)!==value||forest.getY(index)!==seed){forest.setXY(index,value,seed);forestUpdates.include(index,2);forestUpdates.flush(forest);}
          },
          dispose(){if(batchDisposed)return;batchDisposed=true;activeBatches--;for(const mesh of meshes){mesh.geometry.dispose();mesh.customDepthMaterial?.dispose();mesh.customDistanceMaterial?.dispose();mesh.dispose();}group.clear();group.removeFromParent();},
        };
      },
      dispose(){if(disposed)return;if(activeBatches)throw new Error('Dispose tree batches before their family');disposed=true;dispose();},
    };
  }catch(error){dispose();throw error;}
}
