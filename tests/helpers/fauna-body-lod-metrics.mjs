import * as THREE from 'three';
import {quadrupedPoseAt} from '../../src/fauna-locomotion.ts';
/** Uses the existing pose solver and original bone plan; no LOD-specific motion. */
export function posedBodyPositions(body,phase=0,behaviour='alert'){
  const member={id:'LOD-POSE',anchorOffsetX:0,anchorOffsetZ:0,orbitRadiusM:5,orbitAngularSpeed:.15,orbitPhase:0,gaitPeriodS:12};
  const activity={pose:{x:0,z:0,yaw:0,gait:phase===0?'idle':'walk'},travel:phase,stateS:3};
  const pose=quadrupedPoseAt(body.plan,member,activity,()=>0,phase*10,{behaviour});
  const world=[],palette=[],q=new THREE.Quaternion(),p=new THREE.Vector3(),unit=new THREE.Vector3(1,1,1);
  body.plan.bones.forEach((bone,i)=>{
    const local=new THREE.Matrix4().compose(p.fromArray(pose.positions,i*3),q.fromArray(pose.quaternions,i*4),unit);
    world[i]=bone.parent<0?local:world[bone.parent].clone().multiply(local);
    palette[i]=world[i].clone().multiply(new THREE.Matrix4().makeTranslation(...bone.rest.map(x=>-x)));
  });
  const out=new Float64Array(body.positions.length),point=new THREE.Vector3(),transformed=new THREE.Vector3();
  for(let v=0;v<body.vertexCount;v++){
    point.fromArray(body.positions,v*3);
    for(let k=0;k<4;k++){
      const weight=body.skinWeight[v*4+k]/255;if(weight===0)continue;
      transformed.copy(point).applyMatrix4(palette[body.skinIndex[v*4+k]]);
      out[v*3]+=transformed.x*weight;out[v*3+1]+=transformed.y*weight;out[v*3+2]+=transformed.z*weight;
    }
  }
  return out;
}
export function bodyDiagonal(body){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<body.positions.length;i++){const c=i%3;lo[c]=Math.min(lo[c],body.positions[i]);hi[c]=Math.max(hi[c],body.positions[i]);}
  return Math.hypot(...hi.map((x,c)=>x-lo[c]));
}
