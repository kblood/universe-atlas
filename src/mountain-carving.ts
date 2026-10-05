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
//   - The memo stores only the CORE+1 core columns of a block (Float32); the last column is the
//     first column of the next block and is bit-identical there. The memo is an LRU of
//     CACHE blocks keyed on exact (seed, halfWidth, block id). It is observationally pure:
//     a value never depends on what was solved before (cold/warm/evicted/child tests).
//
// The carving is retained*envelope - envelope with retained in [0,1], so
// envelope + carving = envelope*retained >= 0 (coast safety) and it is exactly +0 where
// belt === 0, envelope <= 0 or |across| >= halfWidth.
// Arithmetic: only Math.floor/sqrt/imul/min/max/abs (audited); A^(3/8) is
// sqrt(sqrt(sqrt(A*A*A))).
type N=number;
export const MOUNTAIN_CARVING_VERSION='mountain-carving-2';
export const MOUNTAIN_CARVING=Object.freeze({
  METHOD:'F',
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
const ROWS=F.ROWS,CORE=F.CORE,HALO=F.HALO,NC=CORE+2*HALO+1,NR=ROWS+1,NN=NC*NR,S=CORE+1;

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

// A memo block: retained fractions on the CORE+1 core columns, rows 0..ROWS (Float32).
type Block={seed:N,w:N,id:N,r:Float32Array,capped:N,positive:N};
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
  //    on the columns that reach the core (the column windows never meet a domain edge).
  const R1=F.NORM_DILATE,RA=F.NORM_BLUR_A,RB=F.NORM_BLUR_B,t1=filled,t2=rd,t3=best;
  const lo=HALO-R1-RA-RB,hi=HALO+CORE+R1+RA+RB;
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
  rowMean(t3,t1,RB,HALO,HALO+CORE);columnMean(t1,t2,RB,HALO,HALO+CORE);
  for(let j=0;j<NR;j++)for(let i=HALO;i<=HALO+CORE;i++){const k=j*NC+i;t2[k]=Math.max(ramp[j],t2[k]);}
  return {h,cap:t2,ramp};
}
// 7. Memo block: retained = h / max(e_ref, M) on the core columns, clipped to [0,1].
function build(seed:N,w:N,id:N):Block {
  const {h,cap}=solve(seed,w,id),r=new Float32Array(NR*S);let capped=0,positive=0;
  for(let j=0;j<NR;j++)for(let i=0;i<=CORE;i++){
    const k=j*NC+i+HALO,c=cap[k],v=h[k];
    if(c>0){positive++;if(v>=c)capped++;}
    r[j*S+i]=c>0?Math.min(v/c,1):1;
  }
  return {seed,w,id,r,capped,positive};
}
// LRU memo: most recently used at the end.
function block(seed:N,w:N,id:N):Block {
  for(let i=cache.length-1;i>=0;i--){
    const b=cache[i];
    if(b.seed===seed&&b.w===w&&b.id===id){if(i!==cache.length-1){cache.splice(i,1);cache.push(b);}return b;}
  }
  const b=build(seed,w,id);
  if(cache.length>=F.CACHE)cache.shift();
  cache.push(b);return b;
}
// Retained fraction of the envelope at (along, across), triangle-interpolated.
function retainedAt(alongM:N,acrossM:N,halfWidthM:N,seed:N):N {
  const d=2*halfWidthM/ROWS,gx=alongM/d,gy=(acrossM+halfWidthM)/d,col=Math.floor(gx),row=Math.min(ROWS-1,Math.floor(gy));
  const u=gx-col,t=gy-row,id=Math.floor(col/CORE),r=block(seed,halfWidthM,id).r,a=row*S+col-id*CORE;
  const v=diagonal(col,row,seed)
    ?(u>=t?(1-u)*r[a]+(u-t)*r[a+1]+t*r[a+S+1]:(1-t)*r[a]+(t-u)*r[a+S]+u*r[a+S+1])
    :(u+t<=1?(1-u-t)*r[a]+u*r[a+1]+t*r[a+S]:(u+t-1)*r[a+S+1]+(1-t)*r[a+1]+(1-u)*r[a+S]);
  return Math.max(0,Math.min(1,v));
}
// Candidate F carving (metres, <= 0). Arguments follow section 2.3.
export function carvingFM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  // Negated comparisons also exclude NaN envelope / across / half-width and a non-finite along.
  if(belt===0||!(envelopeM>0)||!(Math.abs(acrossM)<halfWidthM)||alongM-alongM!==0)return 0;
  const retained=retainedAt(alongM,acrossM,halfWidthM,seed>>>0);
  return retained===1?0:-envelopeM*(1-retained);
}
// The M3 carving term. Unwired until MTN-6.
export function ridgeValleyCarvingM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  return carvingFM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
}
