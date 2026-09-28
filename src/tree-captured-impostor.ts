import * as THREE from 'three';
import {treeCaptureViews,treeViewBlend} from './tree-impostor-views.ts';
import {packTreeCaptureLayer} from './tree-impostor-filter.ts';

export type TreeCaptureFiltering='legacy-unassociated'|'coverage-weighted';
export type TreeCaptureLoadOptions={filtering?:TreeCaptureFiltering};

/** Development representation for one exact captured height/variant. No forest
 * residency, instancing, shadow casting or game handoff is installed here. */
export async function loadTreeCapture(manifest:any,read:(path:string)=>Promise<ArrayBuffer>,options:TreeCaptureLoadOptions={}){
  const filtering=options.filtering??'legacy-unassociated';
  if(!['legacy-unassociated','coverage-weighted'].includes(filtering))throw new Error('Unsupported tree capture filtering mode');
  if(!manifest||manifest.schemaVersion!==2||![3,9,17].includes(manifest.options?.grid)||manifest.rowOrder!=='bottom-to-top'||manifest.colour!=='linear-unassociated-rgb-area-coverage'||manifest.data!=='object-normal-xyz-normalized-frontmost-depth'||manifest.classification!=='leaf-fraction'||!Array.isArray(manifest.artifacts))throw new Error('Unsupported tree capture contract');
  const {grid,size,heightM}=manifest.options??{},views=treeCaptureViews(grid);
  if(manifest.operation!=='atlas-tree-impostor-capture-2'||manifest.version!=='tree-material-capture-2'||![32,64,128].includes(size)||!Number.isFinite(heightM)||heightM<10||heightM>22||!Number.isFinite(manifest.radius)||manifest.radius<=0||manifest.radius>100||!Array.isArray(manifest.center)||manifest.center.length!==3||manifest.center.some((x:number)=>!Number.isFinite(x)||Math.abs(x)>100))throw new Error('Invalid tree capture manifest');
  if(JSON.stringify(manifest.views)!==JSON.stringify(views))throw new Error('Capture view bases do not match the declared contract');
  const records=new Map<string,any>(manifest.artifacts.map((r:any)=>[r.path,r]));
  if(records.size!==manifest.artifacts.length)throw new Error('Duplicate capture attachment');
  const colours:{data:Uint8Array;width:number;height:number}[]=[],classes:typeof colours=[],data:{data:Uint16Array;width:number;height:number}[]=[];
  async function readAttachment(viewIndex:number,mip:number,width:number,channel:'colour'|'data'|'classification'){
    const channels=channel==='classification'?1:4,channelCount=width*width*channels;
    const path=`view-${String(viewIndex).padStart(3,'0')}/mip-${mip}.${channel}.f32`,record=records.get(path);
    if(!record||record.bytes!==channelCount*4)throw new Error('Capture attachment length is invalid');
    const payload=await read(path);
    if(payload.byteLength!==channelCount*4)throw new Error('Truncated capture attachment');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',payload)),v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==record.sha256)throw new Error('Capture attachment hash mismatch');
    return new Float32Array(payload);
  }
  let bytes=0;
  for(let mip=0,width=size;width>=1;mip++,width/=2){
    const count=width*width*4,colour=new Uint8Array(count*views.length),values=new Uint16Array(colour.length),classification=new Uint8Array(colour.length);
    for(const view of views){
      const [colourFloats,dataFloats,classFloats]=await Promise.all([
        readAttachment(view.index,mip,width,'colour'),readAttachment(view.index,mip,width,'data'),readAttachment(view.index,mip,width,'classification'),
      ]);
      const layerOffset=view.index*count;
      if(filtering==='coverage-weighted'){
        const packed=packTreeCaptureLayer(colourFloats,dataFloats,classFloats);
        colour.set(packed.colour,layerOffset);values.set(packed.data,layerOffset);classification.set(packed.classification,layerOffset);
        continue;
      }
      for(let i=0;i<count;i++){
        const value=colourFloats[i],offset=layerOffset+i;
        if(!Number.isFinite(value)||value<0||value>1.001)throw new Error('Capture channel is outside its range');
        const encoded=i%4===3?value:value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055;
        colour[offset]=Math.round(Math.max(0,Math.min(1,encoded))*255);
      }
      for(let i=0;i<count;i++){
        const value=dataFloats[i],offset=layerOffset+i;
        if(!Number.isFinite(value)||value < -1.001||value>1.001)throw new Error('Capture channel is outside its range');
        values[offset]=THREE.DataUtils.toHalfFloat(value);
      }
      for(let i=0;i<width*width;i++){
        const value=classFloats[i],offset=layerOffset+i*4;
        if(!Number.isFinite(value)||value<0||value>1.001)throw new Error('Capture channel is outside its range');
        classification[offset]=Math.round(Math.max(0,Math.min(1,value))*255);
      }
    }
    colours.push({data:colour,width,height:width});data.push({data:values,width,height:width});classes.push({data:classification,width,height:width});bytes+=colour.byteLength+values.byteLength+classification.byteLength;
  }
  // The installed Three DataArrayTexture upload path only uploads level zero.
  // Its CompressedArrayTexture path supports explicit RGBA mip data as well:
  // RGBAFormat selects texSubImage3D, without block compression.
  // @types excludes the installed renderer's explicit uncompressed RGBA path.
  const rgba=THREE.RGBAFormat as unknown as THREE.CompressedPixelFormat;
  const colourTexture=new THREE.CompressedArrayTexture(colours,size,size,views.length,rgba);
  colourTexture.colorSpace=THREE.SRGBColorSpace;
  const dataTexture=new THREE.CompressedArrayTexture(data,size,size,views.length,rgba,THREE.HalfFloatType);
  dataTexture.colorSpace=THREE.NoColorSpace;
  // RGBA class storage uses the installed explicit-mip array path. Three spare
  // channels are a measured prototype cost; this is not yet an R8 upload path.
  const classTexture=new THREE.CompressedArrayTexture(classes,size,size,views.length,rgba);
  for(const texture of [colourTexture,dataTexture,classTexture]){
    if(Number(texture.format)!==THREE.RGBAFormat)throw new Error('Installed array texture default no longer supports RGBA mip uploads');
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=false;texture.flipY=false;texture.needsUpdate=true;
  }
  return {manifest,views,colourTexture,dataTexture,classTexture,bytes,filtering,
    dispose(){colourTexture.dispose();dataTexture.dispose();classTexture.dispose();}};
}
export type TreeCapture=Awaited<ReturnType<typeof loadTreeCapture>>;

const sampleGLSL=`
precision highp sampler2DArray;
uniform sampler2DArray captureColour,captureData,captureClass;
uniform vec3 captureCenter,captureEye,captureDirection;
uniform float captureRadius,captureOrtho,captureMip,captureMask,captureParallax,captureHash,captureCoverageWeighted;
uniform vec3 captureWeights;
uniform ivec3 captureLayers;
uniform mat3 captureBasis0,captureBasis1,captureBasis2,captureNormalMatrix;
uniform mat4 captureModelView,captureProjection;
uniform vec2 captureRoughness,captureSpecular;
varying vec3 captureRayPoint;
vec2 captureUV(vec3 p,mat3 basis){vec3 d=p-captureCenter;return vec2(dot(d,basis[0]),dot(d,basis[1]))/(2.*captureRadius)+.5;}
void captureSample(int layer,mat3 basis,vec3 ro,vec3 rd,out vec4 colour,out vec3 normal,out float t,out float leaf){
  colour=vec4(0);normal=vec3(0,1,0);t=1e20;leaf=0.;
  float denominator=dot(rd,basis[2]);if(abs(denominator)<.01)return;
  float plane=dot(captureCenter-ro,basis[2]);t=plane/denominator;
  vec2 uv=captureUV(ro+rd*t,basis);
  for(int step=0;step<2;step++){
    vec4 data=textureLod(captureData,vec3(clamp(uv,0.,1.),float(layer)),captureMip);
    if(captureCoverageWeighted>.5){float alpha=textureLod(captureColour,vec3(clamp(uv,0.,1.),float(layer)),captureMip).a;data/=max(alpha,1e-6);}
    t=(plane+data.w*captureRadius*captureParallax)/denominator;uv=captureUV(ro+rd*t,basis);
  }
  if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1)))||t<0.)return;
  colour=textureLod(captureColour,vec3(uv,float(layer)),captureMip);
  vec4 data=textureLod(captureData,vec3(uv,float(layer)),captureMip);
  float alpha=max(colour.a,1e-6);vec4 classification=textureLod(captureClass,vec3(uv,float(layer)),captureMip);
  if(captureCoverageWeighted>.5){colour.rgb/=alpha;data/=alpha;classification.r/=alpha;}
  normal=dot(data.xyz,data.xyz)>1e-8?normalize(data.xyz):basis[2];leaf=classification.r;
  t=(plane+data.w*captureRadius)/denominator;
}
float captureNoise(vec2 p){return fract(52.9829189*fract(dot(floor(p),vec2(.06711056,.00583715))));}
`;

export class TreeCapturedImpostor {
  readonly mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshPhysicalMaterial>;
  readonly uniforms;
  readonly capture:TreeCapture;
  constructor(capture:TreeCapture,sourceMaterials:readonly THREE.MeshStandardMaterial[]){
    this.capture=capture;
    if(sourceMaterials.length!==2||sourceMaterials.some(m=>m.metalness!==0)||sourceMaterials[0].name!=='MAT_AtlasBark'||sourceMaterials[1].name!=='MAT_AtlasFoliage')throw new Error('Impostor requires its bark/foliage source materials');
    const specular=sourceMaterials.map(m=>(m as THREE.MeshPhysicalMaterial).specularIntensity??1);
    const u=this.uniforms={
      captureColour:{value:capture.colourTexture},captureData:{value:capture.dataTexture},captureClass:{value:capture.classTexture},
      captureCenter:{value:new THREE.Vector3(...capture.manifest.center as [number,number,number])},captureRadius:{value:capture.manifest.radius},
      captureEye:{value:new THREE.Vector3()},captureDirection:{value:new THREE.Vector3()},captureOrtho:{value:0},captureMip:{value:0},captureMask:{value:0},
      captureParallax:{value:1},captureHash:{value:0},captureCoverageWeighted:{value:Number(capture.filtering==='coverage-weighted')},
      captureWeights:{value:new THREE.Vector3()},captureLayers:{value:new Int32Array(3)},
      captureBasis0:{value:new THREE.Matrix3()},captureBasis1:{value:new THREE.Matrix3()},captureBasis2:{value:new THREE.Matrix3()},
      captureBillboardRight:{value:new THREE.Vector3()},captureBillboardUp:{value:new THREE.Vector3()},captureBillboardScale:{value:1},
      captureNormalMatrix:{value:new THREE.Matrix3()},captureModelView:{value:new THREE.Matrix4()},captureProjection:{value:new THREE.Matrix4()},
      captureRoughness:{value:new THREE.Vector2(sourceMaterials[0].roughness,sourceMaterials[1].roughness)},captureSpecular:{value:new THREE.Vector2(specular[0],specular[1])},
    };
    const material=new THREE.MeshPhysicalMaterial({roughness:1,metalness:0,alphaHash:true});material.fog=false;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,u);
      shader.vertexShader=`uniform vec3 captureCenter,captureBillboardRight,captureBillboardUp;
uniform float captureRadius,captureBillboardScale;varying vec3 captureRayPoint;\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=captureCenter+captureRadius*captureBillboardScale*(position.x*captureBillboardRight+position.y*captureBillboardUp);captureRayPoint=transformed;`);
      shader.fragmentShader=sampleGLSL+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <logdepthbuf_fragment>',`
vec3 ro=captureEye,rd=normalize(captureRayPoint-captureEye);
if(captureOrtho>.5){rd=captureDirection;ro=captureRayPoint+rd*dot(captureEye-captureRayPoint,rd);}
vec4 c0,c1,c2;vec3 n0,n1,n2;float t0,t1,t2,l0,l1,l2;
captureSample(captureLayers.x,captureBasis0,ro,rd,c0,n0,t0,l0);
captureSample(captureLayers.y,captureBasis1,ro,rd,c1,n1,t1,l1);
captureSample(captureLayers.z,captureBasis2,ro,rd,c2,n2,t2,l2);
vec3 weights=captureWeights*vec3(c0.a,c1.a,c2.a);float captureCoverage=dot(weights,vec3(1));
if(captureCoverage<=.00001)discard;
weights/=captureCoverage;
float hitDistance=min(weights.x>.001?t0:1e20,min(weights.y>.001?t1:1e20,weights.z>.001?t2:1e20));
vec3 captureHit=ro+rd*hitDistance;vec4 hitView=captureModelView*vec4(captureHit,1),clip=captureProjection*hitView;
if(hitView.z>=0.||clip.w<=0.||clip.z < -clip.w||clip.z > clip.w)discard;
#if defined(USE_LOGARITHMIC_DEPTH_BUFFER)
gl_FragDepth=captureOrtho>.5?clip.z/clip.w*.5+.5:log2(1.-hitView.z)*logDepthBufFC*.5;
#else
gl_FragDepth=clip.z/clip.w*.5+.5;
#endif
if(captureMask<.5){
  float threshold=captureHash>.5?getAlphaHashThreshold(captureHit):captureNoise(gl_FragCoord.xy);
  if(threshold>=captureCoverage)discard;
}
diffuseColor.rgb=c0.rgb*weights.x+c1.rgb*weights.y+c2.rgb*weights.z;
vec3 captureObjectNormal=n0*weights.x+n1*weights.y+n2*weights.z;
if(dot(captureObjectNormal,captureObjectNormal)<1e-8)captureObjectNormal=n0;
float captureLeaf=dot(vec3(l0,l1,l2),weights);
`);
      // Coverage was resolved against the reconstructed surface above; the
      // built-in chunk would test the proxy plane a second time.
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>','');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`float faceDirection=1.;vec3 normal=normalize(captureNormalMatrix*captureObjectNormal);vec3 nonPerturbedNormal=normal;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=mix(captureRoughness.x,captureRoughness.y,captureLeaf);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
float capturedSpecular=mix(captureSpecular.x,captureSpecular.y,captureLeaf);material.specularColor=vec3(.04)*capturedSpecular;material.specularF90=capturedSpecular;`);
      // Point-light distance and the BRDF's eye vector must refer to the
      // reconstructed surface, rather than the billboard's centre plane.
      const lightChunk=THREE.ShaderChunk.lights_fragment_begin;
      if(!lightChunk.includes('vViewPosition'))throw new Error('Installed lighting chunk has changed');
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lightChunk.replaceAll('vViewPosition','(-hitView.xyz)'));
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
if(captureMask>.5)gl_FragColor=vec4(vec3(1),captureCoverage);`);
    };
    material.customProgramCacheKey=()=> `atlas-captured-tree-lab-2-${capture.filtering}`;
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);this.mesh.frustumCulled=false;
    this.mesh.name='Authored tree capture reconstruction (development)';
    const inverse=new THREE.Matrix4(),localCamera=new THREE.Matrix4(),viewport=new THREE.Vector4();
    this.mesh.onBeforeRender=(renderer,_scene,camera)=>{
      const gl=renderer.getContext() as WebGL2RenderingContext;if(capture.views.length>gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS))throw new Error('Capture exceeds texture array layer limit');
      inverse.copy(this.mesh.matrixWorld).invert();localCamera.multiplyMatrices(inverse,camera.matrixWorld);
      u.captureEye.value.setFromMatrixPosition(localCamera);u.captureDirection.value.set(0,0,-1).transformDirection(localCamera);
      u.captureOrtho.value=Number((camera as THREE.OrthographicCamera).isOrthographicCamera===true);
      const toCamera=u.captureOrtho.value?u.captureDirection.value.clone().negate():u.captureEye.value.clone().sub(u.captureCenter.value).normalize();
      const blend=treeViewBlend(toCamera.toArray() as [number,number,number],capture.manifest.options.grid);
      u.captureWeights.value.fromArray(blend.weights);
      const matrices=[u.captureBasis0,u.captureBasis1,u.captureBasis2];
      blend.vertices.forEach((v,i)=>{
        u.captureLayers.value[i]=v.index;const basis=capture.views[v.index];
        matrices[i].value.setFromMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(...basis.right),new THREE.Vector3(...basis.up),new THREE.Vector3(...basis.towardCamera)));
      });
      u.captureBillboardRight.value.set(1,0,0).transformDirection(localCamera);u.captureBillboardUp.value.set(0,1,0).transformDirection(localCamera);
      const distance=u.captureEye.value.distanceTo(u.captureCenter.value),radius=u.captureRadius.value;
      u.captureBillboardScale.value=u.captureOrtho.value?1:distance/Math.max(.01,distance-radius);
      u.captureModelView.value.multiplyMatrices(camera.matrixWorldInverse,this.mesh.matrixWorld);
      u.captureNormalMatrix.value.getNormalMatrix(u.captureModelView.value);u.captureProjection.value.copy(camera.projectionMatrix);
      renderer.getCurrentViewport(viewport);
      const pixels=radius*Math.abs(camera.projectionMatrix.elements[5])*viewport.w/(u.captureOrtho.value?1:distance);
      u.captureMip.value=Math.max(0,Math.min(Math.log2(capture.manifest.options.size),Math.log2(capture.manifest.options.size/Math.max(1,pixels))));
    };
  }
  dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.removeFromParent();}
}
