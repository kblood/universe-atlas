// A/A control: main's buildTile vs this branch's buildTile with the mountains OFF (default), separate module
// instances as in the T3 contract bench, same protocol (benchBuild, 12 land tiles, 5 rounds). Expected ~0%.
import {pathToFileURL} from 'node:url';
const root='C:/LLM/IWSDK/universe-atlas-wt/t3-coarse';
const T=await import(pathToFileURL(root+'/src/planet-tiles.ts').href);
const MT=await import(pathToFileURL('C:/LLM/IWSDK/universe-atlas/src/planet-tiles.ts').href);
const MS=await import(pathToFileURL('C:/LLM/IWSDK/universe-atlas/src/terrain.ts').href);
const {benchBuild}=await import(pathToFileURL(root+'/scripts/lod-consistency-report.mjs').href);
const {waterWorlds,fib}=await import(pathToFileURL(root+'/tests/terrain-climate-fixtures.mjs').href);
const body=waterWorlds().find(b=>b.name===process.argv[2]),ts=MS.terrainSampler(body),dirs=[];
for(let i=0;dirs.length<12&&i<4000;i++){const d=fib(i*37%4000,4000);if(ts(d).groundHeightM>0)dirs.push(d);}
const r=benchBuild([{buildTile:MT.buildTile,directionTile:MT.directionTile},{buildTile:(b,t)=>T.buildTile(b,t),directionTile:T.directionTile}],body,dirs,[0,1,2,3,4,5],5);
for(const L of Object.keys(r))console.log('AA',process.argv[2],'L'+L,'main',r[L][0].meanMs.toFixed(2),'branch-off',r[L][1].meanMs.toFixed(2),'growth',(r[L][1].meanMs/r[L][0].meanMs-1).toFixed(3));
