import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
const src=new URL('../../../src/',import.meta.url),read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
function url(s,over={}){return 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${over[p]??new URL(p,src).href}${q}`))).toString('base64');}
const mainSource=execFileSync('git',['show','9971c3f:src/terrain.ts'],{encoding:'utf8'});
const mainURL=url(mainSource),main=await import(mainURL),body=waterWorlds()[0],dirs=[];
const ts=main.terrainSampler(body);
for(let i=0;dirs.length<12;i++){const d=fib(i*37%4000,4000);if(ts(d).groundHeightM>0)dirs.push(d);}
const tileSource=read('../../../src/planet-tiles.ts');
if(process.argv[2]==='fractions'){
 globalThis.counts={total:0,active:0,near:0,composition:0,candidates:0,nearCandidates:0,compositions:0};globalThis.hit=[false,false,false];
 let env=read('./fix-before-envelope.txt').replace('return w===0&&U===0?mainTermM:', 'if(w!==0||U!==0){globalThis.hit[2]=true;globalThis.counts.compositions++;}return w===0&&U===0?mainTermM:');
 let s=read('./fix-before-terrain.txt');
 // Instrument only the base core; warm-up is excluded from the counted builds.
 const start=s.indexOf('function baseTerrainCore'),end=s.indexOf('function mountainTerrainCore');
 let core=s.slice(start,end).replace('const ax=Math.abs(d[0])','globalThis.hit[0]=false;globalThis.hit[1]=false;globalThis.hit[2]=false;const ax=Math.abs(d[0])');
 core=core.replace('let best=main;', 'globalThis.hit[0]=true;let best=main;')
 .replace('const x=d[0]*bs[k]', 'globalThis.counts.candidates++;if(Math.abs(sd)-bs[k+8]<1){globalThis.hit[1]=true;globalThis.counts.nearCandidates++;}const x=d[0]*bs[k]')
 .replace('return out;', 'globalThis.counts.total++;if(globalThis.hit[0])globalThis.counts.active++;if(globalThis.hit[1])globalThis.counts.near++;if(globalThis.hit[2])globalThis.counts.composition++;globalThis.hit.fill(false);return out;');
 s=s.slice(0,start)+core+s.slice(end);
 const terrainURL=url(s,{'./mountain-envelope.ts':url(env)}),T=await import(url(tileSource,{'./terrain.ts':terrainURL}));
 for(const d of dirs)T.buildTile(body,T.directionTile(d,5),1,0,{mountains:true});
 const c=globalThis.counts,result={...c,fractions:{active:c.active/c.total,near:c.near/c.total,composition:c.composition/c.total}};
 console.log(JSON.stringify(result));writeFileSync(new URL('./fix-fractions.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
}else{
 const beforeURL=url(read('./fix-before-terrain.txt'),{'./mountain-envelope.ts':url(read('./fix-before-envelope.txt')),'./mountain-layout.ts':url(read('./fix-before-layout.txt'))});
 const mods=await Promise.all([mainURL,beforeURL,new URL('terrain.ts',src).href].map(t=>import(url(tileSource,{'./terrain.ts':t}))));
 for(let k=0;k<3;k++)mods[k].buildTile(body,mods[k].directionTile(dirs[0],6),1,0,{mountains:k!==0});
 const times=[[],[],[]];
 for(let r=0;r<7;r++)for(const d of dirs)for(let j=0;j<3;j++){
  const k=(j+r)%3,T=mods[k],tile=T.directionTile(d,5),start=performance.now();T.buildTile(body,tile,1,0,{mountains:k!==0});
  if(r>1)times[k].push(performance.now()-start);
 }
 const result=times.map((a,i)=>({arm:['main','before','after'][i],count:a.length,meanMs:a.reduce((x,y)=>x+y)/a.length,p50Ms:a.sort((x,y)=>x-y)[Math.floor(a.length/2)]}));
 console.log(JSON.stringify(result));writeFileSync(new URL('./fix-timing.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
}
