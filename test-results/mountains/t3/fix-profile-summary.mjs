import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(process.argv[2],'utf8')), byId=new Map(p.nodes.map(n=>[n.id,n])), sums=new Map();
for(let i=0;i<p.samples.length;i++) {
  const c=byId.get(p.samples[i]).callFrame;
  const arm=c.url.includes('staged-off')?'off':c.url.includes('/src/')?'on':'system';
  const key=`${arm} ${c.functionName||'(anon)'} ${c.url.split('/').pop()}:${c.lineNumber+1}`;
  sums.set(key,(sums.get(key)||0)+p.timeDeltas[i]);
}
for(const [k,v] of [...sums].sort((a,b)=>b[1]-a[1]).slice(0,55)) console.log((v/1000).toFixed(0).padStart(7),k);
