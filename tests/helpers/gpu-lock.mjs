/** Machine-wide GPU browser lock shared by every agent on this PC
 * (C:/LLM/IWSDK/.gpu-browser-lock). `mkdir` is atomic: it fails while another
 * process holds the lock. Acquire immediately before launching a browser or GPU
 * process and release as soon as that run ends, including on failure. Never
 * break a live lock: only a lock whose owner.txt is older than GPU_LOCK_STALE_MS
 * (20 min) while no chrome/headless browser runs is taken over, and logged.
 * Lock order (docs/test-policy.md "Lock order"): merge -> slot -> GPU, never GPU -> slot. While this process waits for
 * or holds the GPU lock it publishes that in-process (globalThis symbol) and, while held, in ATLAS_GPU_LOCK_HELD for its
 * children; tests/helpers/test-slot.mjs refuses to take the slot in either state. A capture path passes `capture: true`
 * and is refused while it holds the test slot (I8: captures do their GPU work outside the CPU slot). */
import {mkdir,writeFile,readFile,rm,rename,stat} from 'node:fs/promises';
import {readFileSync,rmSync} from 'node:fs';
import {hostname,platform} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);

export const GPU_LOCK_DIR=process.env.ATLAS_GPU_LOCK_DIR||'C:/LLM/IWSDK/.gpu-browser-lock';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const STATE=globalThis[Symbol.for('atlas.gpu-lock.state')]??={waiting:0,held:0,owners:[]};
const INHERITED_HELD=process.env.ATLAS_GPU_LOCK_HELD;
function publish(){
  const v=STATE.owners.at(-1)??INHERITED_HELD;
  if(v===undefined)delete process.env.ATLAS_GPU_LOCK_HELD;else process.env.ATLAS_GPU_LOCK_HELD=v;
}
/** Refuses a capture path that holds the test slot (in this process or inherited through ATLAS_TEST_SLOT_TOKEN). */
export function assertCaptureOutsideSlot(owner){
  const held=globalThis[Symbol.for('atlas.test-slot.held')]?.length>0;
  if(held||process.env.ATLAS_TEST_SLOT_TOKEN)throw new Error(`lock order: capture path "${owner}" asks for the GPU lock while holding the test slot (${held?'this process':'ATLAS_TEST_SLOT_TOKEN inherited'}); captures take the GPU lock outside the CPU slot (docs/test-policy.md "Lock order")`);
}

async function lockOwner(){
  try{return (await readFile(`${GPU_LOCK_DIR}/owner.txt`,'utf8')).trim();}catch{return '(no owner.txt)';}
}

/** Default stale age: an owner.txt older than this, with no browser process
 * running, is treated as a leaked lock (coordinator rule 2026-09-29). */
export const GPU_LOCK_STALE_MS=Number(process.env.ATLAS_GPU_LOCK_STALE_MS||20*60*1000);

/** Chrome / headless-shell processes currently running (Windows: Get-Process). */
export async function runningBrowsers(){
  if(platform()!=='win32'){
    try{const {stdout}=await run('pgrep',['-l','-f','chrome|headless_shell'],{timeout:10000});return stdout.trim().split(/\n/).filter(Boolean);}catch{return [];}
  }
  const {stdout}=await run('powershell',['-NoProfile','-Command',
    "Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^(chrome|chrome-headless-shell|headless_shell|chromium)$' } | ForEach-Object { '{0} {1}' -f $_.Id,$_.ProcessName }"],{timeout:20000});
  return stdout.trim().split(/\r?\n/).filter(Boolean);
}

/** Takes over a lock whose owner.txt is older than `staleMs` while no browser
 * runs. The stale directory is renamed away atomically (only if owner.txt still
 * has the content judged stale), then the normal mkdir race decides the owner. */
async function tryBreakStale(staleMs,log,listBrowsers){
  let info,text;
  try{info=await stat(`${GPU_LOCK_DIR}/owner.txt`);text=await readFile(`${GPU_LOCK_DIR}/owner.txt`,'utf8');}
  catch{try{info=await stat(GPU_LOCK_DIR);text=null;}catch{return false;}}
  const age=Date.now()-info.mtimeMs;
  if(age<staleMs)return false;
  let browsers;try{browsers=await listBrowsers();}catch(error){log(`[gpu-lock] stale check skipped: ${error.message}`);return false;}
  if(browsers.length){log(`[gpu-lock] owner.txt is ${Math.round(age/60000)} min old but browsers are running (${browsers.join(', ')}); not breaking`);return false;}
  try{if(text!==null&&(await readFile(`${GPU_LOCK_DIR}/owner.txt`,'utf8'))!==text)return false;}catch{return false;}
  const graveyard=`${GPU_LOCK_DIR}.stale-${Date.now()}-${process.pid}`;
  try{await rename(GPU_LOCK_DIR,graveyard);}catch{return false;}
  log(`[gpu-lock] TOOK OVER stale lock (owner.txt ${Math.round(age/60000)} min old, no chrome/headless process): ${(text??'(no owner.txt)').trim()}`);
  await rm(graveyard,{recursive:true,force:true}).catch(()=>{});
  return true;
}

/** Resolves to `{release, owner, waitedMs, attempts}` once held. Retries every
 * `retryMs` (default 60 s) until `timeoutMs` (default: wait indefinitely). */
export async function acquireGpuLock({owner,retryMs=60000,timeoutMs=Infinity,staleMs=GPU_LOCK_STALE_MS,listBrowsers=runningBrowsers,heartbeatMs=60000,log=console.error,capture=false}={}){
  if(!owner)throw new Error('acquireGpuLock needs an owner name');
  if(capture)assertCaptureOutsideSlot(owner);
  STATE.waiting++;
  try{return await acquire({owner,retryMs,timeoutMs,staleMs,listBrowsers,heartbeatMs,log});}finally{STATE.waiting--;}
}
async function acquire({owner,retryMs,timeoutMs,staleMs,listBrowsers,heartbeatMs,log}){
  const started=Date.now();let attempts=0;
  for(;;){
    attempts++;
    try{await mkdir(GPU_LOCK_DIR);}
    catch(error){
      if(error?.code!=='EEXIST')throw error;
      if(Number.isFinite(staleMs)&&await tryBreakStale(staleMs,log,listBrowsers))continue;
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
    STATE.held++;STATE.owners.push(text);publish();
    const unpublish=()=>{STATE.held--;const i=STATE.owners.lastIndexOf(text);if(i>=0)STATE.owners.splice(i,1);publish();};
    const onExit=()=>{if(!released&&ours()){released=true;unpublish();rmSync(GPU_LOCK_DIR,{recursive:true,force:true});}};
    const onSignal=()=>{onExit();process.exit(130);};
    process.on('exit',onExit);process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
    // Heartbeat: keep owner.txt fresh while held so a long run is never judged stale.
    const heartbeat=setInterval(()=>{if(!released&&ours())writeFile(`${GPU_LOCK_DIR}/owner.txt`,text+'\n').catch(()=>{});},heartbeatMs);heartbeat.unref?.();
    const release=async()=>{
      if(released)return;released=true;clearInterval(heartbeat);unpublish();
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
