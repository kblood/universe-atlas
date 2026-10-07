// Holds the machine-wide GPU browser lock ONCE (C:/LLM/IWSDK/.gpu-browser-lock, heartbeat via main's gpu-lock.mjs)
// for a sequence of commands, run one at a time. The children get ATLAS_GPU_LOCK_DIR pointing at a private inner dir,
// so their own withGpuLock/acquireGpuLock calls do not wait on the outer hold (one GPU lock level for the batch).
//   node hold-gpu.mjs <repoRoot> <innerLockDir> <log> -- <cmdfile.json>
// cmdfile: [{"cwd":..., "cmd":..., "args":[...], "log":...}, ...]; stops at the first non-zero exit unless "continue":true.
import {spawn} from 'node:child_process';
import {readFileSync,appendFileSync,openSync,closeSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [repo,inner,logf,,cmdfile]=process.argv.slice(2);
const {acquireGpuLock}=await import(pathToFileURL(`${repo}/tests/helpers/gpu-lock.mjs`).href);
const L=s=>{const line=`${new Date().toISOString()} ${s}`;console.error(line);appendFileSync(logf,line+'\n');};
const cmds=JSON.parse(readFileSync(cmdfile,'utf8'));
const lock=await acquireGpuLock({owner:'opus55 GATE-C1 step 2 (golden + probe pair, one hold)',retryMs:5000,log:L});
L(`GPU lock held: ${lock.owner}`);
let rc=0;
try{
  for(const c of cmds){
    L(`RUN ${c.cwd}: ${c.cmd} ${c.args.join(' ')}`);
    const fd=openSync(c.log,'a');
    const code=await new Promise(res=>{const ch=spawn(c.cmd,c.args,{cwd:c.cwd,stdio:['ignore',fd,fd],env:{...process.env,ATLAS_GPU_LOCK_DIR:inner}});ch.on('exit',(code,sig)=>res(code??(sig?128:1)));});
    closeSync(fd);
    L(`EXIT ${code} ${c.name??''}`);
    if(code!==0){rc=code;if(!c.continue)break;}
  }
}finally{await lock.release();L('GPU lock released');}
process.exit(rc);
