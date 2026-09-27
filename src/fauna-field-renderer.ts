import * as THREE from 'three';
import type {CreatureGenome,CreatureGait} from './fauna-runtime.ts';

export const FAUNA_FIELD_CAPACITY=128;
/** Forward-looking low flight needs more than the old 280 m proxy range. */
export const FAUNA_FIELD_VISIBLE_M=600;
const UP=new THREE.Vector3(0,1,0);

/** A single specimen representation at every viewing distance. Anatomy is
 * instanced as four primitive batches, so the same genome, colour and dated
 * gait survive approach without switching to a generic quad or another rig.
 * Geometry is in metres; instance translations are relative to a double-
 * precision local origin before they reach the Float32 instance buffers. */
export class FaunaFieldRenderer {
  readonly group=new THREE.Group();
  private meshes:THREE.InstancedMesh[];
  private counts=[0,0,0,0];
  private animalCount=0;
  private local=new THREE.Matrix4();
  private combined=new THREE.Matrix4();
  private position=new THREE.Vector3();
  private scale=new THREE.Vector3();
  private quaternion=new THREE.Quaternion();
  private direction=new THREE.Vector3();
  private color=new THREE.Color();
  private a=new THREE.Vector3();
  private b=new THREE.Vector3();
  constructor(){
    const geometries=[new THREE.SphereGeometry(1,10,7),new THREE.CylinderGeometry(1,1,1,7),new THREE.ConeGeometry(1,1,6),new THREE.BoxGeometry(1,1,1)];
    this.meshes=geometries.map((g,i)=>{
      const m=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial(),FAUNA_FIELD_CAPACITY*[4,10,4,10][i]);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.count=0;
      m.name=['Fauna bodies and eyes','Fauna limbs necks tails','Fauna ears and horns','Fauna feet and armour'][i];
      this.group.add(m);return m;
    });
    this.group.name='Stable dated fauna';
  }
  beginFrame(origin:THREE.Vector3){this.group.position.copy(origin);this.counts.fill(0);this.animalCount=0;}
  private part(kind:number,parent:THREE.Matrix4,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,rotation?:THREE.Quaternion){
    this.position.set(x,y,z);this.scale.set(sx,sy,sz);
    this.local.compose(this.position,rotation??this.quaternion.identity(),this.scale);
    this.combined.multiplyMatrices(parent,this.local);
    const mesh=this.meshes[kind],index=this.counts[kind]++;
    mesh.setMatrixAt(index,this.combined);mesh.setColorAt(index,this.color.set(color));
  }
  private segment(parent:THREE.Matrix4,a:THREE.Vector3,b:THREE.Vector3,radius:number,color:string){
    this.direction.subVectors(b,a);const length=this.direction.length();
    this.quaternion.setFromUnitVectors(UP,this.direction.normalize());
    this.part(1,parent,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,length,radius,color,this.quaternion);
  }
  /** parent is a metre-to-radius-normalized transform with LOCAL translation. */
  submit(g:CreatureGenome,parent:THREE.Matrix4,timeS:number,gait:CreatureGait):boolean{
    if(this.animalCount>=FAUNA_FIELD_CAPACITY)return false;this.animalCount++;
    const moving=gait!=='idle',phase=timeS*g.walkSpeed/Math.max(.2,g.strideLength)*Math.PI*2;
    const bob=moving?Math.sin(phase*2)*g.legLength*.012:Math.sin(timeS*1.8)*.006;
    const torsoY=g.legLength+g.torsoHeight*.36+bob;
    this.part(0,parent,0,torsoY,0,g.torsoLength*.52,g.torsoHeight*.42,g.torsoWidth*.52,g.color);
    const nx=g.torsoLength*.42,ny=torsoY+g.torsoHeight*.12;
    const hx=nx+g.neckLength*.35,hy=ny+g.neckRise+g.neckLength*.66;
    this.segment(parent,this.a.set(nx,ny,0),this.b.set(hx,hy,0),g.headWidth*.27,g.color);
    this.part(0,parent,hx+g.headLength*.3,hy,0,g.headLength*.52,g.headWidth*.48,g.headWidth*.52,g.color);
    this.segment(parent,this.a.set(-g.torsoLength*.43,torsoY,0),this.b.set(-g.torsoLength*.43-g.tailLength*.84,torsoY+g.tailLength*.12,Math.sin(phase*.5)*g.tailLength*.08),Math.max(.006,g.torsoWidth*.04),g.accentColor);
    for(const side of [-1,1]){
      this.part(0,parent,hx+g.headLength*.57,hy+g.headWidth*.12,side*g.headWidth*.43,.025,.025,.025,'#151a12');
      if(g.earLength>.01)this.part(2,parent,hx+g.headLength*.15,hy+g.headWidth*.42,side*g.headWidth*.32,g.headWidth*.1,g.earLength,g.headWidth*.1,g.accentColor);
      if(g.hornLength>.01)this.part(2,parent,hx+g.headLength*.35,hy+g.headWidth*.48+g.hornLength*.42,side*g.headWidth*.25,g.headWidth*.09,g.hornLength,g.headWidth*.09,g.accentColor);
      for(const rear of [false,true]){
        const hipX=(rear?-.3:.3)*g.torsoLength,z=side*g.stanceWidth*.5;
        const legPhase=phase+(rear?Math.PI:0)+(side<0?Math.PI:0);
        const stride=moving?Math.sin(legPhase)*g.strideLength*.24:0;
        const lift=moving?Math.max(0,Math.cos(legPhase))*g.legLength*.12:0;
        const footX=hipX+stride,footY=g.footWidth*.18+lift;
        const kneeX=hipX+(rear?.12:-.12)*g.legLength+stride*.45,kneeY=g.legLength*.48+lift*.5;
        this.segment(parent,this.a.set(hipX,g.legLength+bob,z*.82),this.b.set(kneeX,kneeY,z),g.footWidth*.27,g.color);
        this.segment(parent,this.a.set(kneeX,kneeY,z),this.b.set(footX,footY,z),g.footWidth*.2,g.accentColor);
        this.part(3,parent,footX+g.footLength*.15,footY,z,g.footLength,g.footWidth*.36,g.footWidth,g.accentColor);
      }
    }
    if(g.armor>.05){const plates=Math.max(2,Math.min(6,Math.round(2+g.armor*4)));
      for(let i=0;i<plates;i++)this.part(3,parent,-g.torsoLength*.3+i*g.torsoLength*.6/Math.max(1,plates-1),torsoY+g.torsoHeight*.38,0,g.torsoLength/plates*.75,g.torsoHeight*.09,g.torsoWidth*1.02,g.accentColor);
    }
    return true;
  }
  endFrame(){for(let i=0;i<this.meshes.length;i++){const m=this.meshes[i];m.count=this.counts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}}
  get count(){return this.animalCount;}
  get allocatedBytes(){return this.meshes.reduce((sum,m)=>sum+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength??0)+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)*2;}
  dispose(){for(const m of this.meshes){m.geometry.dispose();(m.material as THREE.Material).dispose();}this.group.removeFromParent();}
}
