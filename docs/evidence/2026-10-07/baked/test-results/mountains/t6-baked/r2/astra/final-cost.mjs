import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='test-results/mountains/t6-baked/r2',dir=`${root}/astra/final`;
mkdirSync(dir,{recursive:true});
for(let i=1;i<=5;i++)for(const world of ['Maithea','Raiva','Selawyn','Lethuris']){
 const r=spawnSync(process.execPath,[`${root}/c1-staged.mjs`,world,`${dir}/${world}-${i}.json`,'C:/LLM/IWSDK/universe-atlas-wt/ref-main','--same-version'],{encoding:'utf8'});
 writeFileSync(`${dir}/${world}-${i}.log`,r.stdout+r.stderr);
 console.log(i,r.status,r.stdout.trim());
 if(r.status!==0)throw new Error(r.stderr);
}
