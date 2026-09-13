import * as THREE from 'three';
import type {Body,V3} from './catalog.ts';
import type {RiverRegion} from './river-types.ts';
import type {LakeReflectionFrame} from './river-water.ts';

const SIZE=256, BYTES=SIZE*SIZE*8, INTERVAL_MS=100;
const unit=(v:V3)=>new THREE.Vector3(...v).normalize();
type Budget={canAllocate:(bytes:number)=>boolean;setBytes:(bytes:number)=>void};

/** One lazy planar capture for a nearby lake; rivers and oceans keep their procedural sky. */
export class LakeReflection {
  private body:Body; private region:RiverRegion; private setFrame:(frame:LakeReflectionFrame)=>void; private waterGroup:THREE.Object3D; private budget:Budget; private now:()=>number;
  private target:THREE.WebGLRenderTarget|null=null;
  private camera=new THREE.PerspectiveCamera(); private matrix=new THREE.Matrix4();
  private last=0; private captures=0; private lastCaptureCalls=0; private updateMs=0;
  private active=false; private valid=false; private disposed=false; private lastScene='';
  private lastPose=new THREE.Vector3(Infinity,Infinity,Infinity); private lastQuat=new THREE.Quaternion();
  constructor(body:Body,region:RiverRegion,setFrame:(frame:LakeReflectionFrame)=>void,waterGroup:THREE.Object3D,budget:Budget,now=()=>performance.now()){this.body=body;this.region=region;this.setFrame=setFrame;this.waterGroup=waterGroup;this.budget=budget;this.now=now;}
  private frame(strength=this.valid?1:0):LakeReflectionFrame{return {texture:this.target?.texture||null,matrix:this.matrix,valid:this.valid,strength,coordinateFrame:'planet-local-at-capture'};}
  private lakeWorld(group:THREE.Object3D,eye:THREE.Vector3){let best:{p:THREE.Vector3;n:THREE.Vector3;d:THREE.Vector3;lake:RiverRegion['lakes'][number]}|null=null,bestDistance=Infinity;for(const lake of this.region.lakes){const d=unit(this.region.origin.map((v,i)=>v+(this.region.east[i]*lake.x+this.region.north[i]*lake.z)/this.region.radiusM) as V3),p=d.clone().multiplyScalar(1+lake.waterM/this.body.radiusM).applyMatrix4(group.matrixWorld),distance=p.distanceToSquared(eye);if(distance<bestDistance){bestDistance=distance;best={p,n:d.clone().transformDirection(group.matrixWorld).normalize(),d,lake};}}return best;}
  private ensureTarget(){if(this.target)return true;if(!this.budget.canAllocate(BYTES))return false;this.target=new THREE.WebGLRenderTarget(SIZE,SIZE,{depthBuffer:true});this.budget.setBytes(BYTES);return true;}
  private sceneSignature(scene:THREE.Scene,group:THREE.Object3D){return `${scene.children.length}/${group.children.length}`;}
  disable(){this.active=false;this.valid=false;this.setFrame(this.frame(0));}
  update(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,group:THREE.Object3D,xr:boolean,frozen:boolean,revision:string,capture:(render:()=>void)=>void){
    const start=this.now();this.active=false;
    if(this.disposed||xr){this.disable();return;}
    if(frozen){this.active=this.valid;this.setFrame(this.frame());return;}
    const lake=this.lakeWorld(group,camera.position);if(!lake){this.disable();return;}
    const localEye=group.worldToLocal(camera.position.clone()),relative=localEye.sub(lake.d.clone().multiplyScalar(1+lake.lake.waterM/this.body.radiusM)),height=relative.dot(lake.d)*this.body.radiusM;
    const east=new THREE.Vector3(...this.region.east),north=new THREE.Vector3(...this.region.north),x=relative.dot(east)*this.body.radiusM,z=relative.dot(north)*this.body.radiusM,c=Math.cos(lake.lake.angle),s=Math.sin(lake.lake.angle),u=x*c+z*s,v=-x*s+z*c,radial=Math.hypot(u,v),edge=radial?1/Math.hypot(u/(radial*lake.lake.radiusXM),v/(radial*lake.lake.radiusZM)):0,shore=Math.max(0,radial-edge);
    if(height<=0||height>2000||shore>5000){this.disable();return;}
    const now=this.now(),sceneKey=`${revision}/${lake.lake.id}/${this.sceneSignature(scene,group)}`,groupQuat=group.getWorldQuaternion(new THREE.Quaternion()).invert(),localQuat=groupQuat.multiply(camera.quaternion),localMetres=localEye.multiplyScalar(this.body.radiusM),moved=this.lastPose.distanceToSquared(localMetres)>.01||1-Math.abs(this.lastQuat.dot(localQuat))>1e-7;
    if(now-this.last<INTERVAL_MS){this.active=this.valid;this.setFrame(this.frame());return;}
    this.last=now;if(this.valid&&!moved&&sceneKey===this.lastScene){this.active=true;this.setFrame(this.frame());return;}
    if(!this.ensureTarget()){this.valid=false;this.setFrame(this.frame(0));return;}
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(lake.n,lake.p);
    this.camera.copy(camera,false);this.camera.position.copy(camera.position).sub(lake.p).reflect(plane.normal).add(lake.p);
    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).reflect(plane.normal),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).reflect(plane.normal);
    this.camera.up.copy(up);this.camera.lookAt(this.camera.position.clone().add(forward));this.camera.updateMatrixWorld();this.camera.projectionMatrix.copy(camera.projectionMatrix);this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse).multiply(group.matrixWorld);
    const oldTarget=renderer.getRenderTarget(),oldAuto=renderer.autoClear,oldVisible=this.waterGroup.visible,oldClipping=renderer.clippingPlanes,oldLocal=renderer.localClippingEnabled,oldXR=renderer.xr.enabled,viewport=new THREE.Vector4(),scissor=new THREE.Vector4(),scissorTest=renderer.getScissorTest();
    renderer.getViewport(viewport);renderer.getScissor(scissor);
    // Three supplies vClipPosition=-mvPosition, so an upward lake plane clips
    // the negative signed (sub-water) half-space.
    try{this.waterGroup.visible=false;renderer.autoClear=true;renderer.xr.enabled=false;renderer.clippingPlanes=[plane];renderer.localClippingEnabled=true;renderer.setRenderTarget(this.target);renderer.setViewport(0,0,SIZE,SIZE);renderer.setScissor(0,0,SIZE,SIZE);renderer.setScissorTest(false);renderer.clear();capture(()=>renderer.render(scene,this.camera));this.captures++;this.lastCaptureCalls=renderer.info.render.calls;this.lastPose.copy(localMetres);this.lastQuat.copy(localQuat);this.lastScene=sceneKey;this.valid=true;this.active=true;}
    finally{renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=oldAuto;renderer.xr.enabled=oldXR;renderer.clippingPlanes=oldClipping;renderer.localClippingEnabled=oldLocal;this.waterGroup.visible=oldVisible;}
    this.updateMs=this.now()-start;this.setFrame(this.frame());
  }
  diagnostics(){return {active:this.active,captures:this.captures,lastCaptureCalls:this.lastCaptureCalls,updateMs:this.updateMs,bytes:this.target?BYTES:0,budgetBytes:1024*1024};}
  dispose(){if(this.disposed)return;this.disposed=true;this.target?.dispose();this.target=null;this.budget.setBytes(0);this.valid=false;}
}
