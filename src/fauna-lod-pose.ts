/** Explicit approximate mid/far presentation pose; never the canonical IK.
 * Root placement, member identity and exact dated activity stay caller-owned.
 * Source22bone bind offsets are cached; no per-frameobjects or geometry builds.
 */
import {QUADRUPED_BONE_PARENTS,LEG_UPPER_BONES,type QuadrupedPlan} from './fauna-body-plan.ts';
import type {FaunaPathMember} from './fauna-locomotion.ts';
import type {FaunaMemberActivity} from './fauna-runtime.ts';
export const FAUNA_LOD_POSE_VERSION='fauna-lod-pose-approximate-1';
const BONES=QUADRUPED_BONE_PARENTS.length,TAU=Math.PI*2;
type Rest={offsets:Float64Array;positions:Float64Array;toes:Float64Array;radii:Float64Array};
export type FaunaLodPoseHandle={plan:QuadrupedPlan;rest:Rest;cycles:number;hipAmplitude:number;phaseOffset:number;lastOut:Float32Array|null;lastOffset:number;lastInputs:Float64Array;lastMetrics:Float64Array};
export class FaunaLodPoseWriter {
  private readonly rests=new WeakMap<QuadrupedPlan,Rest>();
  private readonly worlds=new Float64Array(BONES*16);
  private readonly angles=new Float64Array(BONES);
  /** [body-plane lift, lowest toe surface, bounded gaitphase]. Reused. */
  readonly metrics=new Float64Array(3);
  /** Off-frame preparation. Exact genome plans are never averaged or altered. */
  prepare(plan:QuadrupedPlan,member:FaunaPathMember):FaunaLodPoseHandle {
    let rest=this.rests.get(plan);
    if(!rest){
      rest={offsets:new Float64Array(BONES*3),positions:new Float64Array(BONES*3),toes:new Float64Array(12),radii:new Float64Array(4)};
      for(let i=0;i<BONES;i++){
        const b=plan.bones[i],p=b.parent>=0?plan.bones[b.parent].rest:[0,0,0];
        for(let k=0;k<3;k++){rest.offsets[i*3+k]=b.rest[k]-p[k];rest.positions[i*3+k]=b.rest[k];}
      }
      for(let i=0;i<4;i++){
        const leg=plan.legs[i],foot=plan.bones[leg.footBone].rest;
        for(let k=0;k<3;k++)rest.toes[i*3+k]=leg.toe[k]-foot[k];rest.radii[i]=leg.toeRadius;
      }
      this.rests.set(plan,rest);
    }
    let hash=2166136261;for(let i=0;i<member.id.length;i++)hash=Math.imul(hash^member.id.charCodeAt(i),16777619);
    return {plan,rest,cycles:Math.max(3,Math.round(TAU*Math.max(member.orbitRadiusM,.001)/Math.max(.18,plan.gait.strideM))),
      lastOut:null,lastOffset:0,lastInputs:new Float64Array(4),lastMetrics:new Float64Array(3),
      hipAmplitude:Math.min(.28,Math.max(.08,plan.genome.strideLength/Math.max(plan.genome.legLength,.1)*.13)),phaseOffset:(hash>>>0)/4294967296*TAU};
  }
  invalidate(handle:FaunaLodPoseHandle):void{handle.lastOut=null;}
  /** Approximate swing+breath+head/tail. No stance-foot world locking, grazing
   * reach solve or uneven-stencil IK: keep the full near solver for those.
   * A common vertical lift prevents toe spheres entering the body groundplane.
   * Repeated outputs are cached for caller-owned persistent palettes; invalidate
   * the handle before externally modifying its output array. */
  write(handle:FaunaLodPoseHandle,activity:FaunaMemberActivity,rigSeconds:number,out:Float32Array,offset=0):void {
    if(!Number.isSafeInteger(offset)||offset<0||out.length<offset+BONES*16)throw new Error('Invalid approximateLOD palette size');
    const gait=activity.pose.gait==='walk'?1:0,inputs=handle.lastInputs;
    if(handle.lastOut===out&&handle.lastOffset===offset&&Object.is(inputs[0],rigSeconds)&&Object.is(inputs[1],activity.travel)&&
      Object.is(inputs[2],activity.stateS)&&inputs[3]===gait){this.metrics.set(handle.lastMetrics);return;}
    handle.lastOut=out;handle.lastOffset=offset;inputs[0]=rigSeconds;inputs[1]=activity.travel;inputs[2]=activity.stateS;inputs[3]=gait;
    const {plan,rest}=handle,a=this.angles,w=this.worlds;
    const t=Math.min(1,Math.max(0,activity.stateS/.6)),ease=t*t*(3-2*t);
    const locomotion=activity.pose.gait==='walk'?ease:1-ease;
    const phase=(activity.travel*handle.cycles)%1,s=Math.sin(TAU*phase),c=Math.cos(TAU*phase);
    const breath=Math.sin(rigSeconds*TAU/4+handle.phaseOffset),bob=Math.max(0,(1-Math.cos(TAU*phase*2))*plan.genome.legLength*.01*locomotion+(.5+.5*breath)*.003);
    a.fill(0);a[2]=breath*.003;a[4]=Math.sin(rigSeconds*.9+handle.phaseOffset)*.025;a[5]=a[4]*.6;a[6]=a[4]*.35;
    const tail=Math.sin(rigSeconds*TAU*.23+handle.phaseOffset)*.12*(1-locomotion)+s*.07*locomotion;
    a[7]=tail;a[8]=tail*.8;a[9]=tail*.55;
    for(let i=0;i<4;i++){
      const wave=i===0?s:i===1?-s:i===2?-c:c,upper=LEG_UPPER_BONES[i];
      a[upper]=wave*handle.hipAmplitude*locomotion;
      a[upper+1]=Math.max(0,wave)*.3*locomotion*plan.legs[i].pole;
      a[upper+2]=-a[upper]-a[upper+1]-a[2];
    }
    for(let i=0;i<BONES;i++){
      const o=i*16,p=QUADRUPED_BONE_PARENTS[i],q=p*16,angle=a[i],sn=Math.sin(angle),cs=Math.cos(angle),tailY=i>=7&&i<=9;
      const tx=rest.offsets[i*3],ty=rest.offsets[i*3+1]+(i===1?bob:0),tz=rest.offsets[i*3+2];
      if(p<0){
        w[o]=cs;w[o+1]=tailY?0:sn;w[o+2]=tailY?-sn:0;
        w[o+4]=tailY?0:-sn;w[o+5]=tailY?1:cs;w[o+6]=0;
        w[o+8]=tailY?sn:0;w[o+9]=0;w[o+10]=tailY?cs:1;
        w[o+12]=tx;w[o+13]=ty;w[o+14]=tz;
      }else{
        if(tailY){
          w[o]=w[q]*cs-w[q+8]*sn;w[o+1]=w[q+1]*cs-w[q+9]*sn;w[o+2]=w[q+2]*cs-w[q+10]*sn;
          w[o+4]=w[q+4];w[o+5]=w[q+5];w[o+6]=w[q+6];
          w[o+8]=w[q]*sn+w[q+8]*cs;w[o+9]=w[q+1]*sn+w[q+9]*cs;w[o+10]=w[q+2]*sn+w[q+10]*cs;
        }else{
          w[o]=w[q]*cs+w[q+4]*sn;w[o+1]=w[q+1]*cs+w[q+5]*sn;w[o+2]=w[q+2]*cs+w[q+6]*sn;
          w[o+4]=-w[q]*sn+w[q+4]*cs;w[o+5]=-w[q+1]*sn+w[q+5]*cs;w[o+6]=-w[q+2]*sn+w[q+6]*cs;
          w[o+8]=w[q+8];w[o+9]=w[q+9];w[o+10]=w[q+10];
        }
        w[o+12]=w[q]*tx+w[q+4]*ty+w[q+8]*tz+w[q+12];
        w[o+13]=w[q+1]*tx+w[q+5]*ty+w[q+9]*tz+w[q+13];
        w[o+14]=w[q+2]*tx+w[q+6]*ty+w[q+10]*tz+w[q+14];
      }
    }
    let lowest=Infinity;
    for(let i=0;i<4;i++){
      const o=plan.legs[i].footBone*16,k=i*3;
      const bottom=w[o+1]*rest.toes[k]+w[o+5]*rest.toes[k+1]+w[o+9]*rest.toes[k+2]+w[o+13]-rest.radii[i];
      if(bottom<lowest)lowest=bottom;
    }
    const lift=Math.max(0,-lowest);this.metrics[0]=lift;this.metrics[1]=lowest+lift;this.metrics[2]=phase;handle.lastMetrics.set(this.metrics);
    for(let i=0;i<BONES;i++){
      const o=i*16,b=offset+o,r=i*3,x=rest.positions[r],y=rest.positions[r+1],z=rest.positions[r+2];
      out[b]=w[o];out[b+1]=w[o+1];out[b+2]=w[o+2];out[b+3]=0;
      out[b+4]=w[o+4];out[b+5]=w[o+5];out[b+6]=w[o+6];out[b+7]=0;
      out[b+8]=w[o+8];out[b+9]=w[o+9];out[b+10]=w[o+10];out[b+11]=0;
      out[b+12]=w[o+12]-w[o]*x-w[o+4]*y-w[o+8]*z;
      out[b+13]=w[o+13]+lift-w[o+1]*x-w[o+5]*y-w[o+9]*z;
      out[b+14]=w[o+14]-w[o+2]*x-w[o+6]*y-w[o+10]*z;out[b+15]=1;
    }
  }
}
