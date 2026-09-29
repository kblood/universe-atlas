/** Machine-wide GPU browser lock shared by every agent on this PC
 * (C:/LLM/IWSDK/.gpu-browser-lock). `mkdir` is atomic: it fails while another
 * process holds the lock. Acquire immediately before launching a browser or GPU
 * process and release as soon as that run ends, including on failure. Never
 * break someone else's lock automatically. */
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {readFileSync,rmSync} from 'node:fs';
import {hostname} from 'node:os';

export const GPU_LOCK_DIR=process.env.ATLAS_GPU_LOCK_DIR||'C:/LLM/IWSDK/.gpu-browser-lock';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function lockOwner(){
  try{return (await readFile(`${GPU_LOCK_DIR}/owner.txt`,'utf8')).trim();}catch{return '(no owner.txt)';}
}

/** Resolves to `{release, owner, waitedMs, attempts}` once held. Retries every
 * `retryMs` (default 60 s) until `timeoutMs` (default: wait indefinitely). */
export async function acquireGpuLock({owner,retryMs=60000,timeoutMs=Infinity,log=console.error}={}){
  if(!owner)throw new Error('acquireGpuLock needs an owner name');
  const started=Date.now();let attempts=0;
  for(;;){
    attempts++;
    try{await mkdir(GPU_LOCK_DIR);}
    catch(error){
      if(error?.code!=='EEXIST')throw error;
      const waited=Date.now()-started;
      if(waited>=timeoutMs)throw new Error(`GPU lock ${GPU_LOCK_DIR} still held after ${Math.round(waited/1000)} s by: ${await lockOwner()}`);
      log(`[gpu-lock] held by: ${await lockOwner()} - retry ${attempts} in ${Math.round(retryMs/1000)} s`);
      await sleep(Math.min(retryMs,Math.max(1000,timeoutMs-waited)));
      continue;
    }
    const text=`${owner} pid=${process.pid} host=${hostname()} acquired=${new Date().toISOString()}`;
    await writeFile(`${GPU_LOCK_DIR}/owner.txt`,text+'\n');
    let released=false;
    const ours=()=>{try{return readFileSync(`${GPU_LOCK_DIR}/owner.txt`,'utf8').trim()===text;}catch{return false;}};
    // Best-effort cleanup if the process exits or is interrupted while holding it.
    const onExit=()=>{if(!released&&ours()){released=true;rmSync(GPU_LOCK_DIR,{recursive:true,force:true});}};
    const onSignal=()=>{onExit();process.exit(130);};
    process.on('exit',onExit);process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
    const release=async()=>{
      if(released)return;released=true;
      process.off('exit',onExit);process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);
      if(ours())await rm(GPU_LOCK_DIR,{recursive:true,force:true});
      else log(`[gpu-lock] not releasing: owner is now ${await lockOwner()}`);
    };
    return {release,owner:text,waitedMs:Date.now()-started,attempts};
  }
}

/** Holds the lock only for `work()`, releasing it on success or failure. */
export async function withGpuLock(options,work){
  const lock=await acquireGpuLock(options);
  try{return await work(lock);}finally{await lock.release();}
}
