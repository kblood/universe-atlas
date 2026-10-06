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

// Lock order merge -> slot -> GPU (docs/test-policy.md "Lock order"; plan part 2): never GPU -> slot. Sandbox slot dir only.
const {acquireTestSlot}=await import('./helpers/test-slot.mjs');
const slotDir=join(root,'slot');
test('lock order: holding or waiting for the GPU lock refuses the test slot; release clears the published state', async()=>{
  const saved=process.env.ATLAS_GPU_LOCK_HELD;delete process.env.ATLAS_GPU_LOCK_HELD;
  try{
    const gpu=await acquireGpuLock({owner:'luna capture',log:quiet,listBrowsers:async()=>[]});
    assert.match(process.env.ATLAS_GPU_LOCK_HELD,/^luna capture pid=/,'children of a GPU holder inherit the state');
    await assert.rejects(acquireTestSlot({dir:slotDir,owner:'npm test'}),/lock order violation: "npm test" .*GPU lock is held/);
    assert.equal(existsSync(slotDir),false,'the slot was never touched');
    await gpu.release();
    assert.equal(process.env.ATLAS_GPU_LOCK_HELD,undefined,'release clears it');
    // A foreign process holds the GPU lock: this process only WAITS (nothing held, nothing in the env) and is still refused.
    await mkdir(GPU_LOCK_DIR);await writeFile(join(GPU_LOCK_DIR,'owner.txt'),'other agent\n');
    const blocked=acquireGpuLock({owner:'waiter',retryMs:10,timeoutMs:5000,log:quiet,listBrowsers:async()=>[]});
    assert.equal(process.env.ATLAS_GPU_LOCK_HELD,undefined);
    await assert.rejects(acquireTestSlot({dir:slotDir,owner:'while waiting'}),/"while waiting" .*this process is waiting for the GPU lock/);
    await rm(GPU_LOCK_DIR,{recursive:true,force:true});
    await (await blocked).release();
    const slot=await acquireTestSlot({dir:slotDir,owner:'after'});slot.release();
  }finally{if(saved===undefined)delete process.env.ATLAS_GPU_LOCK_HELD;else process.env.ATLAS_GPU_LOCK_HELD=saved;}
});
test('lock order: a capture path (capture: true) is refused while it holds the test slot; slot -> GPU stays allowed otherwise', async()=>{
  const savedToken=process.env.ATLAS_TEST_SLOT_TOKEN;delete process.env.ATLAS_TEST_SLOT_TOKEN;
  try{
    const slot=await acquireTestSlot({dir:slotDir,owner:'gate'});
    await assert.rejects(acquireGpuLock({owner:'capture',capture:true,log:quiet,listBrowsers:async()=>[]}),/capture path "capture" .*holding the test slot \(this process\)/);
    const golden=await acquireGpuLock({owner:'golden (slot -> GPU)',log:quiet,listBrowsers:async()=>[]});await golden.release();
    slot.release();
    process.env.ATLAS_TEST_SLOT_TOKEN='00000000-0000-4000-8000-000000000000';
    await assert.rejects(acquireGpuLock({owner:'capture',capture:true,log:quiet,listBrowsers:async()=>[]}),/ATLAS_TEST_SLOT_TOKEN inherited/);
    delete process.env.ATLAS_TEST_SLOT_TOKEN;
    const ok=await acquireGpuLock({owner:'capture',capture:true,log:quiet,listBrowsers:async()=>[]});await ok.release();
    assert.equal(existsSync(GPU_LOCK_DIR),false);
  }finally{if(savedToken===undefined)delete process.env.ATLAS_TEST_SLOT_TOKEN;else process.env.ATLAS_TEST_SLOT_TOKEN=savedToken;}
});

// Preview-server port selection for the browser runners (tests/helpers/free-port.mjs; docs/test-fixes-2026-10-07.md).
// A tiny child HTTP server stands in for `vite preview --strictPort`: it exits 1 on EADDRINUSE and answers its stamp.
const {portFree,ephemeralPort,parsePortOption,startOnFreePort,stopServer}=await import('./helpers/free-port.mjs');
const {spawn}=await import('node:child_process');
const {createServer}=await import('node:http');
const STRICT_SERVER="const h=require('http');const [p,stamp]=process.argv.slice(1);const s=h.createServer((q,r)=>r.end(stamp));s.on('error',()=>process.exit(1));s.listen(+p,'127.0.0.1');";
const strictServer=(port,stamp)=>spawn(process.execPath,['-e',STRICT_SERVER,String(port),stamp],{stdio:'ignore'});
const foreign=stamp=>new Promise(res=>{const s=createServer((q,r)=>r.end(stamp));s.listen(0,'127.0.0.1',()=>res(s));});
const ours=stamp=>async res=>(await res.text())===stamp;

test('free-port: an ephemeral port is bindable; a held port is reported busy; --port parsing', async()=>{
  const p=await ephemeralPort();assert.ok(p>0&&p<65536);assert.equal(await portFree(p),true);
  const held=await foreign('x');assert.equal(await portFree(held.address().port),false);held.close();
  assert.equal(parsePortOption(undefined),null);assert.equal(parsePortOption('auto'),null);assert.equal(parsePortOption('5297'),5297);
  for(const bad of ['0','70000','5.5','x'])assert.throws(()=>parsePortOption(bad),/invalid --port/);
});

test('free-port: a busy explicit port fails fast and starts nothing', async()=>{
  const held=await foreign('other service'),port=held.address().port;let spawned=0;
  try{
    await assert.rejects(startOnFreePort({port,url:p=>`http://127.0.0.1:${p}/`,spawnServer:()=>{spawned++;},owns:ours('me')}),/in use; pass another --port/);
    assert.equal(spawned,0,'no server was started for a busy explicit port');
  }finally{held.close();}
});

test('free-port: a child that exits (strict bind lost to a race) is detected at once and retried on a new port', async()=>{
  // Attempt 1's child exits like `vite preview --strictPort` on EADDRINUSE; attempt 2's child serves.
  let spawned=0;const reasons=[];
  const started=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/`,owns:ours('me'),timeoutMs:60000,log:l=>reasons.push(l),
    spawnServer:p=>++spawned===1?spawn(process.execPath,['-e','process.exit(1)'],{stdio:'ignore'}):strictServer(p,'me')});
  try{
    assert.equal(started.attempts,2);assert.equal(spawned,2);
    assert.equal(await (await fetch(`http://127.0.0.1:${started.port}/`)).text(),'me','the returned server is ours');
    assert.equal(reasons.length,1);assert.match(reasons[0],/server exited [(]code 1/,'the exit is seen, not waited out by the poll');
  }finally{stopServer(started.child);}
});

test('free-port: an answer from a server this runner did not start is never accepted', async()=>{
  // Attempt 1 polls a URL where a foreign server answers 200 while our child is alive elsewhere: rejected by `owns`
  // at the first answer (no timeout involved; the 60 s limits only bound a broken run).
  const other=await foreign('other service'),otherUrl=`http://127.0.0.1:${other.address().port}/`;
  let spawned=0;const reasons=[];
  try{
    const started=await startOnFreePort({owns:ours('me'),timeoutMs:60000,log:l=>reasons.push(l),
      url:p=>spawned===1?otherUrl:`http://127.0.0.1:${p}/`,spawnServer:p=>{spawned++;return strictServer(p,'me');}});
    try{
      assert.equal(started.attempts,2);
      assert.match(reasons[0],/not the one this runner started/);
      assert.equal(await (await fetch(`http://127.0.0.1:${started.port}/`)).text(),'me');
    }finally{stopServer(started.child);}
    // An explicit port is never swapped: one attempt, then a clear error.
    let n=0;
    await assert.rejects(startOnFreePort({port:await ephemeralPort(),owns:ours('me'),timeoutMs:60000,url:()=>otherUrl,spawnServer:p=>{n++;return strictServer(p,'me');}}),/not the one this runner started/);
    assert.equal(n,1);
  }finally{other.close();}
});
