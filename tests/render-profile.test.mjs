import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {RenderProfile,profileSummary,systemTimer,CPU_SYSTEMS}=await vite.ssrLoadModule('/src/render-profile.ts');
after(()=>vite.close());

function fakeGL({supported=true}={}){
  let active=null,lost=false,disjoint=false,next=0;
  const queries=[],deleted=[],ext={TIME_ELAPSED_EXT:100,GPU_DISJOINT_EXT:101};
  return {
    QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,CURRENT_QUERY:3,
    getExtension:()=>supported?ext:null,isContextLost:()=>lost,
    getParameter:()=>disjoint,getQuery:()=>active,
    createQuery(){const q={id:++next,available:false,ns:2e6};queries.push(q);return q;},
    beginQuery(_target,q){assert.equal(active,null,'no nesting');active=q;},
    endQuery(){assert.ok(active);active=null;},
    deleteQuery(q){deleted.push(q);},
    getQueryParameter(q,kind){if(kind===1)return q.available;assert.ok(q.available,'result must never be read before available');return q.ns;},
    queries,deleted,ready(){for(const q of queries)q.available=true;},
    disjoint(value){disjoint=value;},lose(value){lost=value;},external(value){active=value?{}:null;},
  };
}
test('summary uses bounded nearest-rank percentiles and reports no samples honestly',()=>{
  assert.deepEqual(profileSummary([]),{samples:0,p50:null,p95:null,p99:null,max:null});
  assert.deepEqual(profileSummary([4,1,3,2]),{samples:4,p50:2,p95:4,p99:4,max:4});
});
test('disabled profiler performs work without queries or samples',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.beginFrame(16);assert.equal(p.pass('scene',()=>42),42);p.endFrame(2,10);
  assert.equal(gl.queries.length,0);assert.deepEqual(p.diagnostics().statistics,{});
});
test('GPU results are delayed and complete-frame sum includes all passes',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);
  p.beginFrame(16);p.pass('capture',()=>{});p.pass('clouds',()=>{});p.endFrame(8,100);
  assert.equal(p.diagnostics().statistics['gpu/framePassSumMs'],undefined);
  p.beginFrame(17);p.pass('capture',()=>{});p.endFrame(4,50);
  assert.equal(p.diagnostics().pendingQueries,3);
  gl.ready();p.beginFrame(16);
  assert.equal(p.diagnostics().statistics['gpu/captureMs'].samples,2);
  assert.equal(p.diagnostics().statistics['gpu/framePassSumMs'].samples,2);
  assert.equal(p.diagnostics().statistics['gpu/framePassSumMs'].max,4);
});
test('sampling can stop while pending GPU queries drain without issuing new queries',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);
  p.beginFrame(16);p.pass('scene',()=>{});p.endFrame(1,1);
  p.setSampling(false);
  p.beginFrame(16);p.pass('scene',()=>{});p.endFrame(1,1);
  assert.equal(gl.queries.length,1);assert.equal(p.diagnostics().pendingQueries,1);
  gl.ready();p.beginFrame(16);
  assert.equal(p.diagnostics().pendingQueries,0);
  assert.equal(p.diagnostics().statistics['gpu/sceneMs'].samples,1);
  assert.equal(p.diagnostics().statistics['frameIntervalMs'].samples,1);
});
test('disjoint results are discarded and cannot contribute to totals',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);p.beginFrame(16);p.pass('scene',()=>{});p.endFrame(1,1);
  gl.disjoint(true);gl.ready();p.beginFrame(16);
  assert.equal(p.diagnostics().pendingQueries,0);assert.equal(p.diagnostics().disjointQueries,1);
  assert.equal(p.diagnostics().statistics['gpu/sceneMs'],undefined);assert.equal(gl.deleted.length,1);
  p.pass('scene',()=>{});assert.equal(gl.queries.length,1,'do not time a known-disjoint frame');
});
test('external GPU query and nested calls are not ended by profiler',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);p.beginFrame(16);
  gl.external(true);assert.equal(p.pass('external',()=>3),3);gl.external(false);
  p.pass('outer',()=>p.pass('inner',()=>7));p.endFrame(1,1);gl.ready();p.beginFrame(16);
  assert.equal(gl.queries.length,1);assert.equal(p.diagnostics().skippedQueries,2);
  assert.equal(p.diagnostics().statistics['gpu/framePassSumMs'],undefined);
});
test('unavailable query backlog and histories remain bounded',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);
  for(let i=0;i<750;i++){p.beginFrame(16);p.pass('scene',()=>{});p.endFrame(1,3);}
  assert.ok(p.diagnostics().pendingQueries<=48);assert.ok(p.diagnostics().expiredQueries>0);
  assert.equal(p.diagnostics().statistics.frameIntervalMs.samples,600);
  p.setEnabled(false);assert.equal(p.diagnostics().pendingQueries,0);
});
test('CPU statistics remain available when GPU extension is unavailable',()=>{
  const p=new RenderProfile(fakeGL({supported:false}));p.setEnabled(true);p.beginFrame(16);p.cpu('planetUpdate',()=>{});p.pass('scene',()=>{});p.endFrame(1,3);
  assert.equal(p.diagnostics().gpuAvailable,false);assert.equal(p.diagnostics().statistics['cpu/planetUpdateMs'].samples,1);
  assert.equal(p.diagnostics().statistics['gpu/framePassSumMs'],undefined);
});
test('throwing render closes its own query but invalidates frame total',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);p.beginFrame(16);
  assert.throws(()=>p.pass('scene',()=>{throw Error('render failed');}),/render failed/);p.endFrame(1,1);
  gl.ready();p.beginFrame(16);assert.equal(p.diagnostics().statistics['gpu/framePassSumMs'],undefined);
});
test('context loss releases pending state and reacquires extension on restoration',()=>{
  const gl=fakeGL(),p=new RenderProfile(gl);p.setEnabled(true);p.beginFrame(16);p.pass('scene',()=>{});p.endFrame(1,1);
  gl.lose(true);p.beginFrame(16);assert.equal(p.diagnostics().pendingQueries,0);assert.equal(p.diagnostics().gpuAvailable,false);
  gl.lose(false);p.beginFrame(16);assert.equal(p.diagnostics().gpuAvailable,true);
});
test('per-system CPU samples are recorded every frame with an unattributed remainder',()=>{
  const p=new RenderProfile(fakeGL({supported:false}));p.setEnabled(true);
  assert.equal(systemTimer.enabled,true,'profiling enables the shared system timer');
  for(let i=0;i<3;i++){p.beginFrame(16);p.endFrame(1,1,i===1?{forest:2,rocks:.5}:{});}
  const stats=p.diagnostics().statistics;
  for(const name of CPU_SYSTEMS)assert.equal(stats[`cpu/system/${name}Ms`].samples,3,name);
  assert.equal(stats['cpu/system/forestMs'].max,2);assert.equal(stats['cpu/system/forestMs'].p50,0,'idle frames record zero, not nothing');
  assert.ok(stats['cpu/system/otherMs'].max>=0);
  p.beginFrame(16);p.endFrame(1,1);assert.equal(p.diagnostics().statistics['cpu/system/forestMs'].samples,3,'no systems argument, no system samples');
  p.setEnabled(false);assert.equal(systemTimer.enabled,false);assert.equal(systemTimer.start(),0,'disabled timer costs no clock read');
});
test('system timer accumulates per frame and frame CPU totals reset each frame',()=>{
  const p=new RenderProfile(fakeGL({supported:false}));p.setEnabled(true);
  systemTimer.add('shadow',1);systemTimer.add('shadow',2);assert.deepEqual(systemTimer.take(),{shadow:3});assert.deepEqual(systemTimer.take(),{});
  p.beginFrame(16);p.cpu('scene',()=>{});p.cpu('scene',()=>{});assert.ok(p.frameCpuMs('scene')>=0);p.endFrame(1,1);
  p.beginFrame(16);assert.equal(p.frameCpuMs('scene'),0);p.endFrame(1,1);p.setEnabled(false);
});
test('hitch counters cover every frame; long histories are configurable and bounded',()=>{
  const p=new RenderProfile(fakeGL({supported:false}));p.setEnabled(true);p.setHistoryLimit(2000);
  for(const ms of [16,34,51,120,16])p.beginFrame(ms),p.endFrame(1,1);
  assert.deepEqual(p.diagnostics().hitches,{frames:5,over33:3,over50:2,over100:1,maxIntervalMs:120});
  for(let i=0;i<1500;i++){p.beginFrame(16);p.endFrame(1,1);}
  assert.equal(p.samples(['frameIntervalMs']).frameIntervalMs.length,1505);
  p.setHistoryLimit(1e9);for(let i=0;i<40000;i++){p.beginFrame(16);p.endFrame(1,1);}
  assert.equal(p.diagnostics().statistics.frameIntervalMs.samples,36000,'history cap');
  p.clear();assert.equal(p.diagnostics().hitches.frames,0);p.setEnabled(false);
});
