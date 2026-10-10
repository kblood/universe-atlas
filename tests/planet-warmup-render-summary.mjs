import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.ATLAS_RESULTS||'test-results/planet-warmup-render';
const report=JSON.parse(await readFile(out+'/report.json','utf8'));
const summary={runs:[]};
const key=frame=>frame.calls.map(c=>JSON.stringify(c)).sort();
for(const run of report.runs){
  const m=run.measurement,e=m.enabled.frames.at(-1),d=m.disabled.frames.at(-1);
  assert.deepEqual(run.errors,[]);assert.deepEqual(m.mutations,[]);assert(m.restored.light&&m.restored.target);
  assert.deepEqual(key(e),key(d));
  summary.runs.push({build:run.build,ids:m.ids.length,forest:m.forest,materialMutations:m.mutations,restored:m.restored,
    terrainVisible:e.backlog.terrainVisible,terrainPending:e.backlog.terrainPending,calls:e.profile,triangles:e.triangles,
    bufferDirect:e.calls.reduce((counts,c)=>{counts[c.pass]=(counts[c.pass]||0)+1;return counts;},{}),shadowCasters:m.enabled.shadow.lastCasters,
    helperDisabledSameDraws:true});
}
assert.deepEqual(key(report.runs[0].measurement.enabled.frames.at(-1)),key(report.runs[1].measurement.enabled.frames.at(-1)));
summary.baselineCandidateSameDraws=true;
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
