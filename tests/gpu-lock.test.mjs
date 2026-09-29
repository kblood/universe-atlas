import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,utimes,readFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const root=await mkdtemp(join(tmpdir(),'atlas-gpu-lock-'));
process.env.ATLAS_GPU_LOCK_DIR=join(root,'lock');
const {acquireGpuLock,GPU_LOCK_DIR}=await import('./helpers/gpu-lock.mjs');
const quiet=()=>{};
test.after(()=>rm(root,{recursive:true,force:true}));

test('lock is exclusive, records the owner and releases', async()=>{
  const a=await acquireGpuLock({owner:'agent A',log:quiet,listBrowsers:async()=>[]});
  assert.match(await readFile(join(GPU_LOCK_DIR,'owner.txt'),'utf8'),/^agent A pid=/);
  await assert.rejects(acquireGpuLock({owner:'agent B',retryMs:10,timeoutMs:50,log:quiet,listBrowsers:async()=>[]}),/still held/);
  await a.release();
  assert.equal(existsSync(GPU_LOCK_DIR),false);
});

test('a fresh foreign lock is never broken; a stale one only when no browser runs', async()=>{
  await mkdir(GPU_LOCK_DIR);await writeFile(join(GPU_LOCK_DIR,'owner.txt'),'other agent\n');
  await assert.rejects(acquireGpuLock({owner:'me',retryMs:10,timeoutMs:50,log:quiet,listBrowsers:async()=>[]}),/still held/,'fresh lock kept');
  const old=new Date(Date.now()-30*60*1000);await utimes(join(GPU_LOCK_DIR,'owner.txt'),old,old);
  await assert.rejects(acquireGpuLock({owner:'me',retryMs:10,timeoutMs:50,log:quiet,listBrowsers:async()=>['123 chrome']}),/still held/,'stale but browser running');
  const logs=[];
  const lock=await acquireGpuLock({owner:'me',retryMs:10,timeoutMs:1000,log:m=>logs.push(m),listBrowsers:async()=>[]});
  assert.ok(logs.some(m=>/TOOK OVER stale lock/.test(m)&&/other agent/.test(m)));
  assert.match(await readFile(join(GPU_LOCK_DIR,'owner.txt'),'utf8'),/^me pid=/);
  await lock.release();
  assert.equal(existsSync(GPU_LOCK_DIR),false);
});

test('release never removes a lock that is no longer ours', async()=>{
  const lock=await acquireGpuLock({owner:'me',log:quiet,listBrowsers:async()=>[]});
  await writeFile(join(GPU_LOCK_DIR,'owner.txt'),'someone else\n');
  await lock.release();
  assert.equal(existsSync(GPU_LOCK_DIR),true);
  await rm(GPU_LOCK_DIR,{recursive:true,force:true});
});
