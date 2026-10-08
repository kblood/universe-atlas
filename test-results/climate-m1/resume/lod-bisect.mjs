// R5-ATLAS-CLIMATE-M1 resume, climate-m1-decision-2 (b) step 1 (Opus-decided on Kasper's instruction, overrulable):
// bisect the lod-consistency rows by climate step. Run INSIDE a scratch worktree at the climate/m1 tip: for each
// variant it writes that commit's src/surface-climate.ts into the scratch tree, runs lod-measure.mjs in a fresh
// process, and collects the table. Step 0 = main 290472d's surface-climate.ts on the merged tip (must give main's
// table). Then gates G1-G3 and the per-row attribution (the first step at which each row fails and stays failing).
// G4 (tip vs the e3c3358 table) is judged against --ref. Writes one JSON object to stdout.
// Usage (in the scratch worktree): node test-results/climate-m1/resume/lod-bisect.mjs --ref <lod-measure.json> --main <lod-measure-main.json>
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';

const arg=k=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:null;};
const ref=JSON.parse(readFileSync(arg('--ref'),'utf8')),mainRef=JSON.parse(readFileSync(arg('--main'),'utf8'));
const VARIANTS=[['step0-main-290472d','290472d'],['step1-pdd','c506b41'],['step2-warm-lapse','2f49abb'],['step3-ceiling','0814edd'],
  ['step4-heat-cap','f87eba5'],['step5-pet','730094c'],['step6-itcz','7200557'],['tip','HEAD']];
const FILE='src/surface-climate.ts',original=readFileSync(FILE);
const tables={};
try{
  for(const [label,rev] of VARIANTS){
    writeFileSync(FILE,execFileSync('git',['show',`${rev}:${FILE}`]));
    const t0=Date.now();
    tables[label]=JSON.parse(execFileSync(process.execPath,['test-results/climate-m1/resume/lod-measure.mjs'],{maxBuffer:1<<26}).toString());
    process.stderr.write(`${label} ${rev} ${tables[label].climateVersion} ${Date.now()-t0} ms, failing ${tables[label].failingRows.length}\n`);
  }
}finally{writeFileSync(FILE,original);}

const HEIGHT_ROWS=['heightP99M','heightMaxM','sharedOceanMismatch','ocean'];
const gates={G1:{pass:true,diffs:[]},G2:{pass:true,step0Failing:tables['step0-main-290472d'].failingRows,step0EqualsMain:null,unattributed:[]},G3:{pass:true,rows:[]},G4:{pass:true,rows:[]}};
// G1: height/ocean rows identical to main at every level, both worlds, for every variant.
for(const [label,t] of Object.entries(tables))for(const name in t.cross)for(const L in t.cross[name])for(const k of HEIGHT_ROWS){
  const a=t.cross[name][L][k].value,b=mainRef.cross[name][L][k].value;if(a!==b){gates.G1.pass=false;gates.G1.diffs.push({label,name,L,k,value:a,main:b});}}
// G2: step 0 passes every row and equals main's table; every tip-failing row starts failing at a named step.
gates.G2.step0EqualsMain=JSON.stringify(tables['step0-main-290472d'].cross)===JSON.stringify(mainRef.cross)&&JSON.stringify(tables['step0-main-290472d'].retention)===JSON.stringify(mainRef.retention);
if(gates.G2.step0Failing.length||!gates.G2.step0EqualsMain)gates.G2.pass=false;
const rowsOf=t=>{const r={};for(const name in t.cross)for(const L in t.cross[name])for(const k in t.cross[name][L])r[`${name} L${L} ${k}`]=t.cross[name][L][k];
  r['Maithea L6 retention snowKept']={value:t.retention.l6.snowKept,limit:100*t.retention.keeps.snowL6,pass:t.retention.checks.snowL6};return r;};
const perVariant=Object.fromEntries(Object.entries(tables).map(([l,t])=>[l,rowsOf(t)]));
const labels=VARIANTS.map(v=>v[0]),tipRows=perVariant.tip,attribution={};
for(const [row,r] of Object.entries(tipRows)){
  if(r.pass)continue;
  // first variant from which the row fails in every later variant
  let first=null;for(let i=labels.length-1;i>=0;i--){if(perVariant[labels[i]][row].pass)break;first=labels[i];}
  const history=Object.fromEntries(labels.map(l=>[l,perVariant[l][row].value]));
  const firstFail=labels.find(l=>!perVariant[l][row].pass)??null;
  attribution[row]={tip:r.value,limit:r.limit,failsFrom:first,firstFail,history};
  if(!first||first==='step0-main-290472d')gates.G2.unattributed.push(row);
}
if(gates.G2.unattributed.length)gates.G2.pass=false;
for(const name in tables.tip.cross)for(const L in tables.tip.cross[name])if(+L>=12)for(const [k,r] of Object.entries(tables.tip.cross[name][L]))if(!r.pass){gates.G3.pass=false;gates.G3.rows.push(`${name} L${L} ${k}`);}
// G4: at the tip, no row more than 5 % worse than the e3c3358 table (retention: lower is worse).
const refRows=rowsOf(ref);
for(const [row,r] of Object.entries(tipRows)){
  const was=refRows[row].value,isRet=row.includes('retention');
  const worse=isRet?(was-r.value)/Math.max(1e-9,was):(r.value-was)/Math.max(1e-9,Math.abs(was));
  if(worse>.05&&Math.abs(r.value-was)>1e-9){gates.G4.pass=false;gates.G4.rows.push({row,ref:was,tip:r.value});}
}
console.log(JSON.stringify({variants:VARIANTS,gates,attribution,tables},null,1));
