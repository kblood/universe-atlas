import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {G,type Body,type V3} from './catalog.ts';
import {surfaceQuery} from './world-surface.ts';
import type {ContactPatch} from './terrain-contact.ts';
let initialization:Promise<void>|null=null;
export const initWalking=()=>initialization ||= RAPIER.init();
export const WALK_HEIGHT=1.8, EYE_OFFSET=.72;
const STEP=1/60;
/** Small physics frame; triangle colliders come from the exact settled visible
 * patches, without skirts. Distant terrain never enters the physics world. */
export class GroundWalker {
  readonly position:THREE.Vector3;
  readonly origin:THREE.Vector3;
  private world=new RAPIER.World({x:0,y:0,z:0});
  private capsule:RAPIER.Collider;
  private controller:RAPIER.KinematicCharacterController;
  private terrain=new Map<string,RAPIER.Collider>();
  private sample:ReturnType<typeof surfaceQuery>;
  private accumulator=0;
  private vertical=0;
  private jumpHeld=false;
  private jumpRequested=false;
  requestJump(){this.jumpRequested=true;}
  grounded=false;
  waiting=false;
  speed=0;
  steps=0;
  travelled=0;
  rawColliderBytes=0;
  mismatchM:number|null=null;
  readonly body:Body;
  constructor(body:Body,point:V3) {
    this.body=body;
    this.sample=surfaceQuery(body);
    this.position=new THREE.Vector3(...point);this.origin=this.position.clone();
    this.world.timestep=STEP;
    this.capsule=this.world.createCollider(RAPIER.ColliderDesc.capsule(.6,.3));
    this.controller=this.world.createCharacterController(.01);
    this.controller.setMaxSlopeClimbAngle(Math.PI*.25);
    this.controller.setMinSlopeSlideAngle(Math.PI*.26);
    this.controller.enableAutostep(.3,.25,false);
    this.controller.enableSnapToGround(.35);
  }
  private sync(patches:ContactPatch[]) {
    const wanted=new Set(patches.map(p=>p.key));
    for(const [key,c] of this.terrain)if(!wanted.has(key)){this.world.removeCollider(c,true);this.terrain.delete(key);}
    this.rawColliderBytes=0;
    for(const p of patches){
      this.rawColliderBytes+=p.positions.byteLength+p.indices.byteLength;
      if(!this.terrain.has(p.key))this.terrain.set(p.key,this.world.createCollider(RAPIER.ColliderDesc.trimesh(p.positions,p.indices)));
    }
  }
  update(dt:number,heading:THREE.Quaternion,keys:Set<string>,getPatches:(p:V3,o:V3)=>ContactPatch[]|null) {
    if(this.position.distanceTo(this.origin)>64){
      const shift=this.position.clone().sub(this.origin);
      this.origin.copy(this.position);
      for(const c of this.terrain.values())this.world.removeCollider(c,true);
      this.terrain.clear();this.capsule.setTranslation(new THREE.Vector3().copy(this.capsule.translation()).sub(shift));
    }
    const patches=getPatches(this.position.toArray() as V3,this.origin.toArray() as V3);
    this.waiting=!patches;
    if(!patches){this.accumulator=0;this.speed=0;return;}
    this.sync(patches);
    this.accumulator=Math.min(.1,this.accumulator+dt);
    const jump=keys.has(' ');this.jumpRequested ||= jump&&!this.jumpHeld;this.jumpHeld=jump;
    this.speed=0;
    while(this.accumulator>=STEP){
      this.accumulator-=STEP;this.steps++;
      const up=this.position.clone().normalize(),oldUp=up.clone();
      const forward=new THREE.Vector3(0,0,-1).applyQuaternion(heading).projectOnPlane(up).normalize();
      if(forward.lengthSq()<.1)forward.set(1,0,0).projectOnPlane(up).normalize();
      const right=new THREE.Vector3().crossVectors(forward,up).normalize();
      const move=forward.multiplyScalar(+keys.has('w')-+keys.has('s')).addScaledVector(right,+keys.has('d')-+keys.has('a'));
      if(move.lengthSq()>0)move.normalize().multiplyScalar(keys.has('shift')?8:4);
      // Test the requested step before physics so ordinary movement cannot
      // enter an inland channel. `wet` includes rivers/lakes as well as ocean.
      if(!this.sample(this.position.clone().addScaledVector(move,STEP).normalize().toArray() as V3).walkable)move.set(0,0,0);
      const gravity=Math.max(.05,Math.min(40,G*this.body.massKg/this.position.lengthSq()));
      if(this.jumpRequested&&this.grounded){this.vertical=Math.sqrt(2*gravity*1.1);this.grounded=false;}this.jumpRequested=false;
      this.vertical-=gravity*STEP;
      this.controller.setUp(up);
      this.capsule.setRotation(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),up));
      this.capsule.setTranslation(this.position.clone().sub(this.origin));
      this.world.step();
      this.controller.computeColliderMovement(this.capsule,move.multiplyScalar(STEP).addScaledVector(up,this.vertical*STEP));
      const actual=new THREE.Vector3().copy(this.controller.computedMovement());
      // Collision resolution can turn a dry intended step into a lateral slide.
      // Validate the resolved endpoint too; otherwise a capsule can bypass the
      // shore test by being pushed across a wet boundary.
      const resolved=this.position.clone().add(actual);
      if(!this.sample(resolved.normalize().toArray() as V3).walkable){
        actual.copy(up).multiplyScalar(actual.dot(up));
      }
      this.position.add(actual);this.grounded=this.controller.computedGrounded();
      if(this.grounded&&this.vertical<0)this.vertical=0;
      this.speed=actual.clone().projectOnPlane(up).length()/STEP;this.travelled+=actual.length();
      heading.premultiply(new THREE.Quaternion().setFromUnitVectors(oldUp,this.position.clone().normalize())).normalize();
      this.capsule.setTranslation(this.position.clone().sub(this.origin));
    }
    const up=this.position.clone().normalize(),rayStart=this.position.clone().sub(this.origin).addScaledVector(up,3);
    const hit=this.world.castRay(new RAPIER.Ray(rayStart,up.clone().negate()),10,true,undefined,undefined,this.capsule);
    if(hit){const meshHeight=this.position.length()+3-hit.timeOfImpact-this.body.radiusM;this.mismatchM=Math.abs(meshHeight-this.sample(up.toArray() as V3).visibleHeightM);}
  }
  eye():V3 {return this.position.clone().addScaledVector(this.position.clone().normalize(),EYE_OFFSET).toArray() as V3;}
  diagnostics(){return {active:true,grounded:this.grounded,waiting:this.waiting,position:this.position.toArray(),speed:this.speed,steps:this.steps,travelledM:this.travelled,colliders:this.terrain.size,rawColliderBytes:this.rawColliderBytes,contactMismatchM:this.mismatchM};}
  dispose(){this.world.free();this.terrain.clear();}
}
