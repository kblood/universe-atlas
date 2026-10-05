import {pathToFileURL} from 'node:url';
const root='C:/LLM/IWSDK/universe-atlas-wt/t3-coarse';
const T=await import(pathToFileURL(root+'/src/planet-tiles.ts').href);
const B=await import(pathToFileURL(root+'/src/terrain.ts').href);
const MS=await import(pathToFileURL('C:/LLM/IWSDK/universe-atlas/src/terrain.ts').href);
const {orogenLayout}=await import(pathToFileURL(root+'/src/mountain-layout.ts').href);
const {waterWorlds,fib}=await import(pathToFileURL(root+'/tests/terrain-climate-fixtures.mjs').href);
const body=waterWorlds().find(b=>b.name===(process.argv[2]||'Maithea')),ts=MS.terrainSampler(body),dirs=[];
for(let i=0;dirs.length<12&&i<4000;i++){const d=fib(i*37%4000,4000);if(ts(d).groundHeightM>0)dirs.push(d);}
const br=B.terrainSampler(body,undefined,undefined,undefined,0,undefined,false,{mountains:true,lodLevel:3});
const lay=orogenLayout(body);
for(const L of [3]){const pts=[];for(const d of dirs){const t=T.directionTile(d,L);for(let y=0;y<=128;y++)for(let x=0;x<=128;x++)pts.push(T.tileDirection(t,x/128,y/128));}
 let belt=0,land=0;for(const p of pts){const o=lay.sample(p);if(o.belt!==0)belt++;if(ts(p).groundHeightM>0)land++;}
 const outs=pts.filter(p=>lay.sample(p).belt===0),ins=pts.filter(p=>lay.sample(p).belt!==0);let s=0;const pass=f=>{const t0=performance.now();for(const p of pts)s+=f(p).groundHeightM;return (performance.now()-t0)*1e6/pts.length;};
 const P=pts;const run=(set)=>{const m=[],b=[];const q=f=>{const t0=performance.now();for(const p of set)s+=f(p).groundHeightM;return (performance.now()-t0)*1e6/set.length;};for(let k=0;k<6;k++){m.push(q(ts));b.push(q(br));}return [m,b];};const [mo,bo]=run(outs),[mi,bi]=run(ins);const m=mo,b=bo;console.log("in-belt main",[...mi].sort((x,y)=>x-y)[3].toFixed(0),"branch",[...bi].sort((x,y)=>x-y)[3].toFixed(0));
 const med=a=>[...a].sort((x,y)=>x-y)[3];
 console.log(body.name,'L'+L,'samples',pts.length,'belt!=0 share',(belt/pts.length).toFixed(3),'land',(land/pts.length).toFixed(3),'main ns',med(m).toFixed(0),'branch ns',med(b).toFixed(0),'growth',(med(b)/med(m)-1).toFixed(3));}
