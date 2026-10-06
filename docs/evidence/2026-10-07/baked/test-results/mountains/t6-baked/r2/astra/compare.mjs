import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='test-results/mountains/t6-baked/r2',target='src/terrain.ts';
const saved=readFileSync(target);
const variants={before:readFileSync(`${root}/before-terrain.txt`),dispatch:readFileSync(`${root}/astra/dispatch-terrain.txt`),early:readFileSync(`${root}/astra/early-terrain.txt`)};
try {
 for(let i=1;i<=5;i++)for(const world of ['Maithea','Raiva']){
  const names=i%2?['before','dispatch','early']:['early','dispatch','before'];
  for(const name of names){
   const dir=`${root}/astra/${name}`;mkdirSync(dir,{recursive:true});
   writeFileSync(target,variants[name]);
   const r=spawnSync(process.execPath,[`${root}/c1-staged.mjs`,world,`${dir}/${world}-${i}.json`,'C:/LLM/IWSDK/universe-atlas-wt/ref-main','--same-version'],{encoding:'utf8'});
   writeFileSync(`${dir}/${world}-${i}.log`,r.stdout+r.stderr);
   console.log(name,i,r.status,r.stdout.trim());
   if(r.status!==0)throw new Error(r.stderr);
  }
 }
}finally{writeFileSync(target,saved);}
