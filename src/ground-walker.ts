import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {type Body,type V3} from './catalog.ts';
import {planetGeophysics} from './planet-geophysics.ts';
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
  private date:bigint;
  private accumulator=0;
  private vertical=0;
  private jumpHeld=false;
  private jumpRequested=false;
  private idleFrames=0;
  requestJump(){this.jumpRequested=true;}
  grounded=false;
  waiting=false;
  speed=0;
  steps=0;
  travelled=0;
  rawColliderBytes=0;
  mismatchM:number|null=null;
  readonly body:Body;
  constructor(body:Body,point:V3,sample:ReturnType<typeof surfaceQuery>=surfaceQuery(body),date:bigint=0n) {
    this.body=body;
    this.sample=sample;
    this.date=date;
    this.position=new THREE.Vector3(...point);this.origin=this.position.clone();
    this.world.timestep=STEP;
    this.capsule=this.world.createCollider(RAPIER.ColliderDesc.capsule(.6,.3));
    this.controller=this.world.createCharacterController(.01);
    this.controller.setMaxSlopeClimbAngle(Math.PI*.25);
    this.controller.setMinSlopeSlideAngle(Math.PI*.26);
    this.controller.enableAutostep(.3,.25,false);
    this.controller.enableSnapToGround(.35);
  }
  /** Returns whether the settled contact topology changed this frame. */
  private sync(patches:ContactPatch[]) {
    let changed=false;
    const wanted=new Set(patches.map(p=>p.key));
    for(const [key,c] of this.terrain)if(!wanted.has(key)){this.world.removeCollider(c,true);this.terrain.delete(key);changed=true;}
    this.rawColliderBytes=0;
    for(const p of patches){
      this.rawColliderBytes+=p.positions.byteLength+p.indices.byteLength;
      if(!this.terrain.has(p.key)){this.terrain.set(p.key,this.world.createCollider(RAPIER.ColliderDesc.trimesh(p.positions,p.indices)));changed=true;}
    }
    return changed;
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
    if(!patches){this.accumulator=0;this.speed=0;this.idleFrames=0;return;}
    const topologyChanged=this.sync(patches);
    const jump=keys.has(' ');this.jumpRequested ||= jump&&!this.jumpHeld;this.jumpHeld=jump;
    const movementInput=keys.has('w')||keys.has('a')||keys.has('s')||keys.has('d');
    if(topologyChanged||movementInput||jump||this.jumpRequested)this.idleFrames=0;
    // Rapier's snap-to-ground can make millimetre-scale corrections forever on
    // a resting capsule. Preserve a settled pose only while its exact contact
    // topology, support state and input remain unchanged. Any new collider,
    // movement or jump wakes the ordinary fixed-step controller immediately.
    if(this.grounded&&this.idleFrames>=2&&!movementInput&&!jump&&!this.jumpRequested&&this.vertical<=0&&!topologyChanged){
      this.accumulator=0;this.speed=0;this.vertical=0;return;
    }
    this.accumulator=Math.min(.1,this.accumulator+dt);
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
      if(!this.sample(this.position.clone().addScaledVector(move,STEP).normalize().toArray() as V3,this.date).walkable)move.set(0,0,0);
      // Surface physics from planet-geophysics-1 (catalogue massKg stays the orbital mass): g_surface*(R/r)^2.
      const gravity=Math.max(.05,Math.min(40,planetGeophysics(this.body).surfaceGravityMS2*this.body.radiusM*this.body.radiusM/this.position.lengthSq()));
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
      if(!this.sample(resolved.normalize().toArray() as V3,this.date).walkable){
        actual.copy(up).multiplyScalar(actual.dot(up));
      }
      this.position.add(actual);this.grounded=this.controller.computedGrounded();
      if(this.grounded&&this.vertical<0)this.vertical=0;
      this.speed=actual.clone().projectOnPlane(up).length()/STEP;this.travelled+=actual.length();
      if(this.grounded&&!movementInput&&!jump&&!this.jumpRequested&&this.vertical===0&&actual.length()<.001)this.idleFrames++;
      else this.idleFrames=0;
      heading.premultiply(new THREE.Quaternion().setFromUnitVectors(oldUp,this.position.clone().normalize())).normalize();
      this.capsule.setTranslation(this.position.clone().sub(this.origin));
    }
    const up=this.position.clone().normalize(),rayStart=this.position.clone().sub(this.origin).addScaledVector(up,3);
    const hit=this.world.castRay(new RAPIER.Ray(rayStart,up.clone().negate()),10,true,undefined,undefined,this.capsule);
    if(hit){const meshHeight=this.position.length()+3-hit.timeOfImpact-this.body.radiusM;this.mismatchM=Math.abs(meshHeight-this.sample(up.toArray() as V3,this.date).visibleHeightM);}
  }
  eye():V3 {return this.position.clone().addScaledVector(this.position.clone().normalize(),EYE_OFFSET).toArray() as V3;}
  diagnostics(){return {active:true,grounded:this.grounded,waiting:this.waiting,position:this.position.toArray(),originM:this.origin.toArray(),speed:this.speed,steps:this.steps,travelledM:this.travelled,colliders:this.terrain.size,rawColliderBytes:this.rawColliderBytes,contactMismatchM:this.mismatchM};}
  dispose(){this.world.free();this.terrain.clear();}
}
