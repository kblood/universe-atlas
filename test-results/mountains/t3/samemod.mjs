import {pathToFileURL} from 'node:url';
const root='C:/LLM/IWSDK/universe-atlas-wt/t3-coarse';
const T=await import(pathToFileURL(root+'/src/planet-tiles.ts').href);
const B=await import(pathToFileURL(root+'/src/terrain.ts').href);
const {benchBuild}=await import(pathToFileURL(root+'/scripts/lod-consistency-report.mjs').href);
const {waterWorlds,fib}=await import(pathToFileURL(root+'/tests/terrain-climate-fixtures.mjs').href);
const body=waterWorlds().find(b=>b.name===process.argv[2]),ts=B.terrainSampler(body),dirs=[];
for(let i=0;dirs.length<12&&i<4000;i++){const d=fib(i*37%4000,4000);if(ts(d).groundHeightM>0)dirs.push(d);}
const off={buildTile:(b,t)=>T.buildTile(b,t),directionTile:T.directionTile},on={buildTile:(b,t)=>T.buildTile(b,t,1,0,{mountains:true}),directionTile:T.directionTile};
const r=benchBuild([off,on],body,dirs,[0,1,2,3,4,5],3);
for(const L of Object.keys(r))console.log(process.argv[2],'L'+L,'off',r[L][0].meanMs.toFixed(2),'on',r[L][1].meanMs.toFixed(2),'growth',(r[L][1].meanMs/r[L][0].meanMs-1).toFixed(3));
