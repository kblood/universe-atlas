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
  // Signed along-axis arc coordinate (m) of the foot point on the belt's base great
  // circle, R x theta with u = tan(theta/2) (0 at the belt centre). Added for the
  // mountains assembly (M3 carving coordinates); 0 where belt is 0. It does not
  // change any other output.
  alongM?: number;
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
const empty = (): OrogenSample => ({belt:0,axis:[0,0,0],axisDistanceM:0,halfWidthM:0,beltIndex:-1,alongM:0});
// theta = 2 atan(u) for |u| <= tan(.45) (the longest major half-length), by one half-angle
// reduction t = u/(1+sqrt(1+u*u)) <= .229 and the odd atan series to t^19 (first omitted term
// 4 t^21/21 < 1e-14 rad, far under 1 mm at R = 6000 km): arithmetic only, monotone in u.
function thetaOf(u: number) {
  const t=u/(1+Math.sqrt(1+u*u)),t2=t*t;
  return 4*t*(1-t2*(1/3-t2*(1/5-t2*(1/7-t2*(1/9-t2*(1/11-t2*(1/13-t2*(1/15-t2*(1/17-t2/19)))))))));
}

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
  return {distance,gradient:cross(d,tangent),u};
}
// The last positive value()'s projection, reused by sampleWithA0 for the
// winning belt (footprints never overlap, so it is normally the only one).
let lastDistance=0,lastGradient: V3=[0,0,0],lastU=0;
function value(b: OrogenBelt,d: V3,R: number) {
  const z=dot(d,b.centre);
  if(z<OROGEN_LAYOUT.supportZ)return 0;
  // Cheapest conservative rejections first (pure: the order of these zero
  // exits does not change any value).
  if(Math.abs(dot(d,b.pole)*R)>=b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)return 0;
  const x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z),v=u/b.uLimit;
  if(Math.abs(v)>=1)return 0;
  const {distance,gradient,u:foot}=transverse(b,d,R,u,z);
  if(Math.abs(distance)>=b.halfWidthM)return 0;
  lastDistance=distance;lastGradient=gradient;lastU=foot;
  const fraction=distance/b.halfWidthM;
  return (1-OROGEN_LAYOUT.coreCrown*fraction*fraction)*(1-ss(OROGEN_LAYOUT.coreFraction*b.halfWidthM,b.halfWidthM,Math.abs(distance)))*(1-ss(.75,1,Math.abs(v)));
}

// True only when every point of b's displaced centreline arc is at chord >= rho from d, so value(b, d)
// is 0 or its |distance| >= R rho (distance >= R x chord to the foot point). Cheap: one offset() call.
// With d = x T + z C + y P (T, C, P the belt's tangent, centre and pole) and an arc point p(u) at base
// angle 2 atan(u), pole height y(u) = offset(u)/R and base radius r(u) >= a = sqrt(1-H^2):
// |d-p| >= |y - y(u)|, and |d-p| >= r(u) |sin t| for the base-angle difference t (>= a for t beyond
// 90 degrees). Suppose chord < rho, s = rho/a < .5. Then t < asin(s) <= T = s/sqrt(1-s^2), so
// sin t >= m t with m = 1 - T^2/6; |u - u_d| <= P t (|du/dtheta| <= P = (1+uLimit^2)/2 on the arc,
// u_d = the sample's own arc parameter); |y(u) - y(u_d)| <= S |u - u_d| (S bounds |offset'/R|). With
// Y = |y - y(u_d)| and k = S P: chord^2 >= max(0, Y - k t)^2 + (a m t)^2 >= Y^2 (a m)^2 / (k^2 + (a m)^2),
// the minimum over t >= 0. So Y a m >= rho sqrt(k^2 + (a m)^2) (with a relative margin) contradicts
// chord < rho. Off the support (z < supportZ, |v| >= 1) value is 0.
function beyondChord(b: OrogenBelt,d: V3,R: number,rho: number) {
  const z=dot(d,b.centre);
  if(z<OROGEN_LAYOUT.supportZ)return true;
  const x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z);
  if(Math.abs(u/b.uLimit)>=1)return true;
  const S=2*Math.abs(b.bendM)/(b.uLimit*R)+6*b.amplitudeM/(b.wavelength*R),H=(Math.abs(b.bendM)+b.amplitudeM)/R;
  const a=Math.sqrt(1-H*H),s=rho/a;
  if(!(s<.5))return false;
  const T2=s*s/(1-s*s),am=a*(1-T2/6),k=S*(1+b.uLimit*b.uLimit)/2;
  const Y=Math.abs(dot(d,b.pole)-offset(b,u)/R);
  return Y*am>=(rho*(1+1e-9)+1e-12)*Math.sqrt(k*k+am*am);
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

// Massif-band rejection grid (mountains cost plan T1, docs/mountains-opus-decisions-2026-10-05.md Q2;
// docs/mountain-layout-v1.md "Band rejection grid"). VALUE-PRESERVING: it only decides whether
// sampleWithinWithA0 runs the full sampleWithA0 path, never what that path returns.
//
// Cube map: a unit direction d lies on the face of its largest |component| (ties go to x, then y);
// face 2k (+axis k) or 2k+1 (-axis k), local (s,t) = (d[A[k]],d[B[k]])/|d[k]| in [-1,1], cell
// (floor((s+1)N/2), floor((t+1)N/2)). Gnomonic coordinates: great circles are straight lines and an
// angular step is at most the planar step / sqrt(1+r^2) at planar radius r.
//
// Stamping is conservative. A sample with |axisDistanceM| < rho (the band) lies within rho/R + 3e-13 rad
// of the foot point p(u*), u* in [-uLimit,uLimit] (axisDistanceM is R x chord x (1+c^2/24+3c^4/640), at most
// the true arc). p(u*) lies within half a node interval of arc length from a node: with S >= |offset'(u)/R|
// (construction bound), H >= |offset/R| and a = sqrt(1-H^2), |p'(u)| <= 2 + S + S H/a = V. Every node cap
// of radius Pn = rho/R + V du/2 (+ margin) is stamped onto every cell whose bounding cap (centre c, radius
// rc = planar half-diagonal / sqrt(1 + rmin^2)) it meets: c.n >= 1 - (Pn+rc)^2/2 (<= cos(Pn+rc)). The
// candidate cells per face come from the exact s- and t-extent of the cap of radius Pn + sqrt2/N, with
// sin replaced by its upper bound: the tangent planes d_a = s d_F with |n_a - s n_F| = q sqrt(1+s^2).
// A face whose axis component n_F <= q is skipped: for q < .25 such a cap cannot reach the face (every
// face point has d_F >= 1/sqrt(3), and cos(.9553 + q) > q).
const BAND_AXES_A=[1,0,0],BAND_AXES_B=[2,2,1];
export const OROGEN_BAND_GRID = Object.freeze({
  // Cells per face edge: the smallest power of two in [minFaceCells, maxFaceCells] whose face-centre
  // cell (2/N rad) is at most bandCells^-1 of the band radius rho/R (chosen by measurement).
  minFaceCells: 256, maxFaceCells: 2048, bandCells: 4,
  // Centreline node spacing, at most nodeSpacing/N rad of arc (adds half that to every node cap).
  nodeSpacing: 3,
  marginRad: 1e-9,
  // Division-free prefilter: a voxelCells^3 bitset over [-1,1]^3 (buildBandVoxels).
  voxelCells: 128,
});
export interface OrogenBandGrid {
  readonly faceCells: number; readonly bits: Uint32Array; readonly all: boolean; readonly nodes: number;
  // Per 32-cell word: 0 no belt, k+1 every flagged cell of the word was stamped by belt k only, 255 several.
  readonly wordBelt: Uint8Array;
  // Summary at N/8 cells per face edge: a coarse cell is set when any of its 8x8 cells is flagged, so most
  // directions are rejected from this small (cache-resident) map alone.
  readonly coarse: Uint32Array;
  // Voxel prefilter (voxelCells^3 bits): a voxel is set when a band direction may lie in it.
  readonly voxels: Uint32Array;
}
// Voxel prefilter (conservative, division-free lookup): a voxelCells^3 bitset over [-1,1]^3, voxel
// (floor((d_k+1) K/2)) per axis. Every band direction d lies within chord <= angle <= P = rho + V du/2
// (+ margin) of a node p (the cube-map argument, with this stamping's own node spacing), and every point of
// a voxel lies within its half-diagonal h = sqrt3/K of the voxel centre c, so |c - p| <= P + h for every
// voxel that holds a band direction; the voxels in each node's box are tested exactly that way.
function buildBandVoxels(belts: readonly OrogenBelt[],R: number,maxDistM: number,minHalfWidthM: number,all: boolean) {
  const K=OROGEN_BAND_GRID.voxelCells,voxels=new Uint32Array((K*K*K+31)>>>5),h=1.7320508075688772/K,margin=OROGEN_BAND_GRID.marginRad;
  if(all){voxels.fill(0xffffffff);return voxels;}
  for(const b of belts){
    if(!(b.halfWidthM>=minHalfWidthM))continue;
    const rho=Math.min(maxDistM,b.halfWidthM)/R;
    const S=2*Math.abs(b.bendM)/(b.uLimit*R)+6*b.amplitudeM/(b.wavelength*R),H=(Math.abs(b.bendM)+b.amplitudeM)/R;
    const V=2+S+S*H/Math.sqrt(1-H*H),M=Math.floor(2*K*b.uLimit*V)+1,du=2*b.uLimit/M;
    const reach=(rho*(1+margin)+V*du/2+margin+h)*(1+1e-9)+1e-12,r2=reach*reach;
    for(let k=0;k<=M;k++){
      const p=centreline(b,(2*k/M-1)*b.uLimit,R);
      const x0=Math.max(0,Math.floor((p[0]-reach+1)*K/2)),x1=Math.min(K-1,Math.floor((p[0]+reach+1)*K/2));
      const y0=Math.max(0,Math.floor((p[1]-reach+1)*K/2)),y1=Math.min(K-1,Math.floor((p[1]+reach+1)*K/2));
      const z0=Math.max(0,Math.floor((p[2]-reach+1)*K/2)),z1=Math.min(K-1,Math.floor((p[2]+reach+1)*K/2));
      for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
        const cx=(2*x+1)/K-1-p[0],cy=(2*y+1)/K-1-p[1],cz=(2*z+1)/K-1-p[2];
        if(cx*cx+cy*cy+cz*cz<=r2){const v=(x*K+y)*K+z;voxels[v>>>5]|=1<<(v&31);}
      }
    }
  }
  return voxels;
}
// Count of flagged cells of a grid (measurement only).
export function bandGridFlaggedCells(g: OrogenBandGrid) {
  if(g.all)return 6*g.faceCells*g.faceCells;
  let count=0;
  for(let w=0;w<g.bits.length;w++){let v=g.bits[w];v=v-((v>>>1)&0x55555555);v=(v&0x33333333)+((v>>>2)&0x33333333);count+=(Math.imul((v+(v>>>4))&0x0f0f0f0f,0x01010101)>>>24);}
  return count;
}
function bandFaceCells(R: number,maxDistM: number) {
  let n=OROGEN_BAND_GRID.minFaceCells;
  while(n<OROGEN_BAND_GRID.maxFaceCells && 2/n>maxDistM/R/OROGEN_BAND_GRID.bandCells)n*=2;
  return n;
}
function buildBandGrid(belts: readonly OrogenBelt[],R: number,maxDistM: number,minHalfWidthM: number,N: number): OrogenBandGrid {
  const bits=new Uint32Array((6*N*N+31)>>>5),wordBelt=new Uint8Array(bits.length),half=N/2,cellR=1.4142135623730951/N,margin=OROGEN_BAND_GRID.marginRad;
  let nodeCount=0,all=false;
  for(let index=0;index<belts.length;index++){
    const b=belts[index],tag=belts.length<255?index+1:255;
    if(!(b.halfWidthM>=minHalfWidthM))continue;
    const rho=Math.min(maxDistM,b.halfWidthM)/R;
    const S=2*Math.abs(b.bendM)/(b.uLimit*R)+6*b.amplitudeM/(b.wavelength*R),H=(Math.abs(b.bendM)+b.amplitudeM)/R;
    const V=2+S+S*H/Math.sqrt(1-H*H);
    const K=Math.floor(2*N*b.uLimit*V/OROGEN_BAND_GRID.nodeSpacing)+1,du=2*b.uLimit/K;
    const Pn=rho*(1+margin)+V*du/2+margin,Pb=Pn+cellR;
    if(!(Pb<.25)){all=true;break;}
    for(let k=0;k<=K;k++){
      const p=centreline(b,(2*k/K-1)*b.uLimit,R);nodeCount++;
      for(let axis=0;axis<3;axis++)for(let side=0;side<2;side++){
        const nF=side?-p[axis]:p[axis];
        if(nF<=Pb)continue;
        const face=2*axis+side,na=p[BAND_AXES_A[axis]],nb=p[BAND_AXES_B[axis]],A=nF*nF-Pb*Pb;
        const rs=Pb*Math.sqrt(nF*nF+na*na-Pb*Pb),rt=Pb*Math.sqrt(nF*nF+nb*nb-Pb*Pb);
        const iLo=Math.max(0,Math.floor(((na*nF-rs)/A+1)*half-1e-6)),iHi=Math.min(N-1,Math.floor(((na*nF+rs)/A+1)*half+1e-6));
        const jLo=Math.max(0,Math.floor(((nb*nF-rt)/A+1)*half-1e-6)),jHi=Math.min(N-1,Math.floor(((nb*nF+rt)/A+1)*half+1e-6));
        // Row j (cell centres on the great circle t = tc): flag the cells whose centre c has
        // c.n >= cX = 1 - X^2/2, X = Pn + the row's largest rc. On this face (n_F > q) only the near
        // cap satisfies the squared form (alpha + na s)^2 >= cX^2 (1 + s^2 + tc^2), alpha = nF + nb tc,
        // whose s-solutions lie between the roots of A s^2 - 2 alpha na s - (alpha^2 - cX^2 (1+tc^2)) = 0,
        // A = cX^2 - na^2 > 0 (|na| <= sqrt(1 - q^2) < cX since X <= q).
        for(let j=jLo;j<=jHi;j++){
          const tc=(j+.5)/half-1,mt=Math.abs(tc)-1/N,x=Pn+cellR/Math.sqrt(1+(mt>0?mt*mt:0)),cX=1-x*x/2;
          const alpha=nF+nb*tc,Aq=cX*cX-na*na,disc=alpha*alpha*na*na+Aq*(alpha*alpha-cX*cX*(1+tc*tc));
          if(!(Aq>0))throw new Error('band grid: degenerate row');
          if(disc<0)continue;
          const root=Math.sqrt(disc),s1=(alpha*na-root)/Aq,s2=(alpha*na+root)/Aq;
          const lo=Math.max(iLo,Math.floor((s1+1)*half-.5-1e-6)+1),hi=Math.min(iHi,Math.floor((s2+1)*half-.5+1e-6));
          if(lo>hi)continue;
          // Word-masked run fill (N is a multiple of 32, so rows start on a word).
          const first=(face*N+j)*N+lo,last=first+hi-lo,wa=first>>>5,wb=last>>>5,head=-1<<(first&31),tail=-1>>>(31-(last&31));
          if(wa===wb)bits[wa]|=head&tail;
          else{bits[wa]|=head;for(let w=wa+1;w<wb;w++)bits[w]=-1;bits[wb]|=tail;}
          for(let w=wa;w<=wb;w++)wordBelt[w]=wordBelt[w]===0||wordBelt[w]===tag?tag:255;
        }
      }
    }
  }
  // A degenerate (very small) body flags every cell: the full path, still bit-identical.
  const Nc=N>>>3,coarse=new Uint32Array((6*Nc*Nc+31)>>>5);
  if(all){bits.fill(0xffffffff);wordBelt.fill(255);coarse.fill(0xffffffff);}
  else for(let w=0;w<bits.length;w++){
    const v=bits[w];if(v===0)continue;
    // Word w covers cells (w*32 .. w*32+31) of one row (N >= 256): face row j, columns i0 .. i0+31.
    const cell=w<<5,i0=cell%N,fj=(cell-i0)/N,face=Math.floor(fj/N),j=fj-face*N;
    for(let q=0;q<4;q++)if((v>>>(q*8))&0xff){const c=(face*Nc+(j>>>3))*Nc+((i0>>>3)+q);coarse[c>>>5]|=1<<(c&31);}
  }
  return Object.freeze({faceCells:N,bits,all,nodes:nodeCount,wordBelt,coarse,voxels:buildBandVoxels(belts,R,maxDistM,minHalfWidthM,all)});
}
// Index of the cell holding direction d (0 .. 6N^2-1); arithmetic only.
function bandCellIndex(d: V3,N: number) {
  const ax=Math.abs(d[0]),ay=Math.abs(d[1]),az=Math.abs(d[2]),half=N/2;
  let face,m,s,t;
  if(ax>=ay && ax>=az){face=d[0]>0?0:1;m=ax;s=d[1];t=d[2];}
  else if(ay>=az){face=d[1]>0?2:3;m=ay;s=d[0];t=d[2];}
  else{face=d[2]>0?4:5;m=az;s=d[0];t=d[1];}
  const i=Math.max(0,Math.min(N-1,Math.floor((s/m+1)*half))),j=Math.max(0,Math.min(N-1,Math.floor((t/m+1)*half)));
  return (face*N+j)*N+i;
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
  const reset=(out: OrogenSample)=>{
    out.belt=0;out.axis[0]=0;out.axis[1]=0;out.axis[2]=0;out.axisDistanceM=0;out.halfWidthM=0;out.beltIndex=-1;out.alongM=0;
  };
  // The winning belt's fields, written into a reset `out`.
  const finish=(d: V3,alt: number,out: OrogenSample,best: number,index: number,distance: number,gradient: V3,foot: number)=>{
    if(index<0)return out;
    const b=belts[index];
    out.belt=best*ss(0,OROGEN_LAYOUT.coastGateM,alt);
    if(out.belt===0)return out;
    out.beltIndex=index;out.halfWidthM=b.halfWidthM;out.axisDistanceM=distance;out.alongM=R*thetaOf(foot);
    const axis=unit(cross(gradient,d));
    out.axis[0]=axis[0];out.axis[1]=axis[1];out.axis[2]=axis[2];return out;
  };
  const sampleWithA0=(d: V3,alt: number,out: OrogenSample=empty()): OrogenSample=>{
    reset(out);
    if(alt<=0)return out;
    let best=0,index=-1,distance=0,gradient: V3=lastGradient,foot=0;
    for(let i=0;i<belts.length;i++){const v=value(belts[i],d,R);if(v>best){best=v;index=i;distance=lastDistance;gradient=lastGradient;foot=lastU;}}
    return finish(d,alt,out,best,index,distance,gradient,foot);
  };
  // The band grid for (maxDistM, minHalfWidthM), built on first use and kept with the layout.
  const grids=new Map<string,OrogenBandGrid>();
  const bandGrid=(maxDistM: number,minHalfWidthM: number,faceCells?: number): OrogenBandGrid=>{
    if(faceCells!==undefined)return buildBandGrid(belts,R,maxDistM,minHalfWidthM,faceCells);
    const key=maxDistM+'/'+minHalfWidthM;
    let g=grids.get(key);
    if(!g){g=buildBandGrid(belts,R,maxDistM,minHalfWidthM,bandFaceCells(R,maxDistM));grids.set(key,g);}
    return g;
  };
  // The grid of the last (maxDistM, minHalfWidthM), unpacked for the per-sample path.
  let gMax=-1,gMin=-1,gN=0,gHalf=0,gNc=0,gAll=false,gBits: Uint32Array=new Uint32Array(0),gTags: Uint8Array=new Uint8Array(0),gCoarse: Uint32Array=new Uint32Array(0),gVox: Uint32Array=new Uint32Array(0);
  const selectGrid=(maxDistM: number,minHalfWidthM: number)=>{
    const g=bandGrid(maxDistM,minHalfWidthM);
    gMax=maxDistM;gMin=minHalfWidthM;gN=g.faceCells;gHalf=gN/2;gNc=gN>>>3;gAll=g.all;gBits=g.bits;gTags=g.wordBelt;gCoarse=g.coarse;gVox=g.voxels;
  };
  const VK=OROGEN_BAND_GRID.voxelCells,VH=VK/2;
  // The word tag of d's cell in the selected grid (0 = unflagged): voxel prefilter, then bandCellIndex
  // inlined with the coarse map first.
  const bandTag=(d: V3)=>{
    const v=(Math.max(0,Math.min(VK-1,Math.floor((d[0]+1)*VH)))*VK+Math.max(0,Math.min(VK-1,Math.floor((d[1]+1)*VH))))*VK+Math.max(0,Math.min(VK-1,Math.floor((d[2]+1)*VH)));
    if(!(gVox[v>>>5]&(1<<(v&31))))return 0;
    const ax=Math.abs(d[0]),ay=Math.abs(d[1]),az=Math.abs(d[2]),N=gN,half=gHalf;
    let face,m,s,t;
    if(ax>=ay && ax>=az){face=d[0]>0?0:1;m=ax;s=d[1];t=d[2];}
    else if(ay>=az){face=d[1]>0?2:3;m=ay;s=d[0];t=d[2];}
    else{face=d[2]>0?4:5;m=az;s=d[0];t=d[1];}
    const i=Math.max(0,Math.min(N-1,Math.floor((s/m+1)*half))),j=Math.max(0,Math.min(N-1,Math.floor((t/m+1)*half)));
    const c=(face*gNc+(j>>>3))*gNc+(i>>>3);
    if(!(gCoarse[c>>>5]&(1<<(c&31))))return 0;
    const idx=(face*N+j)*N+i,word=idx>>>5;
    return gBits[word]&(1<<(idx&31)) ? gTags[word] : 0;
  };
  // sampleWithA0 restricted to a band: its result when that result has belt !== 0, halfWidthM >=
  // minHalfWidthM and |axisDistanceM| < maxDistM, else the empty sample. Bit-identical to filtering
  // sampleWithA0 (tests/mountain-layout-grid.test.mjs). The grid only decides how much of sampleWithA0
  // must run: an unset voxel, coarse cell or cell is in no belt's band (empty); a cell whose word was
  // stamped by one belt c only is in no other belt's band, so when d is not in c's own band (beyondChord,
  // then value) the filtered result is empty whichever belt wins; otherwise the winner is picked exactly
  // as sampleWithA0 picks it (same order, strict >, c's value reused). maxDistM and minHalfWidthM must be
  // finite and >= 0; d a unit direction.
  // Kept small (the per-sample rejection) so callers can inline it; flagged cells go to withinFlagged.
  const sampleWithinWithA0=(d: V3,alt: number,maxDistM: number,out: OrogenSample=empty(),minHalfWidthM=0): OrogenSample=>{
    reset(out);
    if(alt<=0)return out;
    if(maxDistM!==gMax || minHalfWidthM!==gMin)selectGrid(maxDistM,minHalfWidthM);
    const tag=gAll?255:bandTag(d);
    return tag===0 ? out : withinFlagged(d,alt,maxDistM,out,minHalfWidthM,tag);
  };
  const withinFlagged=(d: V3,alt: number,maxDistM: number,out: OrogenSample,minHalfWidthM: number,tag: number): OrogenSample=>{
    let best=0,index=-1,distance=0,gradient: V3=lastGradient,foot=0;
    if(tag!==255){
      const c=tag-1,b=belts[c];
      // Belts below the width gate were never stamped, so c passes it; d outside c's band leaves the
      // filtered result empty whichever belt wins.
      if(beyondChord(b,d,R,Math.min(maxDistM,b.halfWidthM)/R))return out;
      const v=value(b,d,R);
      if(!(v>0) || !(b.halfWidthM>=minHalfWidthM) || !(Math.abs(lastDistance)<maxDistM))return out;
      const dc=lastDistance,gc=lastGradient,uc=lastU;
      for(let i=0;i<belts.length;i++){
        if(i===c){if(v>best){best=v;index=i;distance=dc;gradient=gc;foot=uc;}continue;}
        const w=value(belts[i],d,R);if(w>best){best=w;index=i;distance=lastDistance;gradient=lastGradient;foot=lastU;}
      }
    }else{
      for(let i=0;i<belts.length;i++){const v=value(belts[i],d,R);if(v>best){best=v;index=i;distance=lastDistance;gradient=lastGradient;foot=lastU;}}
    }
    finish(d,alt,out,best,index,distance,gradient,foot);
    if(out.belt!==0 && out.halfWidthM>=minHalfWidthM && Math.abs(out.axisDistanceM)<maxDistM)return out;
    reset(out);return out;
  };
  // Test/measurement access: whether d's cell is flagged in the (maxDistM, minHalfWidthM) grid.
  const bandCellFlagged=(d: V3,maxDistM: number,minHalfWidthM=0): boolean=>{
    const g=bandGrid(maxDistM,minHalfWidthM),idx=g.all?0:bandCellIndex(d,g.faceCells);
    return g.all || (g.bits[idx>>>5]&(1<<(idx&31)))!==0;
  };
  return Object.freeze({belts:Object.freeze(belts),maxHalfWidthM,sampleWithA0,sample:(d: V3,out?: OrogenSample)=>sampleWithA0(d,a0(d),out),
    sampleWithinWithA0,bandGrid,bandCellFlagged,bandCellIndex});
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


