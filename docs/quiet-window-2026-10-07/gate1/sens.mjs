import {readFileSync} from 'node:fs';
const O=process.argv[2], L=f=>readFileSync(`${O}/${f}`,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const c1=L('c1.jsonl'), orbit=L('orbit.jsonl'), pre=L('precheck.jsonl');
const preC=pre.filter(p=>p.label.startsWith('c1')), preO=pre.filter(p=>p.label.startsWith('orbit'));
// identity checks
const set=a=>[...new Set(a)].join('|');
console.log('c1 versions AB', set(c1.filter(r=>r.label==='AB').map(r=>`${r.refVersion}/${r.refWired} -> ${r.candVersion}/${r.candWired}`)));
console.log('c1 versions AA', set(c1.filter(r=>r.label==='AA').map(r=>`${r.refVersion}/${r.refWired} -> ${r.candVersion}/${r.candWired}`)));
console.log('orbit identical AA', set(orbit.filter(r=>r.label.startsWith('AA')).map(r=>r.identical)), 'AB', set(orbit.filter(r=>r.label.startsWith('AB')).map(r=>r.identical)), 'blockSolves', set(orbit.map(r=>r.blockSolves)));
console.log('node', set(c1.map(r=>r.node)));
// label consistency between precheck order and record order
let bad=0; c1.forEach((r,i)=>{const p=preC[i].label.split(' ');if(p[1]!==r.label||p[2]!==r.world||p[3]!==r.first)bad++;});
orbit.forEach((r,i)=>{const p=preO[i].label.split(' ');if(p[1]!==r.label.split('|')[0]||p[2]!==r.world||'first='+p[3]!==r.label.split('|')[1])bad++;});
console.log('order mismatches', bad, 'flagged c1', preC.filter(p=>p.flagged).length, 'flagged orbit', preO.filter(p=>p.flagged).length, 'strong-contender', pre.filter(p=>p.reasons.length).map(p=>p.label+' '+p.newHeavy.join(',')).join('; '));
console.log('waits total s', Math.round(pre.reduce((s,p)=>s+p.waitedMs,0)/1000), 'idle min', Math.min(...pre.map(p=>p.idlePct)));
const sorted=a=>[...a].sort((x,y)=>x-y), med=a=>{const s=sorted(a),n=s.length;return n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2;};
const ciR=n=>{let c=0,k=0;const p=i=>{let r=1;for(let j=0;j<i;j++)r=r*(n-j)/(j+1);return r/2**n;};while(c+p(k)<=.025){c+=p(k);k++;}return [k,n-k+1];};
const ci=a=>{const s=sorted(a),[lo,hi]=ciR(s.length);return lo<1?[NaN,NaN]:[s[lo-1],s[hi-1]];};
const og=r=>{const f=r.label.split('|first=')[1],m=a=>sorted(a)[a.length>>1];const ref=f==='ref'?r.aMs:r.bMs,cand=f==='ref'?r.bMs:r.aMs;return m(cand)/m(ref)-1;};
const pc=x=>(100*x).toFixed(2);
for(const w of ['Maithea','Selawyn','Raiva','Lethuris']){
  const ab=c1.map((r,i)=>[r,preC[i]]).filter(([r,p])=>r.world===w&&r.label==='AB'&&!p.flagged).map(([r])=>r.weighted);
  const ob=orbit.map((r,i)=>[r,preO[i]]).filter(([r,p])=>r.world===w&&r.label.startsWith('AB')&&!p.flagged).map(([r])=>og(r));
  console.log(`${w} UNFLAGGED-ONLY (INFO): C1 A/B ${pc(med(ab))}% [${ci(ab).map(pc)}] n=${ab.length}; orbit A/B ${pc(med(ob))}% [${ci(ob).map(pc)}] n=${ob.length}`);
}
