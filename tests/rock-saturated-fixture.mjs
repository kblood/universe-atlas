/** Deterministic saturated rock fixture (CPU only). Every tier holds exactly
 * `residentCap` canonical wanted cells around a cube corner (where canonical
 * cells are smallest and densest) with every slot occupied, i.e. the
 * theoretical resident maximum: 7,600 cells and 13,600 rocks. Rocks are
 * synthetic but canonical-shaped (real cell ids, in-cell directions, family
 * scale bands); the terrain is flat at 0 m. Used by tests and by
 * tests/rock-draw-measure.mjs; not a game scene. */
import * as THREE from 'three';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {generateBiosphere,profileFromPhysicalProperties} from '../src/biosphere-model.ts';
import {ROCK_TIERS,ROCK_VARIANTS,canonicalRockFamilies,canonicalCellsWithin,pointInCell,rockKey} from '../src/rock-field.ts';

export const SEED='LETHRA-001';
const sys=system(refByAddress(galaxies(SEED)[0],'G001/C2128,0,1/0'));
export const moon=sys.moons[0];
export const moonFamilies=generateBiosphere(SEED,profileFromPhysicalProperties(moon,'main-sequence'),moon.id).rocks;
export const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
/** Near a cube corner, offset so cell ids are not symmetric. */
export const CORNER=unit([1,.97,1.02]);
function hash(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const roll=(id,k)=>(hash(`${id}#${k}`)%100000)/100000;

/** Per tier: exactly residentCap nearest canonical cells, every slot filled. */
export function saturatedRecords(body=moon,families=moonFamilies,focus=CORNER){
  const fam=canonicalRockFamilies(families),r=body.radiusM;
  return ROCK_TIERS.map(tier=>{
    const cells=canonicalCellsWithin(focus,r,Math.max(tier.rangeM+tier.marginM,4*tier.rangeM),tier.cellSizeM).slice(0,tier.residentCap);
    if(cells.length<tier.residentCap)throw new Error(`fixture: ${tier.id} has only ${cells.length} cells`);
    const rocks=cells.map(cell=>{
      const out=[];
      for(let slot=0;slot<tier.slots;slot++){
        const id=rockKey(body,tier.id,cell.id,slot),family=fam[hash(id)%fam.length];
        const {direction}=pointInCell(cell.id,r,tier.cellSizeM,roll(id,0),roll(id,1));
        const s=roll(id,2),diameterM=family.scaleM*(tier.sizeMin+(tier.sizeMax-tier.sizeMin)*s*s);
        out.push({id,tier:tier.id,cellId:cell.id,slot,familyId:family.id,form:family.form,variant:hash(id+'v')%ROCK_VARIANTS,
          direction,groundHeightM:0,up:[...direction],yaw:roll(id,3)*Math.PI*2,diameterM,aspect:[1,1,1],sinkM:.1*diameterM,tint:[1,1,1]});
      }
      return out;
    });
    return {tier,cells,rocks};
  });
}
export function fixtureCounts(records){
  return {cells:records.reduce((a,t)=>a+t.cells.length,0),rocks:records.reduce((a,t)=>a+t.rocks.reduce((b,c)=>b+c.length,0),0)};
}
/** A symmetric perspective camera at `eye` (planet-unit coords) looking along
 * the local horizon at `yaw` radians, with a pitch below the horizon. */
export function cameraFrustum(body,eye,yaw,{fov=90,aspect=1.6,pitch=-.25,far=2000}={}){
  const up=eye.clone().normalize(),ref=Math.abs(up.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const east=new THREE.Vector3().crossVectors(ref,up).normalize(),north=new THREE.Vector3().crossVectors(up,east);
  const forward=east.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(north,Math.sin(yaw)).multiplyScalar(Math.cos(pitch)).addScaledVector(up,Math.sin(pitch)).normalize();
  const camera=new THREE.PerspectiveCamera(fov,aspect,.05/body.radiusM,far/body.radiusM);
  camera.position.copy(eye);camera.up.copy(up);camera.lookAt(eye.clone().add(forward));camera.updateMatrixWorld(true);
  return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
}
export function eyeAt(body,direction,altitudeM=1.7){const g=1+altitudeM/body.radiusM;return new THREE.Vector3(direction[0]*g,direction[1]*g,direction[2]*g);}
/** Installs fixture records as a PlanetRocks' settled residents via its
 * internal adoptCell path (test-only access to private members). The tiers
 * are marked valid at `focus`, so no rescatter or process work follows. */
export function injectSaturated(rocks,records,focus=CORNER){
  const f=new THREE.Vector3(...focus);
  records.forEach(({cells,rocks:perCell},t)=>{
    const state=rocks.tiers[t];
    state.residents.clear();state.wanted=cells;state.records=cells.map(()=>null);state.queue=[];state.queueIndex=0;state.valid=true;state.center.copy(f);state.truncated=0;
    cells.forEach((cell,i)=>rocks.adoptCell(t,i,perCell[i]));
  });
}
/** Flat, all-rock, dry ground for the fixture's PlanetRocks. */
export const flatSampler=()=>({groundHeightM:0});
export const rockClassifier=()=>({weights:[0,0,1,0],slopeDeg:0,moisture:0,ocean:false});
