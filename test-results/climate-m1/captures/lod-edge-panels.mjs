// R5-ATLAS-CLIMATE-M1 step 10 (climate-m1-decision-2): LOD-transition panels at a snowline / treeline edge.
// The renderer has no level override, so the L -> L+1 switch is shown the way tests/lod-consistency.test.mjs measures
// it: on the child tile C = directionTile(d, L+1), the parent colour (L tile colour grid, bilinear, exactly as
// scripts/lod-consistency-report.mjs crossPair) next to the child colour, and |parent - child| (RGB distance x4).
// Two modes, run on two checkouts so the climate is the only difference:
//   node <this> dump <out.json> [<dirs.json>]   in a checkout: for Maithea L6 and Lethuris L8, every FROZEN_STRATIFIED
//       snowline/treeline direction; per direction the tile rgb p99, and the grids of the worst one (or of the
//       direction given in dirs.json, the branch's pick, so both arms show the same place).
//   node <this> draw <main.json> <branch.json> <outdir>   writes one PNG per case: row 1 main, row 2 branch;
//       columns parent L | child L+1 | |diff| x4.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [mode,...rest]=process.argv.slice(2);
const CASES=[['Maithea',6],['Lethuris',8]],RES=128;
if(mode==='dump'){
  const root=pathToFileURL(resolve('.')+'/').href;
  const m=await import(root+'src/planet-tiles.ts'),{terrainSampler}=await import(root+'src/terrain.ts');
  const {CLIMATE_VERSION}=await import(root+'src/surface-climate.ts');
  const {waterWorlds}=await import(root+'tests/terrain-climate-fixtures.mjs');
  const {FROZEN_STRATIFIED}=await import(root+'tests/helpers/lod-frozen-selection.mjs');
  const fixed=rest[1]?JSON.parse(readFileSync(rest[1],'utf8')):null;
  const bodies=Object.fromEntries(waterWorlds().map(b=>[b.name,b])),out={climateVersion:CLIMATE_VERSION,cases:{}};
  for(const [name,L] of CASES){
    const body=bodies[name],ts=terrainSampler(body);
    const grid=(t,res)=>{const g=[];for(let y=0;y<=res;y++)for(let x=0;x<=res;x++)g.push(ts(m.tileDirection(t,x/res,y/res)).color);return g;};
    const one=d=>{const P=m.directionTile(d,L),C=m.directionTile(d,L+1),ox=C.x-P.x*2,oy=C.y-P.y*2,pg=grid(P,RES),cg=grid(C,RES);
      const par=[],diffs=[];
      for(let y=0;y<=RES;y++)for(let x=0;x<=RES;x++){const u=(ox+x/RES)/2,v=(oy+y/RES)/2,fx=u*RES,fy=v*RES,x0=Math.min(RES-1,Math.floor(fx)),y0=Math.min(RES-1,Math.floor(fy)),tx=fx-x0,ty=fy-y0;
        const at=(i,j)=>pg[j*(RES+1)+i],rgb=[0,1,2].map(k=>(at(x0,y0)[k]*(1-tx)+at(x0+1,y0)[k]*tx)*(1-ty)+(at(x0,y0+1)[k]*(1-tx)+at(x0+1,y0+1)[k]*tx)*ty);
        par.push(rgb);const c=cg[y*(RES+1)+x];diffs.push(Math.hypot(rgb[0]-c[0],rgb[1]-c[1],rgb[2]-c[2]));}
      const s=[...diffs].sort((a,b)=>a-b);return {p99:s[Math.floor(.99*(s.length-1))],max:s.at(-1),parent:par,child:cg,diff:diffs};};
    const cands=fixed?[{kind:fixed[name].kind,d:fixed[name].d}]:['snowline','treeline'].flatMap(kind=>(FROZEN_STRATIFIED[name][kind]||[]).map(d=>({kind,d})));
    const scored=cands.map(c=>({...c,r:one(c.d)}));
    const best=scored.reduce((a,b)=>b.r.p99>a.r.p99?b:a);
    out.cases[`${name}-L${L}`]={L,kind:best.kind,d:best.d,p99:best.r.p99,max:best.r.max,all:scored.map(s=>({kind:s.kind,p99:+s.r.p99.toFixed(2)})),
      parent:best.r.parent,child:best.r.child,diff:best.r.diff};
  }
  writeFileSync(rest[0],JSON.stringify(out));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(out.cases).map(([k,v])=>[k,{kind:v.kind,d:v.d,p99:v.p99,max:v.max,all:v.all}])),null,1));
}else if(mode==='draw'){
  const [a,b,dir]=rest.map(p=>p),A=JSON.parse(readFileSync(a,'utf8')),B=JSON.parse(readFileSync(b,'utf8'));mkdirSync(dir,{recursive:true});
  const crcT=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=buf=>{let c=0xffffffff;for(const x of buf)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const png=(w,h,rgb)=>{const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
    return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);};
  const N=RES+1,S=3,GAP=6,W=3*N*S+2*GAP,H=2*N*S+GAP,scale=[A,B].flatMap(J=>Object.values(J.cases).flatMap(c=>c.child.flat())).reduce((m,v)=>v>m?v:m,0)>1.5?1:255;
  const report={};
  for(const key of Object.keys(B.cases)){
    const img=Buffer.alloc(W*H*3,40);
    [A,B].forEach((J,row)=>{const c=J.cases[key];[c.parent,c.child,c.diff.map(v=>[4*v,4*v,4*v])].forEach((g,col)=>{
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=g[y*N+x];for(let sy=0;sy<S;sy++)for(let sx=0;sx<S;sx++){const px=col*(N*S+GAP)+x*S+sx,py=row*(N*S+GAP)+(N-1-y)*S+sy,o=(py*W+px)*3;
        for(let k=0;k<3;k++)img[o+k]=Math.max(0,Math.min(255,Math.round((col===2?v[k]*(scale===255?255:1):v[k]*scale))));}}});});
    const f=`${dir}/${key}-L${B.cases[key].L}to${B.cases[key].L+1}-${B.cases[key].kind}.png`;writeFileSync(f,png(W,H,img));
    report[key]={file:f,kind:B.cases[key].kind,d:B.cases[key].d,main:{climate:A.climateVersion,p99:+A.cases[key].p99.toFixed(2),max:+A.cases[key].max.toFixed(2)},branch:{climate:B.climateVersion,p99:+B.cases[key].p99.toFixed(2),max:+B.cases[key].max.toFixed(2)}};
  }
  writeFileSync(`${dir}/lod-edge-panels.json`,JSON.stringify({layout:'row 1 main climate, row 2 branch climate; columns: parent L colour on the child tile (bilinear) | child L+1 colour | |parent-child| RGB x4',scale,report},null,1));
  console.log(JSON.stringify(report,null,1));
}else throw new Error('mode dump|draw');
