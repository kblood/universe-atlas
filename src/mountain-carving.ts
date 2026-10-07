// M3 ridge-valley carving (mountains design section 2.3, MTN-4), candidate F.
//
// A seam-free, haloed drainage solve on one global triangulated lattice:
//   - Lattice: rows j = 0..ROWS across the belt (y = -w + j*d), global columns c along it
//     (x = c*d), spacing d = 2w/ROWS (125 m at w = 30 km). Each cell's diagonal is a
//     seeded hash of its global (column,row), so the mesh does not depend on any block.
//   - Blocks of CORE columns are solved on a domain padded by HALO columns on both sides.
//     The routing surface is a tilted reference ramp plus fBm value noise in absolute
//     coordinates; a priority flood from the two belt margins (rows 0 and ROWS only, the
//     side walls are not outlets), steepest-descent receivers, upstream area, a
//     stream-power height integral, a hillslope (Dijkstra) limit and a smooth local
//     relief normalisation follow. Every tie-break is by (row, global column), so a
//     vertex's value is a function of the vertex alone once HALO is large enough:
//     neighbouring blocks agree exactly where they meet and there is no block rhythm.
//     This is measured, not proven (a flood route can in principle run further along the
//     belt than HALO): 0 of 280 seams differ at HALO 192 (1 of 280 at 160, 2 of 56 at 128,
//     max 8e-4 retained); tests/mountain-carving-memo.test.mjs pins it.
//   - The memo stores the cut fraction 1 - retained (Float32) on the block's CORE+3 columns -1 .. CORE+1
//     (the core plus one halo column on the left and two on the right: the taps a 4x4 query in the
//     block's cells reads). Every stored column is solved inside the halo, so a column stored by two
//     blocks is bit-identical in both (pinned). The memo is an LRU of CACHE blocks keyed on exact
//     (seed, halfWidth, block id). It is observationally pure: a value never depends on what was
//     solved before (cold/warm/evicted/child tests).
//   - Query (mountain-carving-3, docs/fable-decision-carving-lattice-2026-10-07.md): the cut fraction is
//     interpolated by a 4x4 tensor Catmull-Rom on the quad lattice (C1: no gradient kink on the lattice
//     lines; the hashed diagonal only shapes the solve's mesh), rows clamped to [0, ROWS], then clamped
//     to [0,1]. Vertex values are reproduced exactly. mountain-carving-2 triangle-interpolated retained
//     (a gradient kink on every lattice line: the 200 m lattice peak of the structural spectrum); that
//     interpolant is kept test-side only (tests/helpers/mountain-carving-triangle.mjs).
//
// The carving is -envelope*cut with cut in [0,1], so envelope + carving = envelope*(1-cut) >= 0
// (coast safety) and it is exactly +0 where belt === 0, envelope <= 0, |across| >= halfWidth, or no
// tap of the 4x4 stencil is cut.
// Arithmetic: only Math.floor/sqrt/imul/min/max/abs (audited); A^(3/8) is
// sqrt(sqrt(sqrt(A*A*A))).
type N=number;
export const MOUNTAIN_CARVING_VERSION='mountain-carving-3';
export const MOUNTAIN_CARVING=Object.freeze({
  METHOD:'F',
  INTERPOLANT:'catmull-rom', // query interpolant of the cut fraction (mountain-carving-3; -2 was a triangle)
  ROWS:480,            // lattice rows across the belt; d = 2w/ROWS
  CORE:128,            // columns per memo block (16 km at w = 30 km)
  HALO:192,            // solve padding per side (24 km at w = 30 km); see the halo note above
  CACHE:32,            // LRU memo blocks
  REFERENCE_M:3000,    // reference straight ramp height e_ref (retained = h/e_ref)
  TILT:1.3,            // routing surface = TILT*e_ref ramp + noise
  NOISE_AMP_M:400,
  NOISE_LAMBDA_M:8000,
  OCTAVES:6,
  GAIN:0.6,
  HILL_SLOPE:1,        // hillslope gradient limit (tan), ramped in over FOOT_M of envelope
  FOOT_M:1500,
  CHANNEL_AREA_M2:600000, // channels (stream power) at or above this upstream area
  K:33,                // stream-power gradient K/A^(3/8), A in m^2
  EPSILON_M:0.000001,  // priority-flood minimum rise
  NORM_DILATE:8,       // relief normalisation: square dilation radius (cells)
  NORM_BLUR_A:4,       // then two box blurs; NORM_BLUR_A + NORM_BLUR_B <= NORM_DILATE
  NORM_BLUR_B:4,
});
// Level bands named for M0 and the LOD ladder (unchanged since mountain-carving-1).
export const CARVING_BANDS=Object.freeze([
  Object.freeze({level:0,wavelengthM:16000}),
  Object.freeze({level:1,wavelengthM:8000}),
  Object.freeze({level:2,wavelengthM:4000}),
  Object.freeze({level:3,wavelengthM:2000}),
  Object.freeze({level:4,wavelengthM:1000}),
]);
const F=MOUNTAIN_CARVING;
const ROWS=F.ROWS,CORE=F.CORE,HALO=F.HALO,NC=CORE+2*HALO+1,NR=ROWS+1,NN=NC*NR,S=CORE+3;

function hash(x:N,y:N,o:N,seed:N):N {
  let h=Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77)^Math.imul(o,0xc2b2ae3d)^Math.imul(seed,0x27d4eb2d);
  h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
  return ((h^(h>>>16))>>>0)/4294967295;
}
function valueNoise(x:N,y:N,o:N,seed:N):N {
  const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(i,j,o,seed),b=hash(i+1,j,o,seed),c=hash(i,j+1,o,seed),d=hash(i+1,j+1,o,seed);
  return 2*((a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v)-1;
}
// Diagonal of the cell whose lower-left vertex is (global column, row): 1 = (c,j)-(c+1,j+1).
function diagonal(col:N,row:N,seed:N):N { return hash(col,row,103,seed)<0.5?1:0; }

// A memo block: cut fractions 1 - retained on the S = CORE+3 stored columns (block-local columns
// -1 .. CORE+1 at index column+1), rows 0..ROWS (Float32).
type Block={seed:N,w:N,id:N,cut:Float32Array,capped:N,positive:N};
type Solved={h:Float64Array,cap:Float64Array,ramp:Float64Array};
// Build counter for benchmarks and purity tests; never read by the arithmetic.
export const carvingBuildStats={count:0};
const cache:Block[]=[];

// Solve one haloed domain. All working arrays are fresh per solve (nothing persists but the
// memo); they are reused across stages once a stage is finished (filled/rd/acc -> blur temps).
// Returns the full-domain solved heights h and the core-column normaliser cap = max(e_ref, M).
function solve(seed:N,w:N,id:N):Solved {
  const filled=new Float64Array(NN),h=new Float64Array(NN),acc=new Float64Array(NN),rd=new Float64Array(NN);
  const ramp=new Float64Array(NR),hill=new Float64Array(NR),diag=new Uint8Array(NN),seen=new Uint8Array(NN);
  const rcv=new Int32Array(NN),order=new Int32Array(NN),heap=new Int32Array(NN),hpos=new Int32Array(NN);
  carvingBuildStats.count++;
  const d=2*w/ROWS,cs=id*CORE-HALO,diagonalLength=d*Math.sqrt(2);
  let norm=0;for(let o=0,a=1;o<F.OCTAVES;o++){norm+=a;a*=F.GAIN;}
  // Routing surface (into filled): tilted reference ramp plus fBm in absolute coordinates.
  for(let j=0;j<NR;j++){
    const y=-w+j*d;ramp[j]=F.REFERENCE_M*Math.max(0,1-Math.abs(y)/w);hill[j]=F.HILL_SLOPE*Math.min(1,ramp[j]/F.FOOT_M);
    for(let i=0;i<NC;i++){
      const k=j*NC+i,x=(cs+i)*d;diag[k]=diagonal(cs+i,j,seed);
      if(j===0||j===ROWS){filled[k]=0;continue;}
      let s=0,a=1,lambda=F.NOISE_LAMBDA_M;
      for(let o=1;o<=F.OCTAVES;o++){s+=a*valueNoise(x/lambda,y/lambda,o,seed);a*=F.GAIN;lambda/=2;}
      filled[k]=F.TILT*ramp[j]+F.NOISE_AMP_M*s/norm;
    }
  }
  // Triangulated neighbours of k in a fixed order (left, right, down, up, diagonals).
  const nb=new Int32Array(8),nl=new Float64Array(8);
  const neighbours=(k:N):N=>{
    const i=k%NC,j=(k-i)/NC;let m=0;
    if(i>0){nb[m]=k-1;nl[m++]=d;}
    if(i<NC-1){nb[m]=k+1;nl[m++]=d;}
    if(j>0){nb[m]=k-NC;nl[m++]=d;}
    if(j<ROWS){nb[m]=k+NC;nl[m++]=d;}
    if(i<NC-1&&j<ROWS&&diag[k]){nb[m]=k+NC+1;nl[m++]=diagonalLength;}
    if(i>0&&j>0&&diag[k-NC-1]){nb[m]=k-NC-1;nl[m++]=diagonalLength;}
    if(i<NC-1&&j>0&&!diag[k-NC]){nb[m]=k-NC+1;nl[m++]=diagonalLength;}
    if(i>0&&j<ROWS&&!diag[k-1]){nb[m]=k+NC-1;nl[m++]=diagonalLength;}
    return m;
  };
  // Binary min-heap on key[] with the local index (row-major, so global order) as tie-break.
  let key=filled,size=0;
  const less=(a:N,b:N):boolean=>key[a]<key[b]||(key[a]===key[b]&&a<b);
  const push=(c:N):void=>{
    let k=hpos[c];if(k<0)k=size++;
    while(k>0){const q=(k-1)>>1,a=heap[q];if(!less(c,a))break;heap[k]=a;hpos[a]=k;k=q;}
    heap[k]=c;hpos[c]=k;
  };
  const pop=():N=>{
    const c=heap[0],a=heap[--size];hpos[c]=-1;
    if(size){let k=0;for(;;){let b=2*k+1;if(b>=size)break;if(b+1<size&&less(heap[b+1],heap[b]))b++;if(!less(heap[b],a))break;heap[k]=heap[b];hpos[heap[k]]=k;k=b;}heap[k]=a;hpos[a]=k;}
    return c;
  };
  const margin=(k:N):boolean=>k<NC||k>=ROWS*NC;
  // 1. Priority flood from the two margin rows (the side walls are not outlets).
  hpos.fill(-1);seen.fill(0);
  for(let k=0;k<NN;k++)if(margin(k)){seen[k]=1;push(k);}
  let count=0;
  while(size){
    const c=pop();order[count++]=c;const m=neighbours(c);
    for(let a=0;a<m;a++){const k=nb[a];if(seen[k])continue;seen[k]=1;filled[k]=Math.max(filled[k],filled[c]+F.EPSILON_M);push(k);}
  }
  // 2. Steepest-descent receivers on the filled surface; ties to the lower index.
  for(let k=0;k<NN;k++){
    rcv[k]=-1;rd[k]=0;acc[k]=d*d;
    if(margin(k))continue;
    let steepest=0;const m=neighbours(k);
    for(let a=0;a<m;a++){const r=nb[a],s=(filled[k]-filled[r])/nl[a];
      if(s>steepest||(s===steepest&&s>0&&r<rcv[k])){steepest=s;rcv[k]=r;rd[k]=nl[a];}}
  }
  // 3. Upstream area in reverse flood order.
  for(let o=count-1;o>=0;o--){const c=order[o],r=rcv[c];if(r>=0)acc[r]+=acc[c];}
  // 4. Height integral from the outlets: hillslope gradient below the channel area,
  //    stream-power gradient K/A^(3/8) (capped by the hillslope gradient) at or above it.
  for(let o=0;o<count;o++){
    const k=order[o],r=rcv[k];
    if(r<0){h[k]=0;continue;}
    const g=hill[(k-k%NC)/NC],A=acc[k];
    h[k]=h[r]+rd[k]*(A<F.CHANNEL_AREA_M2?g:Math.min(g,F.K/Math.sqrt(Math.sqrt(Math.sqrt(A*A*A)))));
  }
  // 5. Hillslope limit: shortest path from margins and channels at the hillslope gradient
  //    (best reuses the area array once the sources are taken from it).
  const best=acc;key=best;size=0;hpos.fill(-1);
  for(let k=0;k<NN;k++){
    if(margin(k)||acc[k]>=F.CHANNEL_AREA_M2){best[k]=h[k];push(k);}else best[k]=Infinity;
  }
  while(size){
    const c=pop(),m=neighbours(c);
    for(let a=0;a<m;a++){
      const k=nb[a];if(margin(k))continue;
      const v=best[c]+hill[(k-k%NC)/NC]*nl[a];
      if(v<best[k]){best[k]=v;push(k);}
    }
  }
  for(let k=0;k<NN;k++)h[k]=Math.min(h[k],best[k]);
  // 6. Smooth local relief normaliser M: box blurs (A, then B) of a square dilation, only
  //    on the columns that reach the stored columns HALO-1 .. HALO+CORE+1 (the column windows never
  //    meet a domain edge). Each column's value is its own window's, so widening the range by one
  //    column per side changes no value on the core.
  const R1=F.NORM_DILATE,RA=F.NORM_BLUR_A,RB=F.NORM_BLUR_B,t1=filled,t2=rd,t3=best;
  const lo=HALO-1-R1-RA-RB,hi=HALO+CORE+1+R1+RA+RB;
  const rowMax=(src:Float64Array,dst:Float64Array,i0:N,i1:N):void=>{
    for(let j=0;j<NR;j++)for(let i=i0;i<=i1;i++){let m=-Infinity;for(let a=i-R1;a<=i+R1;a++)m=Math.max(m,src[j*NC+a]);dst[j*NC+i]=m;}};
  const columnMax=(src:Float64Array,dst:Float64Array,i0:N,i1:N):void=>{
    for(let j=0;j<NR;j++)for(let i=i0;i<=i1;i++){let m=-Infinity;for(let b=Math.max(0,j-R1);b<=Math.min(ROWS,j+R1);b++)m=Math.max(m,src[b*NC+i]);dst[j*NC+i]=m;}};
  const rowMean=(src:Float64Array,dst:Float64Array,r:N,i0:N,i1:N):void=>{
    for(let j=0;j<NR;j++)for(let i=i0;i<=i1;i++){let s=0,c=0;for(let a=i-r;a<=i+r;a++){s+=src[j*NC+a];c++;}dst[j*NC+i]=s/c;}};
  const columnMean=(src:Float64Array,dst:Float64Array,r:N,i0:N,i1:N):void=>{
    for(let j=0;j<NR;j++)for(let i=i0;i<=i1;i++){let s=0,c=0;for(let b=Math.max(0,j-r);b<=Math.min(ROWS,j+r);b++){s+=src[b*NC+i];c++;}dst[j*NC+i]=s/c;}};
  rowMax(h,t1,lo+R1,hi-R1);columnMax(t1,t2,lo+R1,hi-R1);
  rowMean(t2,t1,RA,lo+R1+RA,hi-R1-RA);columnMean(t1,t3,RA,lo+R1+RA,hi-R1-RA);
  rowMean(t3,t1,RB,HALO-1,HALO+CORE+1);columnMean(t1,t2,RB,HALO-1,HALO+CORE+1);
  for(let j=0;j<NR;j++)for(let i=HALO-1;i<=HALO+CORE+1;i++){const k=j*NC+i;t2[k]=Math.max(ramp[j],t2[k]);}
  return {h,cap:t2,ramp};
}
// 7. Memo block: cut = 1 - retained, retained = h / max(e_ref, M) clipped to [0,1], on the stored
//    columns -1 .. CORE+1 (exactly 0 where uncut). capped/positive count the CORE+1 core columns.
function build(seed:N,w:N,id:N):Block {
  const {h,cap}=solve(seed,w,id),cut=new Float32Array(NR*S);let capped=0,positive=0;
  for(let j=0;j<NR;j++)for(let i=-1;i<=CORE+1;i++){
    const k=j*NC+i+HALO,c=cap[k],v=h[k];
    if(i>=0&&i<=CORE&&c>0){positive++;if(v>=c)capped++;}
    cut[j*S+i+1]=c>0?1-Math.min(v/c,1):0;
  }
  return {seed,w,id,cut,capped,positive};
}
// LRU memo: most recently used at the end.
function block(seed:N,w:N,id:N):Block {
  if(traceKeys!==null)traceNote(seed,w,id);
  for(let i=cache.length-1;i>=0;i--){
    const b=cache[i];
    if(b.seed===seed&&b.w===w&&b.id===id){if(i!==cache.length-1){cache.splice(i,1);cache.push(b);}return b;}
  }
  const b=build(seed,w,id);
  if(cache.length>=F.CACHE)cache.shift();
  cache.push(b);return b;
}
// Warm-up and residency transfer (docs/placeat-first-touch-decision-2026-10-07.md, docs/place-query-v1.md).
// A solved block is observationally pure (the same r in every module instance, thread and process), so a block
// solved in a worker can be exported, posted (r.buffer transferable) and imported into another instance's LRU;
// the importing instance then serves it exactly as if it had solved it. Nothing here touches solve(), build() or
// the cutAt arithmetic: the trace is one compare on the block path, importing is an LRU insert.
// Trust: an imported block is data from the same session. It is validated (version, key, shape, value range)
// but its values are not re-solved, so never insert blocks read back from persisted or foreign storage.
export type CarvingBlockKey={seed:N;w:N;id:N};
export type CarvingBlockExport=CarvingBlockKey&{version:string;cut:Float32Array;capped:N;positive:N};
// Counters for benchmarks and tests; never read by the arithmetic.
export const carvingTransferStats={exported:0,imported:0,duplicate:0};
let traceKeys:CarvingBlockKey[]|null=null;
// Record a served block key once, in first-touch order (only while a trace is open).
function traceNote(seed:N,w:N,id:N):void {
  const t=traceKeys as CarvingBlockKey[];
  for(let i=0;i<t.length;i++)if(t[i].seed===seed&&t[i].w===w&&t[i].id===id)return;
  t.push({seed,w,id});
}
// Run fn and return the unique block keys it touched (block path hits and misses, and point-memo hits), in
// first-touch order. Not nestable: throws when a trace is already open. The trace closes even if fn throws.
export function traceCarvingBlocks<T>(fn:()=>T):{result:T;blocks:CarvingBlockKey[]} {
  if(traceKeys!==null)throw new Error('traceCarvingBlocks: a trace is already open');
  const keys:CarvingBlockKey[]=[];traceKeys=keys;
  try{const result=fn();return {result,blocks:keys};}finally{traceKeys=null;}
}
function checkKey(where:string,seed:N,w:N,id:N):void {
  if(seed!==(seed>>>0))throw new Error(where+': seed must be a uint32 (normalised seed)');
  if((id|0)!==id)throw new Error(where+': block id must be an int32');
  if(typeof w!=='number'||!(w>0)||w-w!==0)throw new Error(where+': half-width must be finite and > 0');
}
// A copy of the block (solving it here if it is not resident). The copy's cut.buffer may be transferred.
export function exportCarvingBlock(key:CarvingBlockKey):CarvingBlockExport {
  const {seed,w,id}=key;checkKey('exportCarvingBlock',seed,w,id);
  const b=block(seed,w,id);carvingTransferStats.exported++;
  return {version:MOUNTAIN_CARVING_VERSION,seed,w,id,cut:new Float32Array(b.cut),capped:b.capped,positive:b.positive};
}
// Insert an exported block as the most recently used entry (evicting the oldest exactly as block() does) and take
// ownership of its cut. Returns false (and keeps the resident object, in place) when the key is already resident.
// Throws on any invalid field, leaving the memo untouched. Does not count as a build.
export function importCarvingBlock(b:CarvingBlockExport):boolean {
  if(b===null||typeof b!=='object')throw new Error('importCarvingBlock: not a block export');
  if(b.version!==MOUNTAIN_CARVING_VERSION)throw new Error('importCarvingBlock: version '+b.version+' is not '+MOUNTAIN_CARVING_VERSION);
  const {seed,w,id,cut,capped,positive}=b;checkKey('importCarvingBlock',seed,w,id);
  if(!(cut instanceof Float32Array)||cut.length!==NR*S)throw new Error('importCarvingBlock: cut must be a Float32Array of '+(NR*S)+' values');
  if((capped|0)!==capped||(positive|0)!==positive||!(0<=capped&&capped<=positive&&positive<=NR*(CORE+1)))
    throw new Error('importCarvingBlock: capped/positive must be integers with 0 <= capped <= positive <= '+(NR*(CORE+1)));
  for(let k=0;k<cut.length;k++){const v=cut[k];if(!(v>=0&&v<=1))throw new Error('importCarvingBlock: cut['+k+'] is outside [0,1]');}
  for(let i=0;i<cache.length;i++){const c=cache[i];if(c.seed===seed&&c.w===w&&c.id===id){carvingTransferStats.duplicate++;return false;}}
  if(cache.length>=F.CACHE)cache.shift();
  cache.push({seed,w,id,cut,capped,positive});carvingTransferStats.imported++;return true;
}
// 4x4 tensor Catmull-Rom of the cut fraction (mountain-carving-3). v holds four rows of four taps, the taps of
// row i at v[oi], v[oi+1], v[oi+2], v[oi+3] (columns col-1 .. col+2; rows row-1 .. row+2 clamped to [0, ROWS]); u and
// t are the fractional position in the cell. One expression for the block path and the point memo, on the same
// Float32 values in the same order, so both paths are bit-identical. Clamped to [0,1]: an all-zero stencil gives +0.
function catmullRom(v:Float32Array,o0:N,o1:N,o2:N,o3:N,u:N,t:N):N {
  const a0=u*(u*(1-0.5*u)-0.5),a1=u*u*(1.5*u-2.5)+1,a2=u*(u*(2-1.5*u)+0.5),a3=u*u*(0.5*u-0.5);
  const b0=t*(t*(1-0.5*t)-0.5),b1=t*t*(1.5*t-2.5)+1,b2=t*(t*(2-1.5*t)+0.5),b3=t*t*(0.5*t-0.5);
  const c=b0*(a0*v[o0]+a1*v[o0+1]+a2*v[o0+2]+a3*v[o0+3])+b1*(a0*v[o1]+a1*v[o1+1]+a2*v[o1+2]+a3*v[o1+3])
    +b2*(a0*v[o2]+a1*v[o2+1]+a2*v[o2+2]+a3*v[o2+3])+b3*(a0*v[o3]+a1*v[o3+1]+a2*v[o3+2]+a3*v[o3+3]);
  return Math.max(0,Math.min(1,c));
}
// 4x4 tensor uniform cubic B-spline of the same taps (mountain-carving-3, the M5 rock driver of mountain-assembly-4;
// docs/fable-decision-carving-lattice-2026-10-07.md section 2b). C2 (no curvature jump on a lattice line) but
// approximating: it does not reproduce the vertex values. Weights are >= 0 and sum to 1, so the result is in [0,1]
// and an all-zero stencil gives +0; the clamp is kept for symmetry. Same tap order as catmullRom.
function bspline(v:Float32Array,o0:N,o1:N,o2:N,o3:N,u:N,t:N):N {
  const iu=1-u,it=1-t;
  const a0=iu*iu*iu/6,a1=(3*u*u*u-6*u*u+4)/6,a2=(-3*u*u*u+3*u*u+3*u+1)/6,a3=u*u*u/6;
  const b0=it*it*it/6,b1=(3*t*t*t-6*t*t+4)/6,b2=(-3*t*t*t+3*t*t+3*t+1)/6,b3=t*t*t/6;
  const c=b0*(a0*v[o0]+a1*v[o0+1]+a2*v[o0+2]+a3*v[o0+3])+b1*(a0*v[o1]+a1*v[o1+1]+a2*v[o1+2]+a3*v[o1+3])
    +b2*(a0*v[o2]+a1*v[o2+1]+a2*v[o2+2]+a3*v[o2+3])+b3*(a0*v[o3]+a1*v[o3+1]+a2*v[o3+2]+a3*v[o3+3]);
  return Math.max(0,Math.min(1,c));
}
// Point-query cell memo (docs/placeat-regression-2026-10-07.md). Sparse point queries (place-query.ts placeAt)
// touch one block per massif point, far apart, so the CACHE-block LRU above thrashes and every repeat of a
// query re-solved its block (~150 ms). While a point query is open (enterCarvingPointQuery), cutAt first
// looks up the lattice cell in this memo: the 16 Float32 taps of the cell's 4x4 stencil (rows row-1 .. row+2
// clamped, columns col-1 .. col+2), copied from the solved block, keyed on exact (normalised seed, half-width,
// global column, row). The interpolation reads the same Float32 values with the same expression, so a memo hit is
// bit-identical to the block path (pinned by tests/mountain-carving-memo.test.mjs). One open-addressed table of SLOTS
// slots (linear probing) holding at most FILL entries; past FILL a clock (second-chance) hand evicts: a slot hit since
// the hand last passed (used 2) is demoted to 1 and skipped, the first un-hit entry (used 1) is removed by
// backward-shift deletion (no tombstones, so probe chains stay exact). Capacity FILL = 3072 cells holds a warm
// placeAt set of ~2150 cells without re-solving (mountain-carving-3, docs/fable-decision-carving-lattice-2026-10-07.md
// section 2b; was two generations of 2 x 2048). Bounded: SLOTS x 85 B (16 taps of 4 B and a 21 B key per slot); with the
// CACHE blocks the memo stays under the 8.5 MB bound. Observationally pure like the block memo: eviction order only
// decides whether a value is re-read from a block, never the value. Outside a point query (tiles, bakes, every dense
// caller) the path is the block path.
export const CARVING_POINT_MEMO=Object.freeze({
  SLOTS:4096,          // open-addressed slots (a power of two)
  FILL:3072,           // live entries before the clock evicts (load 0.75)
});
const PS=CARVING_POINT_MEMO.SLOTS,PF=CARVING_POINT_MEMO.FILL,PMASK=PS-1;
const pmSeed=new Uint32Array(PS),pmW=new Float64Array(PS),pmCol=new Int32Array(PS),pmRow=new Int32Array(PS);
// pmUsed: 0 free, 1 live, 2 live and hit since the clock hand last passed it.
const pmUsed=new Uint8Array(PS),pmV=new Float32Array(16*PS);
let pmCount=0,pmHand=0,pointDepth=0;
// Counters for benchmarks and purity tests; never read by the arithmetic.
export const carvingPointMemoStats={hits:0,stores:0,evictions:0};
// Open / close a sparse point query (place-query.ts placeAt). Nestable; always pair them (try/finally).
export function enterCarvingPointQuery():void { pointDepth++; }
export function exitCarvingPointQuery():void { if(pointDepth>0)pointDepth--; }
// Home slot of a key.
function pmHome(seed:N,w:N,col:N,row:N):N {
  const i=Math.imul(seed^Math.imul(col,0x9e3779b1)^Math.imul(row,0x85ebca77)^(w|0),0x27d4eb2d);
  return (i^(i>>>15))&PMASK;
}
// Slot of the key, or -1-(first free slot on its probe chain).
function pmFind(seed:N,w:N,col:N,row:N):N {
  for(let k=pmHome(seed,w,col,row);;k=(k+1)&PMASK){
    if(!pmUsed[k])return -1-k;
    if(pmCol[k]===col&&pmRow[k]===row&&pmSeed[k]===seed&&pmW[k]===w)return k;
  }
}
// Backward-shift deletion of slot i: every later entry of the run whose home is not cyclically in (i, j] moves into
// the hole, so each remaining key stays reachable from its home without tombstones.
function pmDelete(i:N):void {
  pmCount--;carvingPointMemoStats.evictions++;
  for(let j=(i+1)&PMASK;pmUsed[j];j=(j+1)&PMASK){
    if(((j-pmHome(pmSeed[j],pmW[j],pmCol[j],pmRow[j]))&PMASK)<((j-i)&PMASK))continue;
    pmUsed[i]=pmUsed[j];pmSeed[i]=pmSeed[j];pmW[i]=pmW[j];pmCol[i]=pmCol[j];pmRow[i]=pmRow[j];
    pmV.copyWithin(16*i,16*j,16*j+16);i=j;
  }
  pmUsed[i]=0;
}
// Clock: demote hit entries (2 -> 1) until the hand reaches an un-hit one, and delete it.
function pmEvict():void {
  for(;;){
    const k=pmHand;pmHand=(pmHand+1)&PMASK;
    if(pmUsed[k]===2)pmUsed[k]=1;
    else if(pmUsed[k]===1){pmDelete(k);return;}
  }
}
// Store the 16 taps (four taps from each of src[s0..], src[s1..], src[s2..], src[s3..]) of a missed key.
function pmStore(seed:N,w:N,col:N,row:N,src:Float32Array,s0:N,s1:N,s2:N,s3:N):void {
  if(pmCount>=PF)pmEvict();
  const f=pmFind(seed,w,col,row);if(f>=0)return;
  const k=-1-f,o=16*k;pmUsed[k]=1;pmSeed[k]=seed;pmW[k]=w;pmCol[k]=col;pmRow[k]=row;pmCount++;
  for(let i=0;i<4;i++){pmV[o+i]=src[s0+i];pmV[o+4+i]=src[s1+i];pmV[o+8+i]=src[s2+i];pmV[o+12+i]=src[s3+i];}
  carvingPointMemoStats.stores++;
}
// cutAt inside a point query: the same lattice arithmetic and interpolation as below, on the memoised taps.
function cutAtPoint(alongM:N,acrossM:N,halfWidthM:N,seed:N,smooth:boolean):N {
  const d=2*halfWidthM/ROWS,gx=alongM/d,gy=(acrossM+halfWidthM)/d,col=Math.floor(gx),row=Math.min(ROWS-1,Math.floor(gy));
  const u=gx-col,t=gy-row;
  const keyed=(col|0)===col; // the memo keys an int32 column; any other column takes the block path
  const k=keyed?pmFind(seed,halfWidthM,col,row):-1;
  if(k>=0){
    // A point-memo hit never calls block(): note the cell's block for a warm-up trace.
    if(traceKeys!==null)traceNote(seed,halfWidthM,Math.floor(col/CORE));
    carvingPointMemoStats.hits++;pmUsed[k]=2;const o=16*k;
    return smooth?bspline(pmV,o,o+4,o+8,o+12,u,t):catmullRom(pmV,o,o+4,o+8,o+12,u,t);
  }
  const id=Math.floor(col/CORE),v=block(seed,halfWidthM,id).cut,a=col-id*CORE;
  const s0=Math.max(0,row-1)*S+a,s1=row*S+a,s2=(row+1)*S+a,s3=Math.min(ROWS,row+2)*S+a;
  if(keyed)pmStore(seed,halfWidthM,col,row,v,s0,s1,s2,s3);
  return smooth?bspline(v,s0,s1,s2,s3,u,t):catmullRom(v,s0,s1,s2,s3,u,t);
}
// Cut fraction of the envelope at (along, across): 4x4 Catmull-Rom on the stored taps (smooth: the cubic B-spline
// of the same taps). The cell's block-local column a holds tap col-1 at stored index a (stored index = block-local
// column + 1), so the taps are a .. a+3.
function cutAt(alongM:N,acrossM:N,halfWidthM:N,seed:N,smooth:boolean):N {
  if(pointDepth)return cutAtPoint(alongM,acrossM,halfWidthM,seed,smooth);
  const d=2*halfWidthM/ROWS,gx=alongM/d,gy=(acrossM+halfWidthM)/d,col=Math.floor(gx),row=Math.min(ROWS-1,Math.floor(gy));
  const u=gx-col,t=gy-row,id=Math.floor(col/CORE),v=block(seed,halfWidthM,id).cut,a=col-id*CORE;
  const o0=Math.max(0,row-1)*S+a,o1=row*S+a,o2=(row+1)*S+a,o3=Math.min(ROWS,row+2)*S+a;
  return smooth?bspline(v,o0,o1,o2,o3,u,t):catmullRom(v,o0,o1,o2,o3,u,t);
}
// Candidate F carving (metres, <= 0). Arguments follow section 2.3.
export function carvingFM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  // Negated comparisons also exclude NaN envelope / across / half-width and a non-finite along.
  if(belt===0||!(envelopeM>0)||!(Math.abs(acrossM)<halfWidthM)||alongM-alongM!==0)return 0;
  const cut=cutAt(alongM,acrossM,halfWidthM,seed>>>0,false);
  return cut===0?0:-envelopeM*cut;
}
// The smoothed carving (metres, <= 0): the cubic B-spline of the same stored cut, same gates as carvingFM. It is
// NOT the carving height; it only drives M5 rock detail (mountain-assembly-4), whose slope weight and depth need a
// C2 field (a C1 field's slope magnitude kinks on every lattice line and rock turns that into a 200 m grid).
export function carvingSmoothFM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  if(belt===0||!(envelopeM>0)||!(Math.abs(acrossM)<halfWidthM)||alongM-alongM!==0)return 0;
  const cut=cutAt(alongM,acrossM,halfWidthM,seed>>>0,true);
  return cut===0?0:-envelopeM*cut;
}
// Fused rock-path lookup (docs/fable-decision-carving-lattice-2026-10-07.md section 2d; evidence doc section 6).
// Returns C = carvingFM(along, across, ...) and writes out[0] = carvingSmoothFM(along, across, ...), out[1] =
// carvingSmoothFM(along + stepM, across, ...), out[2] = carvingSmoothFM(along, across + stepM, ...), each bit-identical to
// those four calls in that order, with the same block() calls in the same order (so the LRU, the build count and a
// block trace are unchanged): one gate pass, one cell computation and one 16-tap load shared by C and Cb, and the
// B-spline weights shared where the coordinate is shared (Cbx keeps the row weights, Cby the column weights). Inside a
// point query (placeAt) it makes the four separate calls, so the point memo sees exactly the same sequence.
export function carvingRockFM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N,stepM:N,out:Float64Array):N {
  if(pointDepth){
    const C=carvingFM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
    out[0]=carvingSmoothFM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
    out[1]=carvingSmoothFM(alongM+stepM,acrossM,halfWidthM,envelopeM,belt,seed);
    out[2]=carvingSmoothFM(alongM,acrossM+stepM,halfWidthM,envelopeM,belt,seed);
    return C;
  }
  out[0]=0;out[1]=0;out[2]=0;
  // The gates of carvingFM / carvingSmoothFM for each of the three points (negated comparisons exclude NaN).
  if(belt===0||!(envelopeM>0))return 0;
  const xM=alongM+stepM,yM=acrossM+stepM,inA=Math.abs(acrossM)<halfWidthM;
  const okB=inA&&alongM-alongM===0,okX=inA&&xM-xM===0,okY=Math.abs(yM)<halfWidthM&&alongM-alongM===0;
  if(!okB&&!okX&&!okY)return 0;
  const s=seed>>>0,d=2*halfWidthM/ROWS;
  // Base cell (shared by C, Cb and, for its column, Cby; for its row, Cbx).
  const gx=alongM/d,gy=(acrossM+halfWidthM)/d,col=Math.floor(gx),row=Math.min(ROWS-1,Math.floor(gy));
  const u=gx-col,t=gy-row,id=Math.floor(col/CORE),a=col-id*CORE;
  const iu=1-u,it=1-t;
  const ba0=iu*iu*iu/6,ba1=(3*u*u*u-6*u*u+4)/6,ba2=(-3*u*u*u+3*u*u+3*u+1)/6,ba3=u*u*u/6;
  const bb0=it*it*it/6,bb1=(3*t*t*t-6*t*t+4)/6,bb2=(-3*t*t*t+3*t*t+3*t+1)/6,bb3=t*t*t/6;
  let C=0,lastId=0,cur:Float32Array|null=null;
  if(okB){
    const v=block(s,halfWidthM,id).cut;cur=v;lastId=id;
    const o0=Math.max(0,row-1)*S+a,o1=row*S+a,o2=(row+1)*S+a,o3=Math.min(ROWS,row+2)*S+a;
    const p00=v[o0],p01=v[o0+1],p02=v[o0+2],p03=v[o0+3],p10=v[o1],p11=v[o1+1],p12=v[o1+2],p13=v[o1+3];
    const p20=v[o2],p21=v[o2+1],p22=v[o2+2],p23=v[o2+3],p30=v[o3],p31=v[o3+1],p32=v[o3+2],p33=v[o3+3];
    // catmullRom, term for term.
    const a0=u*(u*(1-0.5*u)-0.5),a1=u*u*(1.5*u-2.5)+1,a2=u*(u*(2-1.5*u)+0.5),a3=u*u*(0.5*u-0.5);
    const b0=t*(t*(1-0.5*t)-0.5),b1=t*t*(1.5*t-2.5)+1,b2=t*(t*(2-1.5*t)+0.5),b3=t*t*(0.5*t-0.5);
    const c=b0*(a0*p00+a1*p01+a2*p02+a3*p03)+b1*(a0*p10+a1*p11+a2*p12+a3*p13)
      +b2*(a0*p20+a1*p21+a2*p22+a3*p23)+b3*(a0*p30+a1*p31+a2*p32+a3*p33);
    const cut=Math.max(0,Math.min(1,c));
    C=cut===0?0:-envelopeM*cut;
    // bspline, term for term.
    const cb=bb0*(ba0*p00+ba1*p01+ba2*p02+ba3*p03)+bb1*(ba0*p10+ba1*p11+ba2*p12+ba3*p13)
      +bb2*(ba0*p20+ba1*p21+ba2*p22+ba3*p23)+bb3*(ba0*p30+ba1*p31+ba2*p32+ba3*p33);
    const cutB=Math.max(0,Math.min(1,cb));
    out[0]=cutB===0?0:-envelopeM*cutB;
  }
  if(okX){
    // Same row and t as the base cell (the across coordinate is the same expression).
    const gxx=xM/d,colx=Math.floor(gxx),ux=gxx-colx,idx=Math.floor(colx/CORE),ax=colx-idx*CORE;
    const v=cur!==null&&lastId===idx?cur:block(s,halfWidthM,idx).cut;cur=v;lastId=idx;
    const o0=Math.max(0,row-1)*S+ax,o1=row*S+ax,o2=(row+1)*S+ax,o3=Math.min(ROWS,row+2)*S+ax;
    const iux=1-ux;
    const xa0=iux*iux*iux/6,xa1=(3*ux*ux*ux-6*ux*ux+4)/6,xa2=(-3*ux*ux*ux+3*ux*ux+3*ux+1)/6,xa3=ux*ux*ux/6;
    const cb=bb0*(xa0*v[o0]+xa1*v[o0+1]+xa2*v[o0+2]+xa3*v[o0+3])+bb1*(xa0*v[o1]+xa1*v[o1+1]+xa2*v[o1+2]+xa3*v[o1+3])
      +bb2*(xa0*v[o2]+xa1*v[o2+1]+xa2*v[o2+2]+xa3*v[o2+3])+bb3*(xa0*v[o3]+xa1*v[o3+1]+xa2*v[o3+2]+xa3*v[o3+3]);
    const cutB=Math.max(0,Math.min(1,cb));
    out[1]=cutB===0?0:-envelopeM*cutB;
  }
  if(okY){
    // Same column, u and block as the base cell (the along coordinate is the same expression).
    const gyy=(yM+halfWidthM)/d,rowy=Math.min(ROWS-1,Math.floor(gyy)),ty=gyy-rowy;
    const v=cur!==null&&lastId===id?cur:block(s,halfWidthM,id).cut;
    const o0=Math.max(0,rowy-1)*S+a,o1=rowy*S+a,o2=(rowy+1)*S+a,o3=Math.min(ROWS,rowy+2)*S+a;
    const ity=1-ty;
    const yb0=ity*ity*ity/6,yb1=(3*ty*ty*ty-6*ty*ty+4)/6,yb2=(-3*ty*ty*ty+3*ty*ty+3*ty+1)/6,yb3=ty*ty*ty/6;
    const cb=yb0*(ba0*v[o0]+ba1*v[o0+1]+ba2*v[o0+2]+ba3*v[o0+3])+yb1*(ba0*v[o1]+ba1*v[o1+1]+ba2*v[o1+2]+ba3*v[o1+3])
      +yb2*(ba0*v[o2]+ba1*v[o2+1]+ba2*v[o2+2]+ba3*v[o2+3])+yb3*(ba0*v[o3]+ba1*v[o3+1]+ba2*v[o3+2]+ba3*v[o3+3]);
    const cutB=Math.max(0,Math.min(1,cb));
    out[2]=cutB===0?0:-envelopeM*cutB;
  }
  return C;
}
// The M3 carving term. Unwired until MTN-6.
export function ridgeValleyCarvingM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  return carvingFM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
}
// The M5 rock driver (mountain-assembly-4): the smoothed carving at the same arguments.
export function ridgeValleyCarvingSmoothM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  return carvingSmoothFM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
}
