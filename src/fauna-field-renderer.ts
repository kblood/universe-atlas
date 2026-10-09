import * as THREE from 'three';
import type {CreatureGenome,CreatureGait} from './fauna-runtime.ts';
import {createFaunaMaterial} from './fauna-material.ts';
import {eyeDetailWeight,gaitBlend,rangeWeight} from './fauna-handoff.ts';

/** Animals drawn through the instanced anatomy per frame. Sized from the
 * measured ground-level population at LETHRA-001 G001/C2128,0,1/0/planet/1
 * (224 camera-visible plus ~65 shadow casters inside 600 m): the former 128
 * dropped 96 in-view animals by distance rank, so which distant animals were
 * drawn depended on how many nearer ones the camera happened to face. */
export const FAUNA_FIELD_CAPACITY=512;
/** Eyes (~5 cm) fall below one 1440p pixel beyond this range at the 48 degree
 * desktop field of view; skipping them there is a fixed distance rule, not a
 * count-dependent budget, so it cannot pop an animal in view. */
export const FAUNA_FIELD_EYE_DETAIL_M=60;
/** Forward-looking low flight needs more than the old 280 m proxy range. */
export const FAUNA_FIELD_VISIBLE_M=600;
export const FAUNA_FIELD_BODY_VERSION='fauna-field-body-2';
export const FAUNA_FIELD_BODY_DETAIL_START_M=95;
export const FAUNA_FIELD_BODY_DETAIL_END_M=150;
function bodyDetailWeight(distanceM:number):number{
  if(distanceM<=FAUNA_FIELD_BODY_DETAIL_START_M)return 1;
  if(distanceM>=FAUNA_FIELD_BODY_DETAIL_END_M||!Number.isFinite(distanceM))return 0;
  const t=(distanceM-FAUNA_FIELD_BODY_DETAIL_START_M)/(FAUNA_FIELD_BODY_DETAIL_END_M-FAUNA_FIELD_BODY_DETAIL_START_M);
  return 1-t*t*(3-2*t);
}
const UP=new THREE.Vector3(0,1,0);
/** True when a part drawn under parent `b` would produce the lanes recorded
 * under parent `a`, up to the translation sums `replay` re-adds: every
 * rotation/scale lane equal, and each translation lane's `t * 0` term (its
 * sign, or NaN) equal, since that term enters the rotation/scale lanes. */
function sameLanes(a:Float64Array,b:ArrayLike<number>):boolean{
  for(let i=0;i<12;i++)if(!Object.is(a[i],b[i]))return false;
  return Object.is(a[15],b[15])&&Object.is(a[12]!*0,b[12]!*0)&&Object.is(a[13]!*0,b[13]!*0)&&Object.is(a[14]!*0,b[14]!*0);
}
/** Parsed genome colours. `Color.set(string)` runs a regex parse and an
 * sRGB-to-linear conversion; it was a third of the fauna frame (512 animals
 * × ~30 parts). The cached Color holds exactly what `set` produced. Genome
 * colours are a small, stable palette; the bound only guards pathological
 * content. */
const colorCache=new Map<string,THREE.Color>();
function faunaColor(style:string):THREE.Color {
  let color=colorCache.get(style);
  if(!color){if(colorCache.size>=4096)colorCache.clear();color=new THREE.Color().set(style);colorCache.set(style,color);}
  return color;
}

/** One animal's instance output (kinds, Float32 matrix lanes, colours) and
 * the inputs that produced it. `FaunaFieldRenderer.submit` is a pure function
 * of (genome, parent, timeS, gait, stateS, eye weight, body-detail weight), with the range fade
 * folded into the parent's scale lanes, so while those repeat, as on
 * every frame at a paused date, replaying the recorded lanes writes exactly
 * the values drawing would. A part's translation lane is
 * `((a11·x + a12·y) + a13·z) + a14` with a14 the parent's (origin-relative)
 * translation, so the record keeps that partial sum in double precision and
 * replay adds the current parent translation: moving the eye (and so the
 * life origin) at a paused date still replays, bit for bit. */
type AnimalRecord={genome:CreatureGenome|null;timeS:number;gait:CreatureGait|null;stateS:number;eyes:number;detail:number;parent:Float64Array;
  parts:number;kinds:Uint8Array;matrices:Float32Array;sums:Float64Array;colors:THREE.Color[];valid:boolean;frame:number};
const RECORD_PARTS=48;

/** Production anatomy uses the existing near body's volumes without building
 * a separate skinned mesh for every animal. Off retains the pinned legacy lanes. */
export interface FaunaFieldOptions { bodyPlan?:boolean }

/** Instanced fallback for specimens outside the near rig pool. Anatomy is
 * drawn as four primitive batches using the same genome and base coat lighting
 * as the near body. This simpler pose does not reproduce the near rig's IK or
 * grazing, so it is not yet a continuous representation handoff.
 * Geometry is in metres; instance translations are relative to a double-
 * precision local origin before they reach the Float32 instance buffers.
 * Production enables bodyPlan: overlapping trunk/skull/muzzle/muscle volumes
 * follow the near plan's proportions through 95 m, then ease into the legacy
 * distant silhouette by 150 m. No per-animal mesh or plan builds are needed.
 *
 * Continuity (opt-in per submission, audit F12/F13): passing the dated
 * activity clock's `stateS` eases the idle <-> walk stride and bob like the
 * near rig (`gaitBlend`), shrinks the eyes through `eyeDetailWeight` instead
 * of cutting them at 60 m, and scales the whole animal through `rangeWeight`
 * to exactly 0 at 600 m. Omitting `stateS` reproduces the former output bit
 * for bit (tests/life-cpu-digest pins it), so the switch is the caller's. */
export class FaunaFieldRenderer {
  readonly group=new THREE.Group();
  private meshes:THREE.InstancedMesh[];
  private counts=[0,0,0,0];
  private animalCount=0;
  private quaternion=new THREE.Quaternion();
  private direction=new THREE.Vector3();
  private a=new THREE.Vector3();
  private b=new THREE.Vector3();
  private readonly records=new Map<object,AnimalRecord>();
  private recording:AnimalRecord|null=null;
  private frame=0;
  /** Parent × uniform range scale, reused (no per-frame allocation). */
  private readonly faded=new THREE.Matrix4();
  private readonly bodyPlan:boolean;
  constructor(options:FaunaFieldOptions={}){
    this.bodyPlan=options.bodyPlan===true;
    const geometries=[new THREE.SphereGeometry(1,10,7),new THREE.CylinderGeometry(1,1,1,7),new THREE.ConeGeometry(1,1,6),new THREE.BoxGeometry(1,1,1)];
    this.meshes=geometries.map((g,i)=>{
      // Body plan: 3 trunk + skull + muzzle + 4 muscles + 2 eyes; neck
      // has two segments plus tail and eight limb segments. No count overrun.
      const m=new THREE.InstancedMesh(g,createFaunaMaterial(),FAUNA_FIELD_CAPACITY*(this.bodyPlan?[11,11,4,10]:[4,10,4,10])[i]);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.count=0;
      m.castShadow=true;m.receiveShadow=true;
      m.name=['Fauna bodies and eyes','Fauna limbs necks tails','Fauna ears and horns','Fauna feet and armour'][i];
      this.group.add(m);return m;
    });
    this.group.name='Stable dated fauna';
    this.group.userData.bodyVersion=this.bodyPlan?FAUNA_FIELD_BODY_VERSION:'fauna-field-body-1';
  }
  beginFrame(origin:THREE.Vector3){this.group.position.copy(origin);this.counts.fill(0);this.animalCount=0;this.frame++;}
  /** Writes `parent × compose((x,y,z), rotation ?? identity, (sx,sy,sz))`
   * straight into instance `counts[kind]`. The arithmetic is exactly
   * three.js `Matrix4.compose` followed by `multiplyMatrices`, term for
   * term and in the same order (zero terms included), so every Float32 lane
   * is bit-identical to the former `setMatrixAt(multiplyMatrices(...))`; it
   * only skips two Matrix4 round trips per part. */
  private part(kind:number,parent:THREE.Matrix4,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,rotation?:THREE.Quaternion){
    let b11:number,b21:number,b31:number,b12:number,b22:number,b32:number,b13:number,b23:number,b33:number;
    if(rotation){
      const qx=rotation.x,qy=rotation.y,qz=rotation.z,qw=rotation.w;
      const x2=qx+qx,y2=qy+qy,z2=qz+qz,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;
      b11=(1-(yy+zz))*sx;b21=(xy+wz)*sx;b31=(xz-wy)*sx;
      b12=(xy-wz)*sy;b22=(1-(xx+zz))*sy;b32=(yz+wx)*sy;
      b13=(xz+wy)*sz;b23=(yz-wx)*sz;b33=(1-(xx+yy))*sz;
    }else{
      // compose() with the identity quaternion (0,0,0,1): every product term is exactly 0 or 1.
      b11=(1-(0+0))*sx;b21=(0+0)*sx;b31=(0-0)*sx;
      b12=(0-0)*sy;b22=(1-(0+0))*sy;b32=(0+0)*sy;
      b13=(0+0)*sz;b23=(0-0)*sz;b33=(1-(0+0))*sz;
    }
    const ae=parent.elements;
    const a11=ae[0],a12=ae[4],a13=ae[8],a14=ae[12],a21=ae[1],a22=ae[5],a23=ae[9],a24=ae[13];
    const a31=ae[2],a32=ae[6],a33=ae[10],a34=ae[14],a41=ae[3],a42=ae[7],a43=ae[11],a44=ae[15];
    const mesh=this.meshes[kind],index=this.counts[kind]++,te=mesh.instanceMatrix.array as Float32Array,o=index*16;
    te[o]=a11*b11+a12*b21+a13*b31+a14*0;te[o+4]=a11*b12+a12*b22+a13*b32+a14*0;te[o+8]=a11*b13+a12*b23+a13*b33+a14*0;te[o+12]=a11*x+a12*y+a13*z+a14*1;
    te[o+1]=a21*b11+a22*b21+a23*b31+a24*0;te[o+5]=a21*b12+a22*b22+a23*b32+a24*0;te[o+9]=a21*b13+a22*b23+a23*b33+a24*0;te[o+13]=a21*x+a22*y+a23*z+a24*1;
    te[o+2]=a31*b11+a32*b21+a33*b31+a34*0;te[o+6]=a31*b12+a32*b22+a33*b32+a34*0;te[o+10]=a31*b13+a32*b23+a33*b33+a34*0;te[o+14]=a31*x+a32*y+a33*z+a34*1;
    te[o+3]=a41*b11+a42*b21+a43*b31+a44*0;te[o+7]=a41*b12+a42*b22+a43*b32+a44*0;te[o+11]=a41*b13+a42*b23+a43*b33+a44*0;te[o+15]=a41*x+a42*y+a43*z+a44*1;
    const rgb=faunaColor(color);
    mesh.setColorAt(index,rgb);
    const record=this.recording;
    if(record){
      if(record.parts>=RECORD_PARTS||o+16>te.length)record.valid=false;
      else{
        const n=record.parts++,m=n*16,s=n*3;record.kinds[n]=kind;record.colors[n]=rgb;for(let k=0;k<16;k++)record.matrices[m+k]=te[o+k]!;
        record.sums[s]=a11*x+a12*y+a13*z;record.sums[s+1]=a21*x+a22*y+a23*z;record.sums[s+2]=a31*x+a32*y+a33*z;
      }
    }
  }
  private segment(parent:THREE.Matrix4,a:THREE.Vector3,b:THREE.Vector3,radius:number,color:string){
    this.direction.subVectors(b,a);const length=this.direction.length();
    this.quaternion.setFromUnitVectors(UP,this.direction.normalize());
    this.part(1,parent,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,length,radius,color,this.quaternion);
  }
  /** parent is a metre-to-radius-normalized transform with LOCAL translation. */
  /** `key` (e.g. the herd member) enables replay of this animal's last
   * output when every input repeats. Recording starts only once the date has
   * repeated for the animal, so realtime frames pay no copy cost. */
  /** `stateS` (seconds into the dated idle/walk window, `FaunaMemberActivity.stateS`)
   * opts this submission into the continuous presentation; see the class note. */
  submit(g:CreatureGenome,parent:THREE.Matrix4,timeS:number,gait:CreatureGait,distanceM=0,key?:object,stateS?:number):boolean{
    if(this.animalCount>=FAUNA_FIELD_CAPACITY)return false;this.animalCount++;
    const continuous=stateS!==undefined,state=continuous?stateS:NaN;
    const eyes=continuous?eyeDetailWeight(distanceM):distanceM<=FAUNA_FIELD_EYE_DETAIL_M?1:0;
    const detail=this.bodyPlan?bodyDetailWeight(distanceM):0;
    if(continuous){
      // Range fade as a uniform scale about the animal's ground point:
      // parent × diag(w, w, w, 1) leaves the translation lanes untouched.
      const w=rangeWeight(distanceM);
      if(w===0)return true;
      if(w<1){const pe=parent.elements,fe=this.faded.elements;for(let i=0;i<12;i++)fe[i]=pe[i]!*w;for(let i=12;i<16;i++)fe[i]=pe[i]!;parent=this.faded;}
    }
    if(!key){this.draw(g,parent,timeS,gait,eyes,state,detail);return true;}
    const pe=parent.elements;
    let record=this.records.get(key);
    if(record){
      record.frame=this.frame;
      if(record.valid&&record.genome===g&&record.gait===gait&&Object.is(record.stateS,state)&&Object.is(record.eyes,eyes)&&Object.is(record.detail,detail)&&Object.is(record.timeS,timeS)&&sameLanes(record.parent,pe)){this.replay(record,pe);return true;}
    }else{
      record={genome:null,timeS:NaN,gait:null,stateS:NaN,eyes:0,detail:0,parent:new Float64Array(16),parts:0,kinds:new Uint8Array(RECORD_PARTS),
        matrices:new Float32Array(RECORD_PARTS*16),sums:new Float64Array(RECORD_PARTS*3),colors:[],valid:false,frame:this.frame};
      this.records.set(key,record);
    }
    // A new date (realtime): draw only; record from the next repeat on.
    if(!Object.is(record.timeS,timeS)){record.timeS=timeS;record.valid=false;this.draw(g,parent,timeS,gait,eyes,state,detail);return true;}
    record.genome=g;record.gait=gait;record.stateS=state;record.eyes=eyes;record.detail=detail;record.parent.set(pe);record.parts=0;record.valid=true;
    this.recording=record;
    try{this.draw(g,parent,timeS,gait,eyes,state,detail);}finally{this.recording=null;}
    return true;
  }
  private replay(record:AnimalRecord,pe:ArrayLike<number>){
    const tx=pe[12]!,ty=pe[13]!,tz=pe[14]!,sums=record.sums;
    for(let n=0;n<record.parts;n++){
      const kind=record.kinds[n]!,mesh=this.meshes[kind]!,index=this.counts[kind]++,te=mesh.instanceMatrix.array as Float32Array,o=index*16,m=n*16,s=n*3;
      for(let k=0;k<12;k++)te[o+k]=record.matrices[m+k]!;
      te[o+12]=sums[s]!+tx;te[o+13]=sums[s+1]!+ty;te[o+14]=sums[s+2]!+tz;te[o+15]=record.matrices[m+15]!;
      mesh.setColorAt(index,record.colors[n]!);
    }
  }
  /** `eyes` is the eye coverage (0 skips them); `stateS` NaN keeps the
   * former binary gait, a number eases it on the dated window clock. Weights
   * of exactly 0 and 1 take the former expressions, so legacy lanes are
   * bit-identical. */
  private draw(g:CreatureGenome,parent:THREE.Matrix4,timeS:number,gait:CreatureGait,eyes:number,stateS:number,detail:number){
    const walk=Number.isNaN(stateS)?(gait!=='idle'?1:0):gaitBlend(gait,stateS),phase=timeS*g.walkSpeed/Math.max(.2,g.strideLength)*Math.PI*2;
    const walkBob=Math.sin(phase*2)*g.legLength*.012,idleBob=Math.sin(timeS*1.8)*.006;
    const bob=walk===1?walkBob:walk===0?idleBob:idleBob+(walkBob-idleBob)*walk;
    const torsoY=g.legLength+g.torsoHeight*.36+bob;
    if(detail>0){
      // Same pelvis/barrel/chest proportions as createQuadrupedPlan. The
      // intersecting volumes make a shoulder and a belly instead of a tube.
      this.part(0,parent,-g.torsoLength*.035*detail,torsoY+g.torsoHeight*.025*detail,0,g.torsoLength*(.52-.16*detail),g.torsoHeight*.42,g.torsoWidth*(.52-.09*detail),g.color);
      this.part(0,parent,-g.torsoLength*.2,torsoY+g.torsoHeight*.03,0,g.torsoLength*.33*detail,g.torsoHeight*.47*detail,g.torsoWidth*.48*detail,g.color);
      this.part(0,parent,g.torsoLength*.17,torsoY-g.torsoHeight*.01,0,g.torsoLength*.36*detail,g.torsoHeight*.52*detail,g.torsoWidth*.5*detail,g.color);
    }else this.part(0,parent,0,torsoY,0,g.torsoLength*.52,g.torsoHeight*.42,g.torsoWidth*.52,g.color);
    const nx=g.torsoLength*.42,ny=torsoY+g.torsoHeight*.12;
    const hx=nx+g.neckLength*.35,hy=ny+g.neckRise+g.neckLength*.66;
    if(detail>0){
      const root=Math.max(.03,Math.min(g.headWidth*.55,g.torsoHeight*.38,g.torsoWidth*.45)),tip=Math.max(g.headWidth*.3,.02),middle=(root+tip)/2;
      const mx=nx+(hx-nx)*(1-detail*.5),my=ny+(hy-ny)*(1-detail*.5);
      this.segment(parent,this.a.set(nx,ny,0),this.b.set(mx,my,0),g.headWidth*.27+((root+middle)/2-g.headWidth*.27)*detail,g.color);
      this.segment(parent,this.a.set(mx,my,0),this.b.set(hx,hy,0),(middle+tip)/2*detail,g.color);
      this.part(0,parent,hx+g.headLength*(.3-.18*detail),hy+g.headWidth*.08*detail,0,g.headLength*(.52-.18*detail),g.headWidth*(.48-.03*detail),g.headWidth*(.52-.06*detail),g.color);
      this.part(0,parent,hx+g.headLength*.43,hy-g.headWidth*.12,0,g.headLength*.32*detail,g.headWidth*.25*detail,g.headWidth*.32*detail,g.color);
    }else{
      this.segment(parent,this.a.set(nx,ny,0),this.b.set(hx,hy,0),g.headWidth*.27,g.color);
      this.part(0,parent,hx+g.headLength*.3,hy,0,g.headLength*.52,g.headWidth*.48,g.headWidth*.52,g.color);
    }
    this.segment(parent,this.a.set(-g.torsoLength*.43,torsoY,0),this.b.set(-g.torsoLength*.43-g.tailLength*.84,torsoY+g.tailLength*.12,Math.sin(phase*.5)*g.tailLength*.08),Math.max(.006,g.torsoWidth*.04),g.accentColor);
    for(const side of [-1,1]){
      if(eyes>0){const r=.025*eyes;this.part(0,parent,hx+g.headLength*(.57-.27*detail),hy+g.headWidth*(.12+.08*detail),side*g.headWidth*(.43-.07*detail),r,r,r,'#151a12');}
      if(g.earLength>.01)this.part(2,parent,hx+g.headLength*.15,hy+g.headWidth*.42,side*g.headWidth*.32,g.headWidth*.1,g.earLength,g.headWidth*.1,g.accentColor);
      if(g.hornLength>.01)this.part(2,parent,hx+g.headLength*.35,hy+g.headWidth*.48+g.hornLength*.42,side*g.headWidth*.25,g.headWidth*.09,g.hornLength,g.headWidth*.09,g.accentColor);
      for(const rear of [false,true]){
        const hipX=(rear?-.3:.3)*g.torsoLength,z=side*g.stanceWidth*.5;
        const legPhase=phase+(rear?Math.PI:0)+(side<0?Math.PI:0);
        // ×1 is exact, so a full walk keeps the former lanes.
        const stride=walk===0?0:Math.sin(legPhase)*g.strideLength*.24*walk;
        const lift=walk===0?0:Math.max(0,Math.cos(legPhase))*g.legLength*.12*walk;
        const footX=hipX+stride,footY=g.footWidth*.18+lift;
        const kneeX=hipX+(rear?.12:-.12)*g.legLength+stride*.45,kneeY=g.legLength*.48+lift*.5;
        if(detail>0){
          // Load-bearing radii from the near plan. Small feet no longer imply
          // matchstick thighs; the muscle joins inside the chest/haunch.
          const ankle=Math.max(g.footWidth*.3,g.legLength*.028,.016),knee=Math.max(g.footWidth*.38,g.legLength*.042,ankle*1.15);
          const hip=Math.max(g.torsoHeight*(rear?.26:.22),knee*1.6),hipY=g.legLength+bob+g.torsoHeight*(.36-(rear?.05:.02))*detail,hipZ=z*.82+(side*g.torsoWidth*.3-z*.82)*detail;
          this.a.set(hipX,hipY,hipZ);this.b.set(kneeX,kneeY,z);
          this.direction.subVectors(this.b,this.a);const length=this.direction.length();
          this.quaternion.setFromUnitVectors(UP,this.direction.normalize());
          const f=rear?.22:.18;
          this.part(0,parent,hipX+(kneeX-hipX)*f,hipY+(kneeY-hipY)*f,hipZ+(z-hipZ)*f,hip*(rear?1:.83)*detail,Math.min(length*.37,g.torsoHeight*.39)*detail,hip*.75*detail,g.color,this.quaternion);
          this.segment(parent,this.a,this.b,g.footWidth*.27+(knee-g.footWidth*.27)*detail,g.color);
          this.segment(parent,this.a.set(kneeX,kneeY,z),this.b.set(footX,footY,z),g.footWidth*.2+((knee+ankle)/2-g.footWidth*.2)*detail,g.accentColor);
        }else{
          this.segment(parent,this.a.set(hipX,g.legLength+bob,z*.82),this.b.set(kneeX,kneeY,z),g.footWidth*.27,g.color);
          this.segment(parent,this.a.set(kneeX,kneeY,z),this.b.set(footX,footY,z),g.footWidth*.2,g.accentColor);
        }
        this.part(3,parent,footX+g.footLength*.15,footY,z,g.footLength,g.footWidth*.36,g.footWidth,g.accentColor);
      }
    }
    if(g.armor>.05){const plates=Math.max(2,Math.min(6,Math.round(2+g.armor*4)));
      for(let i=0;i<plates;i++)this.part(3,parent,-g.torsoLength*.3+i*g.torsoLength*.6/Math.max(1,plates-1),torsoY+g.torsoHeight*.38,0,g.torsoLength/plates*.75,g.torsoHeight*.09,g.torsoWidth*1.02,g.accentColor);
    }
  }
  endFrame(){
    for(let i=0;i<this.meshes.length;i++){const m=this.meshes[i];m.count=this.counts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
    // Bound the records (~3 KB each) to animals submitted this frame once they exceed twice the capacity.
    if(this.records.size>FAUNA_FIELD_CAPACITY*2)for(const [key,record] of this.records)if(record.frame!==this.frame)this.records.delete(key);
  }
  get count(){return this.animalCount;}
  get allocatedBytes(){return this.meshes.reduce((sum,m)=>sum+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength??0)+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)*2;}
  dispose(){this.records.clear();for(const m of this.meshes){m.geometry.dispose();(m.material as THREE.Material).dispose();}this.group.removeFromParent();}
}
