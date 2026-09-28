import * as THREE from 'three';
import {LEGACY_TREE_LOBES,LEGACY_TREE_TRUNK,LEGACY_TREE_SHAPE_VERSION} from './tree-shape.ts';

const vector=(v:readonly number[])=>`vec3(${v.map(x=>Number.isInteger(x)?`${x}.0`:String(x)).join(',')})`;
const quaternionGLSL=`
vec3 treeRotate(vec4 q,vec3 v){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
`;
// Derive convex planes from the same Three geometry as the shipped mesh.
// An enclosing ellipsoid alone changes projected coverage by up to 25%.
function convexShader(name:string,geometry:THREE.BufferGeometry){
  const flat=geometry.index?geometry.toNonIndexed():geometry,position=flat.getAttribute('position');
  const planes:number[][]=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<position.count;i+=3){
    a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
    const normal=b.sub(a).cross(c.sub(a)).normalize(),distance=normal.dot(a);
    const plane=[normal.x,normal.y,normal.z,distance];
    if(!planes.some(p=>p.every((x,j)=>Math.abs(x-plane[j])<1e-6)))planes.push(plane);
  }
  flat.dispose();if(flat!==geometry)geometry.dispose();
  return `void ${name}(vec3 ro,vec3 rd,vec3 centre,vec3 radii,vec3 colour,
    inout float best,inout vec3 hitNormal,inout vec3 hitColour,inout float coverage){
    vec3 o=(ro-centre)/radii,d=rd/radii;float enter=-1e20,leave=1e20,parallelOutside=0.0;
    vec3 enterNormal=vec3(0),leaveNormal=vec3(0);
    ${planes.map(p=>`{
      vec3 n=${vector(p.slice(0,3))};float numerator=${p[3]}-dot(n,o),denominator=dot(n,d);
      if(abs(denominator)<1e-8){if(numerator<0.0)parallelOutside=1.0;}
      else{float t=numerator/denominator;
        if(denominator<0.0){if(t>enter){enter=t;enterNormal=n;}}
        else if(t<leave){leave=t;leaveNormal=n;}
      }
    }`).join('\n')}
    float gap=leave-enter,width=max(1e-7,fwidth(gap));
    float alpha=treeEdgeAA*treeSampleAA>.5?clamp(.5+gap/width,0.0,1.0):step(0.0,gap);
    float t=enter>=0.0?enter:leave;vec3 n=enter>=0.0?enterNormal:leaveNormal;
    if(parallelOutside<.5&&alpha>0.0&&t>=0.0&&dot(n,n)>.5){
      coverage=max(coverage,alpha);
      if(t<best){best=t;hitNormal=normalize(n/radii);hitColour=colour;}
    }
  }`;
}
const facetedGLSL=convexShader('treeCrown',new THREE.IcosahedronGeometry(1,0))+
  convexShader('treeFacetedTrunk',new THREE.CylinderGeometry(LEGACY_TREE_TRUNK.topRadius,LEGACY_TREE_TRUNK.baseRadius,LEGACY_TREE_TRUNK.height,4).translate(0,.32,0));
const intersectGLSL=`
void treeEllipsoid(vec3 ro,vec3 rd,vec3 centre,vec3 radii,vec3 colour,
  inout float best,inout vec3 hitNormal,inout vec3 hitColour){
  vec3 o=(ro-centre)/radii,d=rd/radii;
  float a=dot(d,d),tc=-dot(o,d)/a;vec3 closest=o+tc*d;
  float remaining=1.0-dot(closest,closest);if(remaining<0.0)return;
  float halfChord=sqrt(max(0.0,remaining)/a),t=tc-halfChord;
  if(t<0.0)t=tc+halfChord;
  if(t>=0.0&&t<best){best=t;hitNormal=normalize((ro+rd*t-centre)/(radii*radii));hitColour=colour;}
}
void treeTrunk(vec3 ro,vec3 rd,inout float best,inout vec3 hitNormal,inout vec3 hitColour){
  const float height=${LEGACY_TREE_TRUNK.height},r0=${LEGACY_TREE_TRUNK.baseRadius};
  const float slope=(${LEGACY_TREE_TRUNK.topRadius}-${LEGACY_TREE_TRUNK.baseRadius})/${LEGACY_TREE_TRUNK.height};
  float r=r0+slope*ro.y;
  float a=dot(rd.xz,rd.xz)-slope*slope*rd.y*rd.y;
  float b=dot(ro.xz,rd.xz)-r*slope*rd.y,c=dot(ro.xz,ro.xz)-r*r;
  float discriminant=b*b-a*c;
  if(discriminant>=0.0&&abs(a)>1e-8){
    float root=sqrt(discriminant),t0=(-b-root)/a,t1=(-b+root)/a;
    float nearT=min(t0,t1),farT=max(t0,t1);
    for(int i=0;i<2;i++){
      float t=i==0?nearT:farT,y=ro.y+t*rd.y;
      if(t>=0.0&&t<best&&y>=0.0&&y<=height){vec3 p=ro+rd*t;best=t;hitNormal=normalize(vec3(p.x,-slope*(r0+slope*y),p.z));hitColour=vec3(.25,.17,.10);}
    }
  }else if(abs(a)<=1e-8&&abs(b)>1e-8){
    float t=-c/(2.0*b),y=ro.y+t*rd.y;
    if(t>=0.0&&t<best&&y>=0.0&&y<=height){vec3 p=ro+rd*t;best=t;hitNormal=normalize(vec3(p.x,-slope*(r0+slope*y),p.z));hitColour=vec3(.25,.17,.10);}
  }
  if(abs(rd.y)>1e-8)for(int i=0;i<2;i++){
    float y=float(i)*height,t=(y-ro.y)/rd.y,radius=r0+slope*y;vec3 p=ro+rd*t;
    if(t>=0.0&&t<best&&dot(p.xz,p.xz)<=radius*radius){best=t;hitNormal=vec3(0.0,i==0?-1.0:1.0,0.0);hitColour=vec3(.25,.17,.10);}
  }
}
`;

/** Experimental exact-individual far proxy. Static instance attributes, one
 * draw, analytic hit depth/normals, and no camera-dependent population choices.
 * It is not enabled in the planet renderer until handoff/coverage acceptance.
 * Attribute coordinates are metres in a stable local origin, not planet f32. */
export class ForestImpostors {
  readonly mesh:THREE.Mesh<THREE.InstancedBufferGeometry,THREE.MeshLambertMaterial>;
  readonly uniforms={
    treeCamera:{value:new THREE.Vector3()},treeViewDirection:{value:new THREE.Vector3(0,0,-1)},treeOrthographic:{value:0},
    treeModelView:{value:new THREE.Matrix4()},treeNormalMatrix:{value:new THREE.Matrix3()},treeProjection:{value:new THREE.Matrix4()},
    treeRadiusScale:{value:1},treeBoundInflation:{value:1},treeMaskOnly:{value:0},treeFaceted:{value:1},treeEdgeAA:{value:1},treeSampleAA:{value:0},treePixelScale:{value:0},
  };
  readonly positions:THREE.InstancedBufferAttribute;
  readonly rotations:THREE.InstancedBufferAttribute;
  readonly parameters:THREE.InstancedBufferAttribute;
  private dirtyStart=Infinity;private dirtyEnd=0;
  constructor(capacity:number){
    if(!Number.isInteger(capacity)||capacity<1||capacity>229376)throw new Error('Invalid forest impostor capacity');
    const geometry=new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],3));
    geometry.setIndex([0,1,2,0,2,3]);geometry.instanceCount=0;
    this.positions=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.DynamicDrawUsage);
    this.rotations=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.DynamicDrawUsage);
    this.parameters=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('treePositionHeight',this.positions);geometry.setAttribute('treeRotation',this.rotations);geometry.setAttribute('treeParameters',this.parameters);
    const material=new THREE.MeshLambertMaterial({color:0xffffff,alphaToCoverage:true});
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader=`attribute vec4 treePositionHeight,treeRotation,treeParameters;
        uniform vec3 treeCamera,treeViewDirection;uniform float treeOrthographic,treeBoundInflation,treeRadiusScale,treePixelScale;
        varying vec3 treeRayPoint;varying vec4 treeRootHeight,treeQ,treeData;${quaternionGLSL}\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        treeRootHeight=treePositionHeight;treeQ=treeRotation;treeData=treeParameters;
        float h=treePositionHeight.w;vec3 root=treePositionHeight.xyz;
        vec3 centre=root+treeRotate(treeQ,vec3(.005,.52,-.03)*h);
        vec3 facing=treeOrthographic>.5?-treeViewDirection:normalize(treeCamera-centre);
        vec3 axisX=treeRotate(treeQ,vec3(1,0,0)),axisY=treeRotate(treeQ,vec3(0,1,0)),axisZ=treeRotate(treeQ,vec3(0,0,1));
        vec3 right=cross(axisY,facing);if(dot(right,right)<1e-6)right=cross(axisZ,facing);right=normalize(right);
        vec3 vertical=normalize(cross(facing,right));
        vec3 extent=vec3(.38,.54,.31)*h*max(1.0,treeRadiusScale);
        float halfX=dot(abs(vec3(dot(right,axisX),dot(right,axisY),dot(right,axisZ))),extent);
        float halfY=dot(abs(vec3(dot(vertical,axisX),dot(vertical,axisY),dot(vertical,axisZ))),extent);
        float distanceToEye=length(treeCamera-centre),boundRadius=length(extent);
        float pixelMargin=treePixelScale*(treeOrthographic>.5?1.0:distanceToEye);
        halfX+=pixelMargin;halfY+=pixelMargin;
        float perspective=treeOrthographic>.5?1.0:distanceToEye/max(.001,distanceToEye-boundRadius);
        vec3 transformed=centre+(right*position.x*halfX+vertical*position.y*halfY)*perspective*treeBoundInflation;
        if(h<=0.0)transformed=root;
        treeRayPoint=transformed;
      `);
      shader.fragmentShader=`uniform vec3 treeCamera,treeViewDirection;
        uniform float treeOrthographic,treeRadiusScale,treeMaskOnly,treeFaceted,treeEdgeAA,treeSampleAA;
        uniform mat4 treeModelView,treeProjection;uniform mat3 treeNormalMatrix;
        varying vec3 treeRayPoint;varying vec4 treeRootHeight,treeQ,treeData;
        ${quaternionGLSL}${intersectGLSL}${facetedGLSL}\n`+shader.fragmentShader;
      const lobes=LEGACY_TREE_LOBES.map(([x,y,z,s])=>{
        const args=`ro,rd,${vector([x,y,z])},${vector([s,s*.85,s])}*treeRadiusScale,${vector([.16+y*.06,.29+y*.04,.08])},best,treeHitNormal,treeHitColour`;
        return `if(treeFaceted>.5)treeCrown(${args},treeCoverage);else treeEllipsoid(${args});`;
      }).join('\n');
      shader.fragmentShader=shader.fragmentShader.replace('#include <logdepthbuf_fragment>',`
        if(treeRootHeight.w<=0.0)discard;
        vec3 rayOrigin=treeCamera,rayDirection=normalize(treeRayPoint-treeCamera);
        if(treeOrthographic>.5){rayDirection=treeViewDirection;rayOrigin=treeRayPoint+rayDirection*dot(treeCamera-treeRayPoint,rayDirection);}
        vec4 inverseQ=vec4(-treeQ.xyz,treeQ.w);
        vec3 ro=treeRotate(inverseQ,rayOrigin-treeRootHeight.xyz)/treeRootHeight.w;
        vec3 rd=normalize(treeRotate(inverseQ,rayDirection));
        // Shift the ray close to the tree before small-primitive quadratics.
        // Subtracting huge nearly equal squared camera distances loses leaves.
        ro+=rd*max(0.0,dot(vec3(0,.52,0)-ro,rd)-2.0);
        float best=1e20,treeCoverage=0.0;vec3 treeHitNormal=vec3(0,1,0),treeHitColour=vec3(0);
        ${lobes}
        if(treeFaceted>.5)treeFacetedTrunk(ro,rd,vec3(0),vec3(1),vec3(.25,.17,.10),best,treeHitNormal,treeHitColour,treeCoverage);
        else {treeTrunk(ro,rd,best,treeHitNormal,treeHitColour);treeCoverage=1.0;}
        if(best==1e20)discard;
        vec3 treeHit=treeRootHeight.xyz+treeRotate(treeQ,(ro+rd*best)*treeRootHeight.w);
        vec4 treeHitView=treeModelView*vec4(treeHit,1.0),treeClip=treeProjection*treeHitView;
        if(treeHitView.z>=0.0||treeClip.w<=0.0||treeClip.z < -treeClip.w||treeClip.z > treeClip.w)discard;
        #if defined(USE_LOGARITHMIC_DEPTH_BUFFER)
          gl_FragDepth=treeOrthographic>.5?treeClip.z/treeClip.w*.5+.5:log2(1.0-treeHitView.z)*logDepthBufFC*.5;
        #else
          gl_FragDepth=treeClip.z/treeClip.w*.5+.5;
        #endif
        diffuseColor.rgb*=treeHitColour*vec3(.8+treeData.x*.2,.85+treeData.x*.15,.75+treeData.x*.25);
        diffuseColor.a*=treeCoverage;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`
        float faceDirection=1.0;
        vec3 normal=normalize(treeNormalMatrix*treeRotate(treeQ,treeHitNormal));
        vec3 nonPerturbedNormal=normal;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','if(treeMaskOnly>.5)outgoingLight=vec3(1.0);\n#include <opaque_fragment>');
    };
    material.customProgramCacheKey=()=>`${LEGACY_TREE_SHAPE_VERSION}/analytic-impostor-3`;
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='Canonical forest analytic impostors';this.mesh.frustumCulled=false;
    const inverse=new THREE.Matrix4(),localCamera=new THREE.Matrix4(),viewport=new THREE.Vector4();
    let defaultSamples:number|undefined;
    this.mesh.onBeforeRender=(_renderer,_scene,camera)=>{
      inverse.copy(this.mesh.matrixWorld).invert();localCamera.multiplyMatrices(inverse,camera.matrixWorld);
      this.uniforms.treeCamera.value.setFromMatrixPosition(localCamera);
      this.uniforms.treeViewDirection.value.set(0,0,-1).transformDirection(localCamera);
      this.uniforms.treeOrthographic.value=Number((camera as THREE.OrthographicCamera).isOrthographicCamera===true);
      this.uniforms.treeModelView.value.multiplyMatrices(camera.matrixWorldInverse,this.mesh.matrixWorld);
      this.uniforms.treeNormalMatrix.value.getNormalMatrix(this.uniforms.treeModelView.value);
      this.uniforms.treeProjection.value.copy(camera.projectionMatrix);
      _renderer.getCurrentViewport(viewport);
      this.uniforms.treePixelScale.value=2/(Math.abs(camera.projectionMatrix.elements[5])*Math.max(1,viewport.w));
      const target=_renderer.getRenderTarget();
      if(!target&&defaultSamples===undefined){const gl=_renderer.getContext();defaultSamples=gl.getParameter(gl.SAMPLES) as number;}
      this.uniforms.treeSampleAA.value=Number((target?target.samples:defaultSamples!)>1);
    };
  }
  write(index:number,position:THREE.Vector3,heightM:number,rotation:THREE.Quaternion,roll:number,groundHeightM:number){
    if(!Number.isInteger(index)||index<0||index>=this.positions.count||!Number.isFinite(heightM)||heightM<0||
      ![...position.toArray(),...rotation.toArray(),heightM,roll,groundHeightM].every(v=>Number.isFinite(Math.fround(v)))||
      Math.abs(rotation.lengthSq()-1)>1e-4)throw new Error('Invalid forest impostor instance');
    this.positions.setXYZW(index,position.x,position.y,position.z,heightM);
    this.rotations.setXYZW(index,rotation.x,rotation.y,rotation.z,rotation.w);
    this.parameters.setXYZW(index,roll,groundHeightM,0,0);
    this.mesh.geometry.instanceCount=Math.max(this.mesh.geometry.instanceCount,index+1);
    this.dirtyStart=Math.min(this.dirtyStart,index);this.dirtyEnd=Math.max(this.dirtyEnd,index+1);
  }
  commit(){
    if(this.dirtyEnd<=this.dirtyStart)return 0;
    for(const attribute of [this.positions,this.rotations,this.parameters]){
      let start=this.dirtyStart*4,end=this.dirtyEnd*4;
      for(const pending of attribute.updateRanges){start=Math.min(start,pending.start);end=Math.max(end,pending.start+pending.count);}
      attribute.clearUpdateRanges();attribute.addUpdateRange(start,end-start);attribute.needsUpdate=true;
    }
    const bytes=(this.dirtyEnd-this.dirtyStart)*48;this.dirtyStart=Infinity;this.dirtyEnd=0;return bytes;
  }
  dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.removeFromParent();}
}
