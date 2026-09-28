import type {Frustum,Sphere,Vector3} from 'three';

type Candidates={count:number;centerX:Float32Array;centerY:Float32Array;centerZ:Float32Array;radius:Float32Array;survivorIndex:(slot:number)=>number};

/** Preserve the ordinary camera-visible ordering before allocating spare
 * instance capacity to off-camera casters. All scratch arrays are retained. */
export function floraShadowOrder(candidates:Candidates,visibleCount:number,shadow:Frustum|null,origin:Vector3,
  order:Uint32Array,seen:Uint8Array,sphere:Sphere){
  let count=0;seen.fill(0,0,candidates.count);
  for(let slot=0;slot<visibleCount;slot++){
    const index=candidates.survivorIndex(slot);order[count++]=index;seen[index]=1;
  }
  if(shadow)for(let index=0;index<candidates.count;index++){
    if(seen[index])continue;
    sphere.center.set(candidates.centerX[index],candidates.centerY[index],candidates.centerZ[index]).add(origin);
    sphere.radius=candidates.radius[index];
    if(shadow.intersectsSphere(sphere))order[count++]=index;
  }
  return count;
}

export function compareFaunaVisibility(a:{cameraVisible:boolean;distance:number;member:{id:string}},b:{cameraVisible:boolean;distance:number;member:{id:string}}){
  return Number(b.cameraVisible)-Number(a.cameraVisible)||a.distance-b.distance||a.member.id.localeCompare(b.member.id);
}
