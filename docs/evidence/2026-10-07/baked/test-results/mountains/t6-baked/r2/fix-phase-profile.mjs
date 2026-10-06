import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {waterWorlds} from '../../../../tests/terrain-climate-fixtures.mjs';
const path=process.argv[2]==='before'?'./before-layout.txt':process.argv[2]==='eager'?'./fix-eager-layout.txt':'../../../../src/mountain-layout.ts';
let s=readFileSync(new URL(path,import.meta.url),'utf8');
s=s.replace('  const N=g.faceCells/2,B=N/8,','  const times=[performance.now()];\n  const N=g.faceCells/2,B=N/8,')
.replace('  const masks: number[]=[]','  times.push(performance.now());\n  const masks: number[]=[]')
.replace('  const values=new Float32Array(candidates.length*81);','  times.push(performance.now());\n  const values=new Float32Array(candidates.length*81);\n  times.push(performance.now());')
.replace('  const field={faceCells:N,','  times.push(performance.now());\n  const field={faceCells:N,')
.replace('  return Object.freeze({...field,bytes});','  times.push(performance.now());globalThis.fieldPhases=times.slice(1).map((t,i)=>t-times[i]);\n  return Object.freeze({...field,bytes});')
.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../../src/'+p.slice(2),import.meta.url).href}${q}`);
if(s.includes('const materialiseAll='))s=s.replace('  times.push(performance.now());\n  const field={faceCells:N,','  times.push(performance.now());materialiseAll();times.push(performance.now());\n  const field={faceCells:N,');
s+='\nexport {buildCoarseBandField};';
const {orogenLayout,buildCoarseBandField}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64'));
const body=waterWorlds()[+process.argv[3]],l=orogenLayout(body),g=l.bandGrid(48000,32000);
for(let n=0;n<2;n++){const t=performance.now();const f=buildCoarseBandField(l.belts,body.radiusM,g,48000,32000);console.log(JSON.stringify({world:body.name,build:n?'second':'cold',totalMs:performance.now()-t,phases:globalThis.fieldPhases}));}
