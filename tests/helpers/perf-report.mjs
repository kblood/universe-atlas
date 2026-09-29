/** Budget comparison and markdown summary for tests/desktop-perf.browser.mjs.
 * Budget rows are docs/desktop-perf-plan-2026-09-29.md (target machine,
 * 2560x1440, p95). Host values are converted to target-equivalent values:
 * CPU x1.7 for a native run (already inflated by CDP throttle in a cpu-proxy
 * run); GPU x5.4 (bracket 4.5-6.5) from hide-one-system attribution. */
export const CPU_PROXY_RATE=1.7,GPU_RATIO=5.4,GPU_BRACKET=[4.5,6.5],FRAME_MS=16.7;

/** cpu: CPU budget ms; cpuSystems: summed per-frame system series;
 * gpu: GPU budget ms; gpuHide: attribution systems. */
export const BUDGET_ROWS=[
  {row:'Terrain',cpu:1.8,cpuSystems:['terrainTiles'],gpu:3.0,gpuHide:['terrain']},
  {row:'Forest near (LOD0 detailed)',cpu:1.6,cpuSystems:['forest'],cpuNote:'CPU near+middle combined (0.6+1.0): forest update is not separable by tier',gpu:1.5,gpuHide:['forestNear']},
  {row:'Forest middle (LOD1 + handoff)',cpu:null,cpuSystems:[],cpuNote:'see forest near (combined)',gpu:2.0,gpuHide:['forestMiddle']},
  {row:'Forest far (canopy, far atlas)',cpu:0.5,cpuSystems:['canopy'],gpu:1.0,gpuHide:['forestFar']},
  {row:'Understory flora',cpu:0.7,cpuSystems:['flora','lifeScatter'],cpuNote:'includes shared life scatter/ground queue',gpu:1.2,gpuHide:['flora']},
  {row:'Fauna',cpu:1.4,cpuSystems:['fauna'],gpu:0.5,gpuHide:['fauna']},
  {row:'Clouds',cpu:0.2,cpuSystems:['clouds'],gpu:2.5,gpuHide:['clouds']},
  {row:'Rocks',cpu:0.5,cpuSystems:['rocks'],gpu:0.4,gpuHide:['rocks']},
  {row:'Sky / atmosphere / ocean / lights',cpu:0.4,cpuSystems:['sky'],gpu:1.2,gpuHide:['sky']},
  {row:'Overhead (submission + app / composite)',cpu:4.8,cpuSystems:['submission','shadow','other'],gpu:1.6,gpuHide:'all-hidden',
    cpuNote:'submission 3.8 (incl. shadow) + app 1.0',gpuNote:'frame pass sum with every attributable system hidden'},
];
export const TOTAL_ROW={row:'Total (frame work / pass sum)',cpu:FRAME_MS-4.8,gpu:FRAME_MS-1.8,
  note:'CPU: p95 frame work vs 16.7 - 4.8 reserve; GPU: p95 frame pass sum vs 16.7 - 1.8 reserve'};

export const median=values=>{const v=values.filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);return v.length?v[Math.floor((v.length-1)/2)]:null;};
export function percentile(values,q){
  const v=values.filter(Number.isFinite).sort((a,b)=>a-b);
  return v.length?v[Math.min(v.length-1,Math.max(0,Math.ceil(q*v.length)-1))]:null;
}
/** Per-frame sum of several system series, then p95 (nearest rank). */
export function systemP95(samples,systems){
  if(!systems.length)return null;
  const series=systems.map(name=>samples[`cpu/system/${name}Ms`]??[]);
  const n=Math.min(...series.map(s=>s.length));if(!n)return null;
  const sums=[];for(let i=0;i<n;i++)sums.push(series.reduce((a,s)=>a+s[s.length-n+i],0));
  return percentile(sums,.95);
}
const fmt=(v,d=2)=>v===null||v===undefined||!Number.isFinite(v)?'—':v.toFixed(d);
const verdict=(value,limit)=>value===null||limit===null?'n/a':value<=limit?'PASS':'FAIL';

/** CPU rows for one scenario and condition, median over repeats. */
export function cpuRows(captures,condition){
  const scale=condition==='native'?CPU_PROXY_RATE:1;
  return BUDGET_ROWS.map(r=>{
    const host=median(captures.map(c=>systemP95(c.samples,r.cpuSystems)));
    const target=host===null?null:host*scale;
    return {row:r.row,budget:r.cpu,hostP95:host,targetP95:target,verdict:r.cpu===null?'n/a':verdict(target,r.cpu),note:r.cpuNote??null};
  });
}
export function cpuTotal(captures,condition){
  const scale=condition==='native'?CPU_PROXY_RATE:1;
  const work=median(captures.map(c=>c.stats?.['cpu/frameWorkMs']?.p95??null));
  const interval=median(captures.map(c=>c.stats?.frameIntervalMs?.p95??null));
  return {row:TOTAL_ROW.row,budget:TOTAL_ROW.cpu,hostP95:work,targetP95:work===null?null:work*scale,verdict:verdict(work===null?null:work*scale,TOTAL_ROW.cpu),
    frameIntervalHostP95:interval,frameIntervalTargetP95:interval===null?null:interval*scale,frameIntervalVerdict:verdict(interval===null?null:interval*scale,FRAME_MS)};
}
/** GPU rows from hide-one-system attribution (native condition only). */
export function gpuRows(attributions){
  const stat=(a,key,q)=>a.find(x=>x.hidden===key)?.gpu?.[q]??null;
  const rows=BUDGET_ROWS.map(r=>{
    const delta=q=>median(attributions.map(a=>{
      const base=median([stat(a,'none',q),stat(a,'none-after',q)]);
      if(r.gpuHide==='all-hidden')return stat(a,'all',q);
      const hidden=stat(a,r.gpuHide[0],q);
      return base===null||hidden===null?null:Math.max(0,base-hidden);
    }));
    const host=delta('p95');
    return {row:r.row,budget:r.gpu,hostP95:host,hostP50:delta('p50'),targetP95:host===null?null:host*GPU_RATIO,
      bracket:host===null?null:[host*GPU_BRACKET[0],host*GPU_BRACKET[1]],verdict:verdict(host===null?null:host*GPU_RATIO,r.gpu),note:r.gpuNote??null};
  });
  const total=median(attributions.map(a=>median([stat(a,'none','p95'),stat(a,'none-after','p95')])));
  rows.push({row:TOTAL_ROW.row,budget:TOTAL_ROW.gpu,hostP95:total,hostP50:median(attributions.map(a=>median([stat(a,'none','p50'),stat(a,'none-after','p50')]))),targetP95:total===null?null:total*GPU_RATIO,
    bracket:total===null?null:[total*GPU_BRACKET[0],total*GPU_BRACKET[1]],verdict:verdict(total===null?null:total*GPU_RATIO,TOTAL_ROW.gpu)});
  return rows;
}

export function markdownSummary(report){
  const L=[];
  const contended=report.contended;
  L.push(`# Desktop perf harness summary`,'');
  L.push(`- **${contended?'CONTENDED — not acceptance evidence':'Uncontended (no foreign GPU process detected)'}**${report.contentionReasons?.length?`: ${report.contentionReasons.join('; ')}`:''}`);
  L.push(`- Commit \`${report.build?.commit}\` (${report.build?.branch}), dirty: ${report.build?.dirty}, built ${report.build?.builtAt}`);
  L.push(`- Browser: ${report.browser?.version} · WebGL: ${report.runs?.[0]?.webgl?.renderer??'?'} · crossOriginIsolated: ${report.runs?.map(r=>r.crossOriginIsolated).join('/')}`);
  L.push(`- Host: ${report.host?.cpu?.model} (${report.host?.cpu?.logicalProcessors} logical), harness affinity ${report.host?.affinity?.mask} · GPU ${report.gpuBefore?.gpu?.name} driver ${report.gpuBefore?.gpu?.driver_version}, power limit ${report.gpuBefore?.gpu?.['power.limit']} W`);
  L.push(`- Viewport ${report.config.viewport.join('×')} DPR 1 · repeats ${report.config.repeats} · conditions ${report.config.conditions.join(', ')}`);
  if(report.lockWaits?.some(w=>w.waitedMs>0))L.push(`- GPU-lock waits before runs (not contention: the lock is exclusive while held): ${report.lockWaits.map(w=>`${w.condition} r${w.repeat} ${Math.round((w.waitedMs??0)/1000)} s`).join(', ')}`);
  L.push(`- Host CPU load before runs (max of 3 s): ${report.runs?.map(r=>r.cpuLoadBefore?.maxPct??'?').join(', ')} % · GPU util before: ${report.runs?.map(r=>r.gpuBefore?.maxUtilizationPct??'?').join(', ')} %`);
  L.push(`- GPU clock lock declared: ${report.config.gpuClockLock??'none'} · observed graphics clock p50 per run: ${report.runs?.map(r=>r.gpuSamples?.graphicsClockMHz?.p50??'?').join(', ')} MHz`);
  const proxyRun=report.runs?.find(r=>r.condition==='cpu-proxy');
  const proxyMask=proxyRun?.browserAffinity?.find(b=>b.mask)?.mask??report.host?.affinity?.mask;
  L.push(`- CPU proxy: 9950X, CDP throttle ${CPU_PROXY_RATE}×, browser affinity ${proxyMask??'?'} (${proxyMask==='0xFFF'?'6C/12T proxy':'NOT the 0xFFF proxy mask'}; harness ${report.host?.affinity?.mask}) · native runs: all cores, CPU rows ×${CPU_PROXY_RATE} · GPU ratio proxy ×${GPU_RATIO} (bracket ${GPU_BRACKET.join('–')}×)`,'');
  if(report.verdict)L.push(`**Overall: ${report.verdict.overall}** (CPU ${report.verdict.cpu}, GPU ${report.verdict.gpu}${contended?', contended':''})`,'');
  for(const block of report.budget??[]){
    L.push(`## ${block.title}`,'');
    if(block.kind==='cpu'){
      L.push('| System | Budget ms | Host p95 ms | Target-equiv. p95 ms | Verdict | Note |','|---|---:|---:|---:|---|---|');
      for(const r of block.rows)L.push(`| ${r.row} | ${fmt(r.budget,1)} | ${fmt(r.hostP95)} | ${fmt(r.targetP95)} | ${r.verdict} | ${r.note??''} |`);
      const t=block.total;
      L.push(`| **${t.row}** | ${fmt(t.budget,1)} | ${fmt(t.hostP95)} | ${fmt(t.targetP95)} | ${t.verdict} | frame interval p95 host ${fmt(t.frameIntervalHostP95)} → ${fmt(t.frameIntervalTargetP95)} ms (${t.frameIntervalVerdict} vs 16.7) |`,'');
    }else{
      L.push('| System | Budget ms | Host Δp95 ms | ×5.4 ms | Bracket 4.5–6.5× | Verdict | Host Δp50 ms (×5.4) | Note |','|---|---:|---:|---:|---|---|---|---|');
      for(const r of block.rows)L.push(`| ${r.row} | ${fmt(r.budget,1)} | ${fmt(r.hostP95,3)} | ${fmt(r.targetP95)} | ${r.bracket?`${fmt(r.bracket[0])}–${fmt(r.bracket[1])}`:'—'} | ${r.verdict} | ${fmt(r.hostP50,3)} (${fmt(r.hostP50===null||r.hostP50===undefined?null:r.hostP50*GPU_RATIO)}) | ${r.note??''} |`);
      L.push('','Row = p95 of the frame pass sum with nothing hidden (median of before/after) minus p95 with that system hidden, clamped at 0. Single-system deltas are noisy (about ±0.3 ms host), so Δp50 is shown alongside. Overhead = pass sum with every attributable system hidden; Total = unhidden pass sum.','');
    }
  }
  if(report.scenarioTable?.length){
    L.push('## Scenario frame distribution (median over repeats)','');
    L.push('| Condition | Scenario | Frame interval p50/p95/p99/max ms | CPU frame work p95 ms | GPU pass sum p95 ms | >33 / >50 ms frames | Long tasks | Signals |','|---|---|---|---:|---:|---|---:|---|');
    for(const s of report.scenarioTable)L.push(`| ${s.condition} | ${s.scenario} | ${[s.p50,s.p95,s.p99,s.max].map(v=>fmt(v,1)).join(' / ')} | ${fmt(s.cpuP95)} | ${fmt(s.gpuP95)} | ${s.over33??'—'} / ${s.over50??'—'} | ${s.longTasks??'—'} | ${s.signals??''} |`);
    L.push('');
  }
  if(report.coldLoad?.length){
    L.push('## S0 cold/warm load (ms from navigation)','');
    L.push('| Condition | Repeat | Cache | ready | surface | forest | flora | fauna | rocks | settled | >33/>50 in first 10 s | long tasks 10 s |','|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|');
    for(const c of report.coldLoad)L.push(`| ${c.condition} | ${c.repeat} | ${c.cache} | ${['ready','surfaceReady','forest','flora','fauna','rocks','settled'].map(k=>fmt(c.milestones?.[k],0)).join(' | ')} | ${c.hitches10s?`${c.hitches10s.over33}/${c.hitches10s.over50}`:'—'} | ${c.longTasks10s??'—'} |`);
    L.push('');
  }
  if(report.errors?.length)L.push('## Page errors','',...report.errors.slice(0,20).map(e=>`- ${e}`),'');
  return L.join('\n');
}
