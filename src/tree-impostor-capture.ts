import * as THREE from 'three';
import {loadTreeAssetFamily,treeVertexMeters} from './tree-asset.ts';
import {treeCaptureViews,TREE_VIEW_VERSION} from './tree-impostor-views.ts';

export const TREE_CAPTURE_VERSION='tree-material-capture-2';
export type CaptureLayer={size:number;colour:Float32Array;data:Float32Array;classification:Float32Array};

/** Coverage is area, not a second alpha-test threshold. RGB is linear and
 * unassociated. Normals are averaged as vectors. Depth uses the nearest covered
 * subsample to avoid averaging disconnected surfaces into empty space. */
export function reduceCapture(layer:CaptureLayer,factor:number):CaptureLayer {
  const {size,colour,data,classification}=layer;
  if(!Number.isInteger(size)||size<1||colour.length!==size*size*4||data.length!==colour.length||classification?.length!==size*size||!Number.isInteger(factor)||factor<1||size%factor)throw new Error('Invalid capture reduction');
  const next=size/factor,c=new Float32Array(next*next*4),d=new Float32Array(c.length),classes=new Float32Array(next*next);
  for(let y=0;y<next;y++)for(let x=0;x<next;x++){
    const p=(y*next+x)*4;let weight=0,nx=0,ny=0,nz=0,depth=-Infinity,leaf=0,best=-1;
    for(let dy=0;dy<factor;dy++)for(let dx=0;dx<factor;dx++){
      const q=((y*factor+dy)*size+x*factor+dx)*4,a=colour[q+3];
      if(a<=0)continue;
      weight+=a;for(let j=0;j<3;j++)c[p+j]+=colour[q+j]*a;
      nx+=data[q]*a;ny+=data[q+1]*a;nz+=data[q+2]*a;
      leaf+=classification[q/4]*a;if(data[q+3]>depth){depth=data[q+3];best=q;}
    }
    if(weight===0)continue;
    for(let j=0;j<3;j++)c[p+j]/=weight;c[p+3]=weight/(factor*factor);
    const length=Math.hypot(nx,ny,nz),normal=length>1e-7?[nx/length,ny/length,nz/length]:[data[best],data[best+1],data[best+2]];
    d[p]=normal[0];d[p+1]=normal[1];d[p+2]=normal[2];d[p+3]=depth;classes[p/4]=leaf/weight;
  }
  return {size:next,colour:c,data:d,classification:classes};
}

/** Nearest valid material padding stays inside one view and never creates
 * coverage. Mips are reduced before padding so empty pixels remain empty. */
export function padCapture(layer:CaptureLayer,steps=4):CaptureLayer {
  if(!Number.isInteger(layer.size)||layer.size<1||!(layer.colour instanceof Float32Array)||!(layer.data instanceof Float32Array)||!(layer.classification instanceof Float32Array)||layer.colour.length!==layer.size*layer.size*4||layer.data.length!==layer.colour.length||layer.classification.length!==layer.size*layer.size||!Number.isInteger(steps)||steps<0||steps>16)throw new Error('Invalid capture padding');
  const {size}=layer,c=layer.colour.slice(),d=layer.data.slice(),classification=layer.classification.slice();
  let valid=Uint8Array.from({length:size*size},(_,i)=>c[i*4+3]>0?1:0);
  for(let step=0;step<steps;step++){
    const next=valid.slice();
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const pixel=y*size+x;if(valid[pixel])continue;
      const neighbors=[x>0?pixel-1:-1,x+1<size?pixel+1:-1,y>0?pixel-size:-1,y+1<size?pixel+size:-1];
      const from=neighbors.find(i=>i>=0&&valid[i]);if(from===undefined)continue;
      for(let j=0;j<3;j++)c[pixel*4+j]=c[from*4+j];
      for(let j=0;j<4;j++)d[pixel*4+j]=d[from*4+j];classification[pixel]=classification[from];next[pixel]=1;
    }
    valid=next;
  }
  return {size,colour:c,data:d,classification};
}

export async function captureTree(lod0:ArrayBuffer,lod1:ArrayBuffer,
  options:{grid:number;size:number;supersample:number;heightM:number},
  receive:(view:number,mip:number,layer:CaptureLayer)=>Promise<void>){
  const {grid,size,supersample,heightM}=options,views=treeCaptureViews(grid);
  if(![32,64,128].includes(size)||![1,2,4].includes(supersample)||!Number.isFinite(heightM)||heightM<10||heightM>22)throw new Error('Unsupported tree capture settings');
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',alpha:true});
  renderer.setSize(size*supersample,size*supersample);renderer.setPixelRatio(1);
  renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0,0);renderer.shadowMap.enabled=false;
  const gl=renderer.getContext() as WebGL2RenderingContext;
  let family:Awaited<ReturnType<typeof loadTreeAssetFamily>>|undefined;
  let batch:ReturnType<NonNullable<typeof family>['createBatch']>|undefined;
  let target:THREE.WebGLRenderTarget|undefined;
  try{
    if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('Tree capture requires EXT_color_buffer_float');
    if(size*supersample>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Capture target exceeds device texture limit');
    family=await loadTreeAssetFamily(lod0,lod1);family.setDate(0n);
    batch=family.createBatch(0,1);batch.setInstance(0,new THREE.Matrix4(),heightM,0);
    const scene=new THREE.Scene();scene.add(batch.group);
    const points:THREE.Vector3[]=[],bounds=new THREE.Box3();let windMargin=0;
    for(const mesh of family.lods[0]){
      const attrs=mesh.geometry.attributes;
      for(let i=0;i<attrs.position.count;i++){
        const p=new THREE.Vector3().fromBufferAttribute(attrs.position,i),pivot=new THREE.Vector3().fromBufferAttribute(attrs._leaf_pivot,i);
        const leaf=attrs._branch_level.getX(i)>3.5;
        if(leaf)windMargin=Math.max(windMargin,2*p.distanceTo(pivot)*Math.sin(.12*attrs._wind.getX(i)/2));
        const point=treeVertexMeters(p,pivot,leaf,heightM,attrs._wind.getX(i),0);points.push(point);bounds.expandByPoint(point);
      }
    }
    const center=bounds.getCenter(new THREE.Vector3());
    let radius=0;for(const point of points)radius=Math.max(radius,point.distanceTo(center));radius+=windMargin+.02;
    if(Math.abs(bounds.min.y)>.02)throw new Error('Captured tree root must remain at ground contact');
    const distance=radius+1,camera=new THREE.OrthographicCamera(-radius,radius,radius,-radius,.5,2*radius+1.5);
    const uniforms={pass:{value:0},viewToObject:{value:new THREE.Matrix3()},distance:{value:distance},radius:{value:radius}};
    for(const mesh of family.lods[0]){
      const material=mesh.material,previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
      material.toneMapped=false;material.fog=false;material.dithering=false;
      material.onBeforeCompile=(shader,host)=>{
        previous.call(material,shader,host);
        Object.assign(shader.uniforms,{atlasCapturePass:uniforms.pass,atlasCaptureViewToObject:uniforms.viewToObject,atlasCaptureDistance:uniforms.distance,atlasCaptureRadius:uniforms.radius});
        shader.fragmentShader=`uniform int atlasCapturePass;
uniform mat3 atlasCaptureViewToObject;
uniform float atlasCaptureDistance,atlasCaptureRadius;
`+shader.fragmentShader;
        // Retain runtime texture decoding, MASK, normal maps and deformation;
        // replace the terminal lighting/output path with linear material data.
        if(!shader.fragmentShader.includes('#include <opaque_fragment>'))throw new Error('Capture shader terminal hook is missing');
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
if(atlasCapturePass==0)gl_FragColor=vec4(diffuseColor.rgb,${material.name==='MAT_AtlasFoliage'?'2.':'1.'});
else if(atlasCapturePass==1)gl_FragColor=vec4(normalize(atlasCaptureViewToObject*normal),
 (atlasCaptureDistance-vViewPosition.z)/atlasCaptureRadius);
else gl_FragColor=vec4(.125,.25,.5,1.);`);
        for(const chunk of ['tonemapping','colorspace','fog','premultiplied_alpha','dithering'])shader.fragmentShader=shader.fragmentShader.replace(`#include <${chunk}_fragment>`,'');
      };
      material.customProgramCacheKey=()=>`${previousKey}/${TREE_CAPTURE_VERSION}/${material.name}`;material.needsUpdate=true;
    }
    if(!batch.meshes.every((mesh,i)=>mesh.material===family!.lods[0][i].material)||!family.lods[0].some(mesh=>mesh.material.name==='MAT_AtlasFoliage'))throw new Error('Capture batch does not use the patched tree materials');
    const captureSize=size*supersample;
    target=new THREE.WebGLRenderTarget(captureSize,captureSize,{type:THREE.FloatType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true,stencilBuffer:false});
    target.texture.colorSpace=THREE.NoColorSpace;renderer.setRenderTarget(target);
    const colour=new Float32Array(captureSize*captureSize*4),data=new Float32Array(colour.length),classification=new Float32Array(captureSize*captureSize);
    let coveredSamples=0,coverageSum=0;const frameCoverage:number[]=[];
    for(const view of views){
      const toward=new THREE.Vector3(...view.towardCamera),right=new THREE.Vector3(...view.right),up=new THREE.Vector3(...view.up);
      camera.position.copy(center).addScaledVector(toward,distance);
      camera.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,toward));camera.updateMatrixWorld(true);
      uniforms.viewToObject.value.setFromMatrix4(camera.matrixWorld);
      if(view.index===0){
        uniforms.pass.value=2;renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,captureSize,captureSize,data);
        let sentinel=false;for(let p=0;p<data.length;p+=4)if(data[p+3]>0){
          if(data[p]!==.125||data[p+1]!==.25||data[p+2]!==.5||data[p+3]!==1)throw new Error('Capture sentinel output mismatch');sentinel=true;
        }
        if(!sentinel)throw new Error('Capture shader sentinel found no covered samples');
      }
      for(const [pass,buffer] of [[0,colour],[1,data]] as const){
        uniforms.pass.value=pass;renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,captureSize,captureSize,buffer);
        const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error(`Capture GL error ${error} at view ${view.index}, pass ${pass}`);
      }
      for(let p=0;p<colour.length;p+=4){
        if(!Number.isFinite(colour[p]+colour[p+1]+colour[p+2]+colour[p+3]+data[p]+data[p+1]+data[p+2]+data[p+3]))throw new Error('Nonfinite capture texel');
        classification[p/4]=0;
        if(colour[p+3]>0){
          if(![1,2].includes(colour[p+3])||Math.abs(Math.hypot(data[p],data[p+1],data[p+2])-1)>.001||Math.abs(data[p+3])>1.0001||[colour[p],colour[p+1],colour[p+2]].some(x=>x<0||x>1.00001))throw new Error(`Capture channel outside declared range at view ${view.index}`);
          classification[p/4]=colour[p+3]-1;colour[p+3]=1;
          coveredSamples++;
        }
      }
      let layer=reduceCapture({size:captureSize,colour,data,classification},supersample),mip=0;
      const area=layer.colour.reduce((sum,value,index)=>sum+(index%4===3?value:0),0);coverageSum+=area;frameCoverage.push(area);
      while(true){await receive(view.index,mip,padCapture(layer));if(layer.size===1)break;layer=reduceCapture(layer,2);mip++;}
    }
    if(coveredSamples===0)throw new Error('Capture produced no tree coverage');
    const ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {version:TREE_CAPTURE_VERSION,viewVersion:TREE_VIEW_VERSION,options,views,center:center.toArray(),radius,distance,
      bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),windMargin},root:[0,0,0],
      rowOrder:'bottom-to-top',colour:'linear-unassociated-rgb-area-coverage',data:'object-normal-xyz-normalized-frontmost-depth',classification:'leaf-fraction',
      depth:'dot(surface-center,towardCamera)/radius; valid only where colour coverage > 0',
      coveredSamples,coverageSum,frameCoverage,bakedState:{date:'0',instancePhase:0,skeletonHeightM:heightM,neutralTint:true,wind:'sin(0)=0 under atlas-tree-physical-1'},adapter:{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),maxArrayLayers:gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)},
      limitations:['Capture only: runtime impostor, parallax, handoff and game integration are pending','Mips preserve mean area coverage; they require coverage-aware runtime rendering, not a fixed MASK threshold','Depth is the frontmost covered subsample; normal/classification and colour average coverage and can mix disconnected surfaces','RGBA32F capture files are review data, not compressed shipping textures']};
  }finally{
    batch?.dispose();family?.dispose();target?.dispose();renderer.dispose();renderer.forceContextLoss();
  }
}

// Fixed browser entry for the named assetctl operation; caller code is never
// accepted. HTTP routes/inputs and output writes are bounded by the host tool.
Object.assign(globalThis,{__atlasTreeCapture:{captureTree}});
