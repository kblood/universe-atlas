import {hash64, macroHeightCode, noise, rng, type V3} from './catalog.ts';
import {sine, detCos} from './det-math.ts';

// orogen-layout-3 adds a lazy baked coarse band field; all existing outputs are unchanged.
// orogen-layout-2 (mountains cost plan T2, 2026-10-05): the foot-point solve uses the exact derivative and
// FOOT_POINT_STEPS fixed steps instead of five central-difference steps; distances agree with -1 to 1e-7 m,
// alongM to 0.1 m (docs/mountain-layout-v1.md "In-massif foot-point solve"). The belts are unchanged:
// construction keeps its orogen-layout-1 random stream (OROGEN_LAYOUT_CONSTRUCTION_SEED) and land-coverage predicate (coveredV1).
export const OROGEN_LAYOUT_VERSION = 'orogen-layout-3';
export const OROGEN_LAYOUT_CONSTRUCTION_SEED = 'orogen-layout-1';
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
function lIhash(x: number, y: number, z: number, s: number) {
  let h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77) ^ Math.imul(z, 0xc2b2ae3d) ^ Math.imul(s, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function lNoise(x: number, y: number, z: number, s: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let a = x - ix, b = y - iy, c = z - iz;
  a = a * a * (3 - 2 * a); b = b * b * (3 - 2 * b); c = c * c * (3 - 2 * c);
  let value = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++)
    value += lIhash(ix + dx, iy + dy, iz + dz, s) * (dx ? a : 1 - a) * (dy ? b : 1 - b) * (dz ? c : 1 - c);
  return value;
}
function lMacro(s: number, d: V3) {
  return 0.68 * lNoise(d[0] * 2.6 + 11, d[1] * 2.6 + 31, d[2] * 2.6 + 17, s) + 0.23 * lNoise(d[0] * 5.2, d[1] * 5.2, d[2] * 5.2, s + 1) + 0.09 * lNoise(d[0] * 10.4, d[1] * 10.4, d[2] * 10.4, s + 2);
}
function macroCode(body: World) {
  return Number(hash64(body.seed+'/macro-v1') & 0xffffffffn);
}
export function continentalA0(body: World): Coordinate {
  const code=macroCode(body),sea=.37+body.water*.22;
  const n=(d: V3,f: number,s: number)=>noise(d[0]*f+13,d[1]*f+37,d[2]*f+19,code+s);
  return body.water ? d=>{
    const macro=macroHeightCode(code,d);
    const coast=macro+(n(d,42,5)-.5)*.012+(n(d,90,6)-.5)*.003;
    return (coast-sea)*47000;
  } : d=>(macroHeightCode(code,d)-.46)*44000;
}
// The layout CONSTRUCTION's a0 (orogenLayout): continentalA0 bit for bit on private kernel copies, so the one-time
// construction never feeds type feedback into catalog.ts's per-sample kernels, while the per-sample `sample` keeps
// continentalA0 on the shared kernels (docs/mountains-t6-baked-coarse-2026-10-06.md, cost bisection).
export function constructionA0(body: World): Coordinate {
  const code=macroCode(body),sea=.37+body.water*.22;
  const n=(d: V3,f: number,s: number)=>lNoise(d[0]*f+13,d[1]*f+37,d[2]*f+19,code+s);
  return body.water ? d=>{
    const macro=lMacro(code,d);
    const coast=macro+(n(d,42,5)-.5)*.012+(n(d,90,6)-.5)*.003;
    return (coast-sea)*47000;
  } : d=>(lMacro(code,d)-.46)*44000;
}

// noise(x, 37, 19, s) of catalog.ts, bit for bit (cost plan T2, docs/mountains-opus-decisions-2026-10-05.md
// Q2; docs/mountain-layout-v1.md "In-massif foot-point solve"). With integer y = 37 and z = 19 the y and z
// smoothstep weights are exactly 0 and 1, so every corner term with dy = 1 or dz = 1 is +0 (a finite
// non-negative hash times +0) and adding +0 changes nothing: the eight-corner sum is exactly
// h(ix) (1 - a) + h(ix + 1) a, the two x-corner hashes in noise's own order. ihash XORs the four
// imul terms, so the y, z and seed terms fold into one 32-bit constant k (XOR is associative). The two
// corner hashes are kept for the last (seed, cell): every Gauss-Newton evaluation of one projection
// stays on one belt and nearly always in one noise cell. Pinned against noise() in
// tests/mountain-layout.test.mjs.
const OFFSET_NOISE_Y=37,OFFSET_NOISE_Z=19;
function cornerHash(x: number,k: number) {
  let h=Math.imul(x,0x9e3779b1)^k;
  h=Math.imul(h^(h>>>16),0x85ebca6b);
  h=Math.imul(h^(h>>>13),0xc2b2ae35);
  h^=h>>>16;
  return (h>>>0)/4294967295;
}
let noiseSeedCached=NaN,noiseCellCached=NaN,noiseH0=0,noiseH1=0;
export function offsetNoise(x: number,s: number) {
  const ix=Math.floor(x);
  let a=x-ix;
  a=a*a*(3-2*a);
  if(ix!==noiseCellCached || s!==noiseSeedCached){
    const k=Math.imul(OFFSET_NOISE_Y,0x85ebca77)^Math.imul(OFFSET_NOISE_Z,0xc2b2ae3d)^Math.imul(s,0x27d4eb2f);
    noiseH0=cornerHash(ix,k);noiseH1=cornerHash(ix+1,k);noiseCellCached=ix;noiseSeedCached=s;
  }
  return noiseH0*(1-a)+noiseH1*a;
}
// One cubic value-noise octave. du/dtheta=(1+u*u)/2, so construction
// multiplies the minimum wavelength by (1+uLimit*uLimit): even at the
// endpoints its local base-arc wavelength is at least 16 half widths.
function offset(b: OrogenBelt,u: number) {
  const v=u/b.uLimit;
  return b.bendM*v*v+b.amplitudeM*(2*offsetNoise(u*2/b.wavelength+13,b.noiseSeed)-1);
}
// Exact half-angle along coordinate, unchanged by transverse displacement.
// This point has pole.d = offset/R and x/(sqrt(x*x+z*z)+z) = u.
function centreline(b: OrogenBelt,u: number,R: number): V3 {
  centrelineAt(b,u,R);
  return [clX,clY,clZ];
}
// centreline() without the array: the point in (clX, clY, clZ), the same expressions.
let clX=0,clY=0,clZ=0;
function centrelineAt(b: OrogenBelt,u: number,R: number) {
  const y=offset(b,u)/R,r=Math.sqrt(1-y*y),den=1+u*u,x=r*2*u/den,z=r*(1-u*u)/den,T=b.tangent,C=b.centre,P=b.pole;
  clX=x*T[0]+z*C[0]+y*P[0];clY=x*T[1]+z*C[1]+y*P[1];clZ=x*T[2]+z*C[2]+y*P[2];
}
// Fixed Gauss-Newton step count of the foot-point solve (orogen-layout-2, cost plan T2; chosen by
// measurement, docs/mountain-layout-v1.md "In-massif foot-point solve").
export const FOOT_POINT_STEPS=4;
let footSteps=FOOT_POINT_STEPS;
// Measurement only (scripts/mountain-layout-foot.mjs): run the solve with another step count.
export function setFootPointStepsForMeasurement(n: number) {footSteps=n;}
// The projection of d onto b's displaced centreline (orogen-layout-2, cost plan T2): the signed distance,
// gradient = cross(d, tangent) and the foot u in the trDistance/trG*/trU scalars (no allocation).
// In the belt frame d = x T + z C + py P, and the centreline point at u is p = (r c, r s, y) with
// y = o(u)/R, r = sqrt(1 - y^2), c = 2u/(1+u^2), s = (1-u^2)/(1+u^2): orogen-layout-1's exact half-angle
// point, with o = offset(b, u) = bendM (u/U)^2 + A (2 noise(X) - 1), X = 2u/lambda + 13.
// Exact derivative: noise(X) = h0 (1 - m) + h1 m with a = X - floor(X) and m = a^2 (3 - 2a) (offsetNoise),
// so d noise/du = (h1 - h0) 6a(1 - a) 2/lambda (continuous: m' vanishes at both cell ends), and
// o' = 2 bendM u/U^2 + 24 A (h1 - h0) a(1 - a)/lambda. With w = 2/(1+u^2) (dc/du = w s, ds/du = -w c),
// y' = o'/R and r' = -y y'/r: p' = (r' c + r w s, r' s - r w c, y'), so for the residual e = d - p
//   e.p' = r' (q - r) + r w t + (py - y) y',  |p'|^2 = r'^2 + r^2 w^2 + y'^2,
// with q = x c + z s and t = x s - z c. FOOT_POINT_STEPS Gauss-Newton steps u += e.p'/|p'|^2 (minimising
// the squared chord, the same minimiser as the great-circle distance) from the sample's own u, each
// clamped to the finite arc; no data-dependent exit. sign is the side of the displaced centreline at the
// sample's u (orogen-layout-1's rule).
let trDistance=0,trG0=0,trG1=0,trG2=0,trU=0;
function transverse(b: OrogenBelt,d: V3,R: number,u: number,x: number,z: number,py: number,sign: number) {
  const U=b.uLimit,iU=1/U,iR=1/R,k2=2/b.wavelength,bend=b.bendM,amp=b.amplitudeM,seed=b.noiseSeed;
  let y=0,yp=0,r=1,rp=0,w=2,c=0,s=1;
  for(let i=0;i<=footSteps;i++){
    const v=u*iU,X=u*k2+13,n=offsetNoise(X,seed),a=X-Math.floor(X);
    y=(bend*v*v+amp*(2*n-1))*iR;yp=(2*bend*v*iU+12*amp*(noiseH1-noiseH0)*a*(1-a)*k2)*iR;
    r=Math.sqrt(1-y*y);rp=-y*yp/r;w=2/(1+u*u);c=u*w;s=(1-u*u)*w*.5;
    if(i===footSteps)break;
    const rw=r*w,q=x*c+z*s,t=x*s-z*c;
    u=Math.max(-U,Math.min(U,u+(rp*(q-r)+rw*t+(py-y)*yp)/(rp*rp+rw*rw+yp*yp)));
  }
  // The chord in world coordinates, as orogen-layout-1 measured it: the belt centres are unit only to
  // about 3e-11 (|C|^2 - 1 down to -5.5e-11), so the frame residual (x - r c, z - r s, py - y) would be
  // off by up to R x 3e-11 (measured 7e-6 m at the 1% gate's worst sample); the steps above only pick u.
  const T=b.tangent,C=b.centre,P=b.pole,pT=r*c,pC=r*s,d0=d[0],d1=d[1],d2=d[2];
  const e0=d0-(pT*T[0]+pC*C[0]+y*P[0]),e1=d1-(pT*T[1]+pC*C[1]+y*P[1]),e2=d2-(pT*T[2]+pC*C[2]+y*P[2]),chord2=e0*e0+e1*e1+e2*e2;
  // 2 asin(chord/2), through fifth order. For supported W/R <= .045,
  // omitted angular term < 3e-13 radians (< 0.000003 metres here).
  trDistance=sign*R*Math.sqrt(chord2)*(1+chord2/24+3*chord2*chord2/640);
  // tangent = p' in world coordinates; gradient = cross(d, tangent).
  const kT=rp*c+r*w*s,kC=rp*s-r*w*c;
  const t0=kT*T[0]+kC*C[0]+yp*P[0],t1=kT*T[1]+kC*C[1]+yp*P[1],t2=kT*T[2]+kC*C[2]+yp*P[2];
  trG0=d1*t2-d2*t1;trG1=d2*t0-d0*t2;trG2=d0*t1-d1*t0;trU=u;
}
// beyondChord's bound (below) from the sample's pole coordinate py and its centreline offset
// off = offset(b, u) at its own u: true only when every point of b's displaced arc is at chord >= rho.
function farFromArc(b: OrogenBelt,py: number,off: number,R: number,rho: number) {
  const S=2*Math.abs(b.bendM)/(b.uLimit*R)+6*b.amplitudeM/(b.wavelength*R),H=(Math.abs(b.bendM)+b.amplitudeM)/R;
  const a=Math.sqrt(1-H*H),s=rho/a;
  if(!(s<.5))return false;
  const T2=s*s/(1-s*s),am=a*(1-T2/6),k=S*(1+b.uLimit*b.uLimit)/2;
  const Y=Math.abs(py-off/R);
  // Margins: relative 1e-9 for rounding; absolute 1e-9 (was 1e-12) because the belt centres are unit only
  // to |C| - 1 >= -2.9e-11 (164,328 belts of 4173 catalogue bodies), which moves the frame coordinates'
  // chord off the world-space chord by up to 2(1 - |C|) < 6e-11.
  return Y*am>=(rho*(1+1e-9)+1e-9)*Math.sqrt(k*k+am*am);
}
// The last positive value()'s projection, reused by sampleWithA0 for the
// winning belt (footprints never overlap, so it is normally the only one).
let lastDistance=0,lastG0=0,lastG1=0,lastG2=0,lastU=0;
function value(b: OrogenBelt,d: V3,R: number) {
  const z=dot(d,b.centre);
  if(z<OROGEN_LAYOUT.supportZ)return 0;
  // Cheapest conservative rejections first (pure: the order of these zero
  // exits does not change any value).
  const py=dot(d,b.pole);
  if(Math.abs(py*R)>=b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)return 0;
  const x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z);
  if(Math.abs(u/b.uLimit)>=1)return 0;
  const off=offset(b,u);
  // Every arc point at chord >= W/R: the projected |distance| >= R x chord >= W (the foot is on the arc),
  // so value would return 0 below anyway. An exact rejection (cost plan T2): it spares the solve on the
  // wide pole slabs of other belts.
  if(farFromArc(b,py,off,R,b.halfWidthM/R))return 0;
  return valueInFrame(b,d,R,x,z,py,u,off);
}
// value() past its rejections, from the sample's frame coordinates (x, z, py), u and off = offset(b, u).
function valueInFrame(b: OrogenBelt,d: V3,R: number,x: number,z: number,py: number,u: number,off: number) {
  transverse(b,d,R,u,x,z,py,py*R-off<0?-1:1);
  const distance=trDistance;
  if(Math.abs(distance)>=b.halfWidthM)return 0;
  lastDistance=distance;lastG0=trG0;lastG1=trG1;lastG2=trG2;lastU=trU;
  const fraction=distance/b.halfWidthM;
  return (1-OROGEN_LAYOUT.coreCrown*fraction*fraction)*(1-ss(OROGEN_LAYOUT.coreFraction*b.halfWidthM,b.halfWidthM,Math.abs(distance)))*(1-ss(.75,1,Math.abs(u/b.uLimit)));
}
// orogen-layout-1's value(b, d) > 0 (five central-difference Gauss-Newton steps, the arithmetic clamp),
// kept verbatim for construction only: land coverage decides when construction stops, so the belts must
// not depend on the cost plan T2 solve (a probe within ~1e-7 m of a belt edge could otherwise flip).
function coveredV1(b: OrogenBelt,d: V3,R: number) {
  const z=dot(d,b.centre);
  if(z<OROGEN_LAYOUT.supportZ)return false;
  if(Math.abs(dot(d,b.pole)*R)>=b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)return false;
  const x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),v=x/(r+z)/b.uLimit;
  if(Math.abs(v)>=1)return false;
  let u=x/(r+z);
  const h=OROGEN_LAYOUT.axisDifferenceStep,sign=dot(d,b.pole)*R-offset(b,u)<0?-1:1;
  for(let i=0;i<5;i++){
    const p=centreline(b,u,R),plus=centreline(b,u+h,R),minus=centreline(b,u-h,R);
    let numerator=0,denominator=0;
    for(let j=0;j<3;j++){const t=(plus[j]-minus[j])/(2*h);numerator+=(d[j]-p[j])*t;denominator+=t*t;}
    const next=u+numerator/denominator;
    const low=(next-b.uLimit+Math.sqrt((next+b.uLimit)*(next+b.uLimit)))/2;
    u=(low+b.uLimit-Math.sqrt((low-b.uLimit)*(low-b.uLimit)))/2;
  }
  const p=centreline(b,u,R);
  let chord2=0;for(let j=0;j<3;j++)chord2+=(d[j]-p[j])*(d[j]-p[j]);
  const distance=sign*R*Math.sqrt(chord2)*(1+chord2/24+3*chord2*chord2/640);
  if(Math.abs(distance)>=b.halfWidthM)return false;
  const fraction=distance/b.halfWidthM;
  return (1-OROGEN_LAYOUT.coreCrown*fraction*fraction)*(1-ss(OROGEN_LAYOUT.coreFraction*b.halfWidthM,b.halfWidthM,Math.abs(distance)))*(1-ss(.75,1,Math.abs(v)))>0;
}
// A conservative cap per belt (cost plan T2): value(b, d) > 0 needs |u| < uLimit, i.e. base angle
// |theta| < L = 2 atan(uLimit) with cos L = (1 - U^2)/(1 + U^2), and |pole.d| < Y (the retained tube of
// value's second rejection, over R). With d = x T + z C + y P (|d| = 1), z = sqrt(1 - y^2) cos(theta) >
// sqrt(1 - Y^2) cos L. So dot(d, centre) below that (less a 1e-9 rounding margin, and never below
// supportZ) means value(b, d) = 0: skipping value there changes nothing. Majors gain little; the short
// minor belts (L <= .3) reject about ten times more directions than z < supportZ does.
function capZ(b: OrogenBelt,R: number) {
  const Y=(b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)/R,U2=b.uLimit*b.uLimit;
  return Math.max(OROGEN_LAYOUT.supportZ,Math.sqrt(Math.max(0,1-Y*Y))*(1-U2)/(1+U2)-1e-9);
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
  return farFromArc(b,dot(d,b.pole),offset(b,u),R,rho);
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

/* Sparse 8x8 cell blocks. Each candidate has 9x9 signed-distance nodes; shared nodes are
 * evaluated identically, including across cube faces. No direction-taking lookup is exported. */
export interface CoarseBandField {
  readonly faceCells: number; readonly blockTable: Int32Array; readonly masks: Uint32Array;
  readonly offsets: Uint32Array; readonly candidates: Uint16Array; readonly distances: Float32Array;
  /* Per belt: tangent xyz, centre xyz, uLimit, halfWidthM, delta (units of H). */
  readonly scalars: Float64Array;
  readonly bytes: number; readonly activeCells: number; readonly multiBeltCells: number;
}
function coarseDirection(face: number,i: number,j: number,N: number,d: V3) {
  const k=face>>>1;
  d[k]=face&1?-1:1;d[BAND_AXES_A[k]]=2*i/N-1;d[BAND_AXES_B[k]]=2*j/N-1;
  // World-axis summation order is canonical on edges/corners, independent of the owning face.
  const l=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]);
  d[0]/=l;d[1]/=l;d[2]/=l;
}
// Index of the least significant set bit, integer arithmetic only.
function lowBitIndex(bits: number) {
  let v=bits&-bits,n=0;
  if(v&0xffff0000){n+=16;v>>>=16;}if(v&0xff00){n+=8;v>>>=8;}
  if(v&0xf0){n+=4;v>>>=4;}if(v&0xc){n+=2;v>>>=2;}if(v&2)n++;
  return n;
}
function buildCoarseBandField(belts: readonly OrogenBelt[],R: number,g: OrogenBandGrid,maxDistM: number,minHalfWidthM: number): CoarseBandField {
  const N=g.faceCells/2,B=N/8,table=new Int32Array(6*B*B),flags=new Uint32Array(12*B*B),base=new Uint32Array(12*B*B),d: V3=[0,0,0];
  const mark=(face: number,i: number,j: number)=>{
    if(i<0||j<0||i>=N||j>=N){
      coarseDirection(face,i+.5,j+.5,N,d);
      const c=bandCellIndex(d,N);face=Math.floor(c/(N*N));j=Math.floor(c/N)%N;i=c%N;
    }
    const block=(face*B+(j>>>3))*B+(i>>>3),bit=(j&7)*8+(i&7);
    flags[block*2+(bit>>>5)]|=1<<(bit&31);
  };
  // Union each covered 2x2 T1 cell, then dilate by one field cell (also over face edges).
  for(let w=0;w<g.bits.length;w++){
    let bits=g.bits[w];
    while(bits){const bit=lowBitIndex(bits),c=w*32+bit,face=Math.floor(c/(g.faceCells*g.faceCells));
      const j=(Math.floor(c/g.faceCells)%g.faceCells)>>>1,i=(c%g.faceCells)>>>1;
      const q=(face*B+(j>>>3))*B+(i>>>3),v=(j&7)*8+(i&7);base[2*q+(v>>>5)]|=1<<(v&31);
      bits&=bits-1;
    }
  }
  for(let q=0;q<table.length;q++)for(let h=0;h<2;h++){
    let bits=base[2*q+h];
    while(bits){const bit=lowBitIndex(bits)+32*h,face=Math.floor(q/(B*B)),i=q%B*8+(bit&7),j=Math.floor(q/B)%B*8+(bit>>>3);
      if(i>0&&j>0&&i<N-1&&j<N-1){
        // Interior cell: the 3x3 neighbourhood stays on this face (the same cells mark() would set).
        for(let y=j-1;y<=j+1;y++)for(let x=i-1;x<=i+1;x++){
          const block=(face*B+(y>>>3))*B+(x>>>3),bit=(y&7)*8+(x&7);flags[block*2+(bit>>>5)]|=1<<(bit&31);
        }
      } else for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)mark(face,i+dx,j+dy);
      bits&=bits-1;
    }
  }
  const masks: number[]=[],offsets=[0],candidates: number[]=[],scalars=new Float64Array(belts.length*9);
  // Measured bound, not an analytic curvature claim: 5x5 taps in EVERY active cell,
  // all four worlds, |distance| <= 1.25H and |u/uLimit| < 1. Worst signed interpolation
  // errors: .076814443 / .060304457 / .034594238 / .056697924 H (M/S/R/L).
  // .16 exceeds twice the worst, including Float32 storage. Endpoint-clamped projections
  // dominate; a smooth infinite-curve curvature bound alone would miss those cells.
  // Reproduce with test-results/mountains/t6-baked/interpolation-error.mjs.
  for(let k=0;k<belts.length;k++){
    const b=belts[k];scalars.set([...b.tangent,...b.centre,b.uLimit,b.halfWidthM,.16],k*9);
  }
  // Per-belt block-test constants, hoisted (the same expressions as before, evaluated once per belt).
  const eligible=new Uint8Array(belts.length),capOf=new Float64Array(belts.length),slabOf=new Float64Array(belts.length);
  for(let k=0;k<belts.length;k++){
    const b=belts[k];eligible[k]=b.halfWidthM<minHalfWidthM?0:1;capOf[k]=capZ(b,R);
    slabOf[k]=(b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)/R;
  }
  let activeCells=0,multiBeltCells=0;
  for(let q=0;q<table.length;q++){
    if(!(flags[2*q]||flags[2*q+1]))continue;
    table[q]=offsets.length;
    masks.push(flags[2*q],flags[2*q+1]);
    const face=Math.floor(q/(B*B)),j0=(Math.floor(q/B)%B)*8,i0=(q%B)*8;
    coarseDirection(face,i0+4,j0+4,N,d);
    const cx=d[0],cy=d[1],cz=d[2],rho=8*1.4142135623730951/N+1e-9;
    let count=0,cells=0;
    for(let h=0;h<2;h++){let v=flags[2*q+h];while(v){cells++;v&=v-1;}}
    activeCells+=cells;
    for(let k=0;k<belts.length;k++){
      if(!eligible[k])continue;
      const b=belts[k],C=b.centre,P=b.pole;
      if(cx*C[0]+cy*C[1]+cz*C[2]+rho<capOf[k])continue;
      if(Math.abs(cx*P[0]+cy*P[1]+cz*P[2])-rho>slabOf[k])continue;
      candidates.push(k);count++;
    }
    if(count>1)multiBeltCells+=cells;
    offsets.push(candidates.length);
  }
  const values=new Float32Array(candidates.length*81);
  // Per block, the 9 node rows (bit i = node i) that active cells read.
  const rowsOf=new Uint16Array((offsets.length-1)*9);
  for(let q=0;q<table.length;q++){
    const block=table[q]-1;if(block<0)continue;
    const face=Math.floor(q/(B*B)),j0=(Math.floor(q/B)%B)*8,i0=(q%B)*8,nodeRows=block*9;
    // Only corners of active cells can be read. Preserve every candidate at those
    // corners; a neighbouring cell's rejection cannot discard a shared node.
    for(let j=0;j<8;j++){
      const row=(masks[2*block+(j>>>2)]>>>((j&3)*8))&255,corners=row|(row<<1);
      rowsOf[nodeRows+j]|=corners;rowsOf[nodeRows+j+1]|=corners;
    }
    // Same-face neighbours already built (left: q-1, below: q-B) share this block's column 0 / row 0 nodes:
    // the node direction is the same integer node (i0 + 0 = (i0 - 8) + 8), so its value is copied, not recomputed.
    const left=i0>0?table[q-1]-1:-1,below=j0>0?table[q-B]-1:-1;
    for(let c=offsets[block];c<offsets[block+1];c++){
      const k=candidates[c],b=belts[k],C=b.centre,P=b.pole;
      const H=Math.min(b.halfWidthM,maxDistM);
      let cl=-1,cb=-1;
      if(left>=0)for(let e=offsets[left];e<offsets[left+1];e++)if(candidates[e]===k)cl=e;
      if(below>=0)for(let e=offsets[below];e<offsets[below+1];e++)if(candidates[e]===k)cb=e;
      for(let j=0;j<=8;j++)for(let i=0;i<=8;i++){
        if(!(rowsOf[nodeRows+j]&(1<<i)))continue;
        if(i===0&&cl>=0&&(rowsOf[left*9+j]&256)){values[c*81+j*9]=values[cl*81+j*9+8];continue;}
        if(j===0&&cb>=0&&(rowsOf[below*9+8]&(1<<i))){values[c*81+i]=values[cb*81+72+i];continue;}
        coarseDirection(face,i0+i,j0+j,N,d);
        const x=dot(d,b.tangent),z=dot(d,C),py=dot(d,P),u=x/(Math.sqrt(x*x+z*z)+z);
        transverse(b,d,R,u,x,z,py,py*R-offset(b,u)<0?-1:1);
        values[c*81+j*9+i]=trDistance/H;
      }
    }
  }
  const field={faceCells:N,blockTable:table,masks:Uint32Array.from(masks),offsets:Uint32Array.from(offsets),
    candidates:Uint16Array.from(candidates),distances:values,scalars,activeCells,multiBeltCells};
  const bytes=table.byteLength+field.masks.byteLength+field.offsets.byteLength+field.candidates.byteLength+field.distances.byteLength+scalars.byteLength;
  return Object.freeze({...field,bytes});
}

/* Build once; sample accepts unit directions. landProbe optionally replaces the
 * fixed equal-area construction probe (directions, not preclassified heights). */
export function buildOrogenLayout({seed,radiusM:R,a0,landProbe,sampleA0=a0}: {
  seed: string; radiusM: number; a0: Coordinate; landProbe?: readonly V3[]; sampleA0?: Coordinate;
}) {
  const random=rng(seed+'/'+OROGEN_LAYOUT_CONSTRUCTION_SEED),belts: OrogenBelt[]=[],axes: V3[][]=[];
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
    for(let j=0;j<land.length;j++)if(!covered[j] && coveredV1(b,land[j],R)){covered[j]=1;count++;}
    for(const v of [b.centre,b.tangent,b.pole])Object.freeze(v);
    belts.push(Object.freeze(b));axes.push(points);maxHalfWidthM=Math.max(maxHalfWidthM,W);
  }
  const capZs=Float64Array.from(belts,b=>capZ(b,R));
  // value's pole-slab half-width over R per belt (value(b, d) = 0 where |pole.d| R >= tube).
  const slabs=Float64Array.from(belts,b=>(b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)/R);
  const beltCount=belts.length;
  // value(belts[i], d) behind the cap test (capZ): 0 exactly where value is 0, else value itself.
  const capped=(i: number,d: V3)=>{
    const C=belts[i].centre;
    return d[0]*C[0]+d[1]*C[1]+d[2]*C[2]<capZs[i] ? 0 : value(belts[i],d,R);
  };
  const reset=(out: OrogenSample)=>{
    out.belt=0;out.axis[0]=0;out.axis[1]=0;out.axis[2]=0;out.axisDistanceM=0;out.halfWidthM=0;out.beltIndex=-1;out.alongM=0;
  };
  // The winning belt's fields, written into a reset `out`.
  const finish=(d: V3,alt: number,out: OrogenSample,best: number,index: number,distance: number,g0: number,g1: number,g2: number,foot: number)=>{
    if(index<0)return out;
    const b=belts[index];
    out.belt=best*ss(0,OROGEN_LAYOUT.coastGateM,alt);
    if(out.belt===0)return out;
    out.beltIndex=index;out.halfWidthM=b.halfWidthM;out.axisDistanceM=distance;out.alongM=R*thetaOf(foot);
    // unit(cross(gradient, d)), without the arrays (same expressions).
    const a0=g1*d[2]-g2*d[1],a1=g2*d[0]-g0*d[2],a2=g0*d[1]-g1*d[0],l=Math.sqrt(a0*a0+a1*a1+a2*a2);
    if(l){out.axis[0]=a0/l;out.axis[1]=a1/l;out.axis[2]=a2/l;}
    return out;
  };
  const sampleWithA0=(d: V3,alt: number,out: OrogenSample=empty()): OrogenSample=>{
    reset(out);
    if(alt<=0)return out;
    let best=0,index=-1,distance=0,g0=0,g1=0,g2=0,foot=0;
    for(let i=0;i<beltCount;i++){const v=capped(i,d);if(v>best){best=v;index=i;distance=lastDistance;g0=lastG0;g1=lastG1;g2=lastG2;foot=lastU;}}
    return finish(d,alt,out,best,index,distance,g0,g1,g2,foot);
  };
  // Test/measurement access: sampleWithA0 without the cost plan T2 rejections (capZ, farFromArc, solo
  // words): every belt past value's own orogen-layout-1 rejections runs the solve. Must equal sampleWithA0.
  const sampleWithA0Unpruned=(d: V3,alt: number,out: OrogenSample=empty()): OrogenSample=>{
    reset(out);
    if(alt<=0)return out;
    let best=0,index=-1,distance=0,g0=0,g1=0,g2=0,foot=0;
    for(let i=0;i<beltCount;i++){
      const b=belts[i],z=dot(d,b.centre);
      if(z<OROGEN_LAYOUT.supportZ)continue;
      const py=dot(d,b.pole);
      if(Math.abs(py*R)>=b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)continue;
      const x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z);
      if(Math.abs(u/b.uLimit)>=1)continue;
      const v=valueInFrame(b,d,R,x,z,py,u,offset(b,u));
      if(v>best){best=v;index=i;distance=lastDistance;g0=lastG0;g1=lastG1;g2=lastG2;foot=lastU;}
    }
    return finish(d,alt,out,best,index,distance,g0,g1,g2,foot);
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
    let solo=solos.get(g);if(!solo){solo=new Uint8Array(g.bits.length);solos.set(g,solo);}
    gSolo=solo;
  };
  const solos=new Map<OrogenBandGrid,Uint8Array>();
  // Measurement/test access: the solo decisions taken so far in the (maxDistM, minHalfWidthM) grid.
  const soloWordStats=(maxDistM: number,minHalfWidthM=0)=>{
    const g=bandGrid(maxDistM,minHalfWidthM),solo=solos.get(g)??new Uint8Array(0),soloWords: number[]=[],otherWords: number[]=[];
    for(let w=0;w<solo.length;w++){if(solo[w]===1)soloWords.push(w);else if(solo[w]===2)otherWords.push(w);}
    return {faceCells:g.faceCells,soloWords,otherWords,capZ:capZs,slab:slabs};
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
    tagWord=word;
    return gBits[word]&(1<<(idx&31)) ? gTags[word] : 0;
  };
  // Solo words (cost plan T2, value-preserving): word w of the selected grid is solo when every belt
  // other than its tag belt c has value 0 on every direction of the word's 32 cells, so the other-belt
  // loop of withinFlagged cannot change the winner and is skipped. Decided lazily on the first sample of
  // a word (a pure function of the geometry; gSolo 0 = not yet decided, 1 = solo, 2 = not solo).
  // The word is the gnomonic rectangle s in [s0, s0 + 64/N], t in [t0, t0 + 2/N] on its face; with
  // a = the planar centre (|a| >= 1) and b any planar point of the rectangle, |b - a| <= hd (the planar
  // half-diagonal), so sin(angle(a, b)) <= |a x (b - a)|/(|a| |b|) <= hd and the chord between the
  // directions is at most angle <= hd/sqrt(1 - hd^2) = rw (the two directions are less than 90 degrees
  // apart: same face, nearby s and t). Every direction p of the word then has p.n <= pc.n + rw for any
  // unit n (pc = a/|a|). Belt i is zero on the word when pc.C_i + rw < capZ_i (capZ) or
  // |pc.P_i| - rw >= slab_i (value's pole-slab rejection), each with a 1e-9 margin.
  let tagWord=0,gSolo: Uint8Array=new Uint8Array(0);
  const soloWord=(word: number,c: number)=>{
    const N=gN,cell=word<<5,i0=cell%N,fj=(cell-i0)/N,face=Math.floor(fj/N),j=fj-face*N,k=face>>>1;
    const sc=(i0+16)*2/N-1,tc=(j+.5)*2/N-1,hd=Math.sqrt(32*32+1)/N;
    if(!(hd<.5)){gSolo[word]=2;return false;}
    const rw=hd/Math.sqrt(1-hd*hd)*(1+1e-9)+1e-9,l=Math.sqrt(1+sc*sc+tc*tc),v: V3=[0,0,0];
    v[k]=(face&1?-1:1)/l;v[BAND_AXES_A[k]]=sc/l;v[BAND_AXES_B[k]]=tc/l;
    for(let i=0;i<beltCount;i++){
      if(i===c)continue;
      const C=belts[i].centre,P=belts[i].pole;
      if(v[0]*C[0]+v[1]*C[1]+v[2]*C[2]+rw<capZs[i])continue;
      if(Math.abs(v[0]*P[0]+v[1]*P[1]+v[2]*P[2])-rw>=slabs[i]*(1+1e-9)+1e-12)continue;
      gSolo[word]=2;return false;
    }
    gSolo[word]=1;return true;
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
    let best=0,index=-1,distance=0,g0=0,g1=0,g2=0,foot=0;
    if(tag!==255){
      const c=tag-1,b=belts[c];
      // Belts below the width gate were never stamped, so c passes it; d outside c's band leaves the
      // filtered result empty whichever belt wins.
      // beyondChord(b, d, R, min(maxDistM, W)/R) and then value(b, d, R), sharing the frame coordinates
      // and offset(b, u) (cost plan T2). value's own farFromArc at W is left out: when it holds, the
      // projected |distance| >= W and value returns 0 from the solve anyway.
      const C=b.centre,T=b.tangent,P=b.pole,z=d[0]*C[0]+d[1]*C[1]+d[2]*C[2];
      if(z<OROGEN_LAYOUT.supportZ)return out;
      const x=d[0]*T[0]+d[1]*T[1]+d[2]*T[2],r=Math.sqrt(x*x+z*z),u=x/(r+z);
      if(Math.abs(u/b.uLimit)>=1)return out;
      const py=d[0]*P[0]+d[1]*P[1]+d[2]*P[2],off=offset(b,u);
      if(farFromArc(b,py,off,R,Math.min(maxDistM,b.halfWidthM)/R))return out;
      if(Math.abs(py*R)>=b.halfWidthM*b.gradientMax+Math.abs(b.bendM)+b.amplitudeM)return out;
      const v=valueInFrame(b,d,R,x,z,py,u,off);
      if(!(v>0) || !(b.halfWidthM>=minHalfWidthM) || !(Math.abs(lastDistance)<maxDistM))return out;
      const dc=lastDistance,gc0=lastG0,gc1=lastG1,gc2=lastG2,uc=lastU,s=gSolo[tagWord];
      // A solo word: every other belt is 0 here, so the loop below would pick c (v > 0) and nothing else.
      if(s===1 || (s===0 && soloWord(tagWord,c))){best=v;index=c;distance=dc;g0=gc0;g1=gc1;g2=gc2;foot=uc;}
      else for(let i=0;i<beltCount;i++){
        if(i===c){if(v>best){best=v;index=i;distance=dc;g0=gc0;g1=gc1;g2=gc2;foot=uc;}continue;}
        const w=capped(i,d);if(w>best){best=w;index=i;distance=lastDistance;g0=lastG0;g1=lastG1;g2=lastG2;foot=lastU;}
      }
    }else{
      for(let i=0;i<beltCount;i++){const v=capped(i,d);if(v>best){best=v;index=i;distance=lastDistance;g0=lastG0;g1=lastG1;g2=lastG2;foot=lastU;}}
    }
    finish(d,alt,out,best,index,distance,g0,g1,g2,foot);
    if(out.belt!==0 && out.halfWidthM>=minHalfWidthM && Math.abs(out.axisDistanceM)<maxDistM)return out;
    reset(out);return out;
  };
  // Test/measurement access: whether d's cell is flagged in the (maxDistM, minHalfWidthM) grid.
  const bandCellFlagged=(d: V3,maxDistM: number,minHalfWidthM=0): boolean=>{
    const g=bandGrid(maxDistM,minHalfWidthM),idx=g.all?0:bandCellIndex(d,g.faceCells);
    return g.all || (g.bits[idx>>>5]&(1<<(idx&31)))!==0;
  };
  const coarseFields=new Map<string,CoarseBandField>();
  const coarseBandField=(maxDistM: number,minHalfWidthM: number)=>{
    const key=maxDistM+'/'+minHalfWidthM;
    let field=coarseFields.get(key);
    if(!field){field=buildCoarseBandField(belts,R,bandGrid(maxDistM,minHalfWidthM),maxDistM,minHalfWidthM);coarseFields.set(key,field);}
    return field;
  };
  return Object.freeze({belts:Object.freeze(belts),maxHalfWidthM,sampleWithA0,sample:(d: V3,out?: OrogenSample)=>sampleWithA0(d,sampleA0(d),out),
    sampleWithinWithA0,bandGrid,bandCellFlagged,bandCellIndex,sampleWithA0Unpruned,soloWordStats,coarseBandField});
}

const cache=new Map<string,ReturnType<typeof buildOrogenLayout>>();
/* Memoised only by geography inputs. Stars and gas giants have empty layouts. */
export function orogenLayout(body: World) {
  const emptyBody=body.type==='Gas giant'||body.kind==='star'||body.type==='Star';
  const key=JSON.stringify([body.seed,body.radiusM,body.water,body.type,emptyBody]);
  let layout=cache.get(key);
  if(!layout){layout=buildOrogenLayout({seed:body.seed,radiusM:body.radiusM,a0:emptyBody?()=>-1:constructionA0(body),sampleA0:emptyBody?()=>-1:continentalA0(body),...(emptyBody?{landProbe:[]}: {})});cache.set(key,layout);}
  return layout;
}


