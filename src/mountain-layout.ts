import {hash64, macroHeightCode, noise, rng, type V3} from './catalog.ts';
import {sine, detCos} from './det-math.ts';

export const OROGEN_LAYOUT_VERSION = 'orogen-layout-1';
export const OROGEN_LAYOUT = Object.freeze({
  targetShare: .10, probeCount: 4096, candidates: 4096,
  coastGateM: 100, coreFraction: .65, axisSteps: 24,
  majorCount: 3, majorAttempts: 768,
  majorWidthRadius: .045, majorMinWidthM: 30000, majorMaxWidthM: 220000,
  minorWidthRadius: .014, minHalfLength: .10, maxHalfLength: .30,
  majorMinHalfLength: .72, majorMaxHalfLength: .90,
  interiorBowFraction: .12, marginBowFraction: .15,
  minWavelength: .12, maxWavelength: .20, axisDifferenceStep: .00001,
  supportZ: .5, coreCrown: .1,
});
type World = {seed: string; radiusM: number; water: number; type: string; kind?: string};
type Coordinate = (d: V3) => number;
export interface OrogenSample {
  belt: number; axis: V3; axisDistanceM: number; halfWidthM: number; beltIndex: number;
}
export interface OrogenBelt {
  readonly centre: V3; readonly tangent: V3; readonly pole: V3;
  readonly halfWidthM: number; readonly uLimit: number; readonly bendM: number;
  readonly placement: 'margin' | 'interior';
  readonly rank: 'major' | 'minor';
  readonly noiseSeed: number; readonly wavelength: number; readonly amplitudeM: number;
  readonly gradientMax: number;
  readonly curvatureWidthBound: number;
}
const dot = (a: V3, b: V3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V3, b: V3): V3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = (a: V3): V3 => {const l=Math.sqrt(dot(a,a));return l ? [a[0]/l,a[1]/l,a[2]/l] : [0,0,0];};
const ss = (lo: number, hi: number, v: number) => {const t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));return t*t*(3-2*t);};
const empty = (): OrogenSample => ({belt:0,axis:[0,0,0],axisDistanceM:0,halfWidthM:0,beltIndex:-1});

// Same evaluation order as R-CAL-1, before the radius scale and compression.
export function continentalA0(body: World): Coordinate {
  const code=Number(hash64(body.seed+'/macro-v1') & 0xffffffffn),sea=.37+body.water*.22;
  const n=(d: V3,f: number,s: number)=>noise(d[0]*f+13,d[1]*f+37,d[2]*f+19,code+s);
  return body.water ? d=>{
    const macro=macroHeightCode(code,d);
    const coast=macro+(n(d,42,5)-.5)*.012+(n(d,90,6)-.5)*.003;
    return (coast-sea)*47000;
  } : d=>(macroHeightCode(code,d)-.46)*44000;
}

// One cubic value-noise octave. du/dtheta=(1+u*u)/2, so construction
// multiplies the minimum wavelength by (1+uLimit*uLimit): even at the
// endpoints its local base-arc wavelength is at least 16 half widths.
function offset(b: OrogenBelt,u: number) {
  const v=u/b.uLimit;
  return b.bendM*v*v+b.amplitudeM*(2*noise(u*2/b.wavelength+13,37,19,b.noiseSeed)-1);
}
// Exact half-angle along coordinate, unchanged by transverse displacement.
// This point has pole.d = offset/R and x/(sqrt(x*x+z*z)+z) = u.
function centreline(b: OrogenBelt,u: number,R: number): V3 {
  const y=offset(b,u)/R,r=Math.sqrt(1-y*y),den=1+u*u,x=r*2*u/den,z=r*(1-u*u)/den;
  return [x*b.tangent[0]+z*b.centre[0]+y*b.pole[0],x*b.tangent[1]+z*b.centre[1]+y*b.pole[1],x*b.tangent[2]+z*b.centre[2]+y*b.pole[2]];
}
function transverse(b: OrogenBelt,d: V3,R: number,u: number,z: number) {
  const h=OROGEN_LAYOUT.axisDifferenceStep;
  const sign=dot(d,b.pole)*R-offset(b,u)<0?-1:1;
  // Fixed five Gauss-Newton steps minimize squared chord distance, which
  // has the same minimizer as great-circle distance. Start at the sample u.
  for(let i=0;i<5;i++){
    const p=centreline(b,u,R),plus=centreline(b,u+h,R),minus=centreline(b,u-h,R);
    let numerator=0,denominator=0;
    for(let j=0;j<3;j++){const v=(plus[j]-minus[j])/(2*h);numerator+=(d[j]-p[j])*v;denominator+=v*v;}
    const next=u+numerator/denominator;
    // Arithmetic-only clamp to the finite arc; sqrt(v*v) = abs(v).
    const low=(next-b.uLimit+Math.sqrt((next+b.uLimit)*(next+b.uLimit)))/2;
    u=(low+b.uLimit-Math.sqrt((low-b.uLimit)*(low-b.uLimit)))/2;
  }
  const p=centreline(b,u,R),plus=centreline(b,u+h,R),minus=centreline(b,u-h,R);
  const tangent: V3=[plus[0]-minus[0],plus[1]-minus[1],plus[2]-minus[2]];
  let chord2=0;for(let j=0;j<3;j++)chord2+=(d[j]-p[j])*(d[j]-p[j]);
  // 2 asin(chord/2), through fifth order. For supported W/R <= .045,
  // omitted angular term < 3e-13 radians (< 0.000003 metres here).
  const distance=sign*R*Math.sqrt(chord2)*(1+chord2/24+3*chord2*chord2/640);
  return {distance,gradient:cross(d,tangent)};
}
// The last positive value()'s projection, reused by sampleWithA0 for the
// winning belt (footprints never overlap, so it is normally the only one).
let lastDistance=0,lastGradient: V3=[0,0,0];
function value(b: OrogenBelt,d: V3,R: number) {
  const z=dot(d,b.centre);
  if(z<OROGEN_LAYOUT.supportZ)return 0;
  // Cheapest conservative rejections first (pure: the order of these zero
  // exits does not change any value).
  if(Math.abs(dot(d,b.pole)*R)>=b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)return 0;
  const x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z),v=u/b.uLimit;
  if(Math.abs(v)>=1)return 0;
  const {distance,gradient}=transverse(b,d,R,u,z);
  if(Math.abs(distance)>=b.halfWidthM)return 0;
  lastDistance=distance;lastGradient=gradient;
  const fraction=distance/b.halfWidthM;
  return (1-OROGEN_LAYOUT.coreCrown*fraction*fraction)*(1-ss(OROGEN_LAYOUT.coreFraction*b.halfWidthM,b.halfWidthM,Math.abs(distance)))*(1-ss(.75,1,Math.abs(v)));
}

// Base great-circle nodes at the same exact u. The conservative balls include
// the displaced centreline, support width and the intervening base arc.
function nodes(b: OrogenBelt): V3[] {
  const points: V3[]=[];
  for(let j=0;j<=OROGEN_LAYOUT.axisSteps;j++){
    const u=(2*j/OROGEN_LAYOUT.axisSteps-1)*b.uLimit;
    const den=1+u*u,x=2*u/den,z=(1-u*u)/den;
    points.push([b.centre[0]*z+b.tangent[0]*x,b.centre[1]*z+b.tangent[1]*x,b.centre[2]*z+b.tangent[2]*x]);
  }
  return points;
}

/* Build once; sample accepts unit directions. landProbe optionally replaces the
 * fixed equal-area construction probe (directions, not preclassified heights). */
export function buildOrogenLayout({seed,radiusM:R,a0,landProbe}: {
  seed: string; radiusM: number; a0: Coordinate; landProbe?: readonly V3[];
}) {
  const random=rng(seed+'/'+OROGEN_LAYOUT_VERSION),belts: OrogenBelt[]=[],axes: V3[][]=[];
  const probe: V3[]=landProbe ? [...landProbe] : [];
  if(!landProbe)for(let i=0;i<OROGEN_LAYOUT.probeCount;i++){
    const y=1-2*(i+.5)/OROGEN_LAYOUT.probeCount,r=Math.sqrt(1-y*y),p=i*2.399963229728653;
    probe.push([detCos(p)*r,y,sine(p)*r]);
  }
  const land=probe.filter(d=>a0(d)>0),covered=new Uint8Array(land.length);
  let count=0,maxHalfWidthM=0,majorCount=0;
  for(let k=0;k<OROGEN_LAYOUT.candidates && count<land.length*OROGEN_LAYOUT.targetShare;k++){
    const y=2*random()-1,r=Math.sqrt(1-y*y),az=random()*6.283185307179586;
    const c: V3=[detCos(az)*r,y,sine(az)*r],alt=a0(c);
    const placement=k%2===0?'margin':'interior';
    if(alt<800 || (placement==='margin' && alt>3000))continue;
    const e=unit(cross(Math.abs(c[1])<.9?[0,1,0]:[1,0,0],c)),f=cross(c,e);
    let t: V3;
    if(placement==='margin'){
      const h=.004;
      const delta=(v: V3)=>a0(unit([c[0]+h*v[0],c[1]+h*v[1],c[2]+h*v[2]]))-a0(unit([c[0]-h*v[0],c[1]-h*v[1],c[2]-h*v[2]]));
      const de=delta(e),df=delta(f);
      t=unit([e[0]*df-f[0]*de,e[1]*df-f[1]*de,e[2]*df-f[2]*de]);
      if(dot(t,t)===0)continue;
    }else{
      const angle=random()*6.283185307179586,cs=detCos(angle),sn=sine(angle);
      t=unit([e[0]*cs+f[0]*sn,e[1]*cs+f[1]*sn,e[2]*cs+f[2]*sn]);
    }
    const major=majorCount<OROGEN_LAYOUT.majorCount && k<OROGEN_LAYOUT.majorAttempts;
    const L=major ? OROGEN_LAYOUT.majorMinHalfLength+(OROGEN_LAYOUT.majorMaxHalfLength-OROGEN_LAYOUT.majorMinHalfLength)*random() : OROGEN_LAYOUT.minHalfLength+random()*(OROGEN_LAYOUT.maxHalfLength-OROGEN_LAYOUT.minHalfLength);
    const W=major ? Math.min(OROGEN_LAYOUT.majorWidthRadius*R,Math.max(OROGEN_LAYOUT.majorMinWidthM,Math.min(OROGEN_LAYOUT.majorMaxWidthM,OROGEN_LAYOUT.majorWidthRadius*R))) : OROGEN_LAYOUT.minorWidthRadius*R*(.85+.3*random());
    const pole=unit(cross(c,t));
    let bendM=(random()*2-1)*OROGEN_LAYOUT.interiorBowFraction*L*R;
    if(placement==='margin'){
      const h=.025,at=(v: V3,s: number)=>a0(unit([c[0]+s*v[0],c[1]+s*v[1],c[2]+s*v[2]]));
      const gradient=(at(pole,h)-at(pole,-h))/(2*h);
      const curvature=(at(t,h)+at(t,-h)-2*alt)/(h*h);
      bendM=Math.max(-OROGEN_LAYOUT.marginBowFraction*L*R,Math.min(OROGEN_LAYOUT.marginBowFraction*L*R,Math.abs(gradient)>1 ? -.5*curvature/gradient*L*L*R : 0));
    }
    const uLimit=sine(L)/(1+detCos(L)),noiseSeed=Math.floor(random()*2147483647),wavelength=Math.max(OROGEN_LAYOUT.minWavelength+(OROGEN_LAYOUT.maxWavelength-OROGEN_LAYOUT.minWavelength)*random(),16*W/R*(1+uLimit*uLimit)),amplitudeM=W*(.3+.3*random());
    // |offset'(u)/R| <= S. Exact grad(u) has norm
    // (1+u*u)/(2*r), r >= z >= supportZ; hence g <= gradientMax.
    const S=2*Math.abs(bendM)/(uLimit*R)+6*amplitudeM/(wavelength*R);
    // u=tan(theta/2): P bounds du/dtheta; |u''| <= uLimit*P.
    // Cubic noise has |n''| <= 6, hence T bounds |offset''(u)/R|.
    // For p=(a cos(theta),a sin(theta),y), a=sqrt(1-y*y),
    // speed >= a; |p''| <= 1+2|a'|+|a''|+|y''|.
    // k*W <= W/R * |p''|/a^2. Rejection enforces <= .2 (radius >= 5W)
    // including the bow and sphere curvature, not just the noise octave.
    const H=(Math.abs(bendM)+amplitudeM)/R,P=(1+uLimit*uLimit)/2;
    const T=2*Math.abs(bendM)/(uLimit*uLimit*R)+48*amplitudeM/(wavelength*wavelength*R);
    const D=S*P,E=T*P*P+S*uLimit*P,a=Math.sqrt(1-H*H);
    const curvatureWidthBound=W/R*(1+2*H*D/a+(D*D+H*E)/a+H*H*D*D/(a*a*a)+E)/(a*a);
    if(curvatureWidthBound>.2)continue;
    const gradientMax=1+S*(1+uLimit*uLimit)/(2*OROGEN_LAYOUT.supportZ);
    const b: OrogenBelt={centre:c,tangent:t,pole,halfWidthM:W,uLimit,bendM,placement,rank:major?'major':'minor',noiseSeed,wavelength,amplitudeM,gradientMax,curvatureWidthBound};
    if((W*gradientMax+Math.abs(bendM)+amplitudeM)/R>=.5)continue;
    const points=nodes(b);
    let separated=true;
    for(let j=0;j<belts.length && separated;j++){
      const old=belts[j];
      // A sample within W of a centreline point has |pole.d| <= H+W/R
      // (dot with a unit pole is 1-Lipschitz in chord distance).
      // The retained gradient-inflated tube is wider still. Its y < .5
      // implies chord to the same-theta base circle <= 1.04*|y|, since
      // chord/|y| = sqrt(2/(1+sqrt(1-y*y))) <= 1.036.
      // Half a base node interval is <= 2*uLimit/axisSteps.
      const gap=(W*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM+old.halfWidthM*old.gradientMax+Math.abs(old.bendM)+old.amplitudeM)/R*1.04+(2*b.uLimit+2*old.uLimit)/OROGEN_LAYOUT.axisSteps;
      const threshold=gap*gap;
      for(const p of points){for(const q of axes[j]){
        const dx=p[0]-q[0],dy=p[1]-q[1],dz=p[2]-q[2];
        if(dx*dx+dy*dy+dz*dz<threshold){separated=false;break;}
      }if(!separated)break;}
    }
    if(!separated)continue;
    // Check the displaced centreline, not just its underlying great circle.
    let landNodes=0;
    for(let j=0;j<points.length;j++){
      const p=points[j],off=offset(b,(2*j/OROGEN_LAYOUT.axisSteps-1)*b.uLimit)/R;
      const radial=Math.sqrt(1-off*off);
      if(a0([p[0]*radial+pole[0]*off,p[1]*radial+pole[1]*off,p[2]*radial+pole[2]*off])>0)landNodes++;
    }
    if(landNodes<points.length*(major?.92:.7))continue;
    if(!(b.curvatureWidthBound<=.2))throw new Error('Curvature exceeds 0.2/W');
    if(major)majorCount++;
    for(let j=0;j<land.length;j++)if(!covered[j] && value(b,land[j],R)>0){covered[j]=1;count++;}
    for(const v of [b.centre,b.tangent,b.pole])Object.freeze(v);
    belts.push(Object.freeze(b));axes.push(points);maxHalfWidthM=Math.max(maxHalfWidthM,W);
  }
  const sampleWithA0=(d: V3,alt: number,out: OrogenSample=empty()): OrogenSample=>{
    out.belt=0;out.axis[0]=0;out.axis[1]=0;out.axis[2]=0;out.axisDistanceM=0;out.halfWidthM=0;out.beltIndex=-1;
    if(alt<=0)return out;
    let best=0,index=-1,distance=0,gradient: V3=lastGradient;
    for(let i=0;i<belts.length;i++){const v=value(belts[i],d,R);if(v>best){best=v;index=i;distance=lastDistance;gradient=lastGradient;}}
    if(index<0)return out;
    const b=belts[index];
    out.belt=best*ss(0,OROGEN_LAYOUT.coastGateM,alt);
    if(out.belt===0)return out;
    out.beltIndex=index;out.halfWidthM=b.halfWidthM;out.axisDistanceM=distance;
    const axis=unit(cross(gradient,d));
    out.axis[0]=axis[0];out.axis[1]=axis[1];out.axis[2]=axis[2];return out;
  };
  return Object.freeze({belts:Object.freeze(belts),maxHalfWidthM,sampleWithA0,sample:(d: V3,out?: OrogenSample)=>sampleWithA0(d,a0(d),out)});
}

const cache=new Map<string,ReturnType<typeof buildOrogenLayout>>();
/* Memoised only by geography inputs. Stars and gas giants have empty layouts. */
export function orogenLayout(body: World) {
  const emptyBody=body.type==='Gas giant'||body.kind==='star'||body.type==='Star';
  const key=JSON.stringify([body.seed,body.radiusM,body.water,body.type,emptyBody]);
  let layout=cache.get(key);
  if(!layout){layout=buildOrogenLayout({seed:body.seed,radiusM:body.radiusM,a0:emptyBody?()=>-1:continentalA0(body),...(emptyBody?{landProbe:[]}: {})});cache.set(key,layout);}
  return layout;
}


