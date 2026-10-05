import {readdirSync, readFileSync} from 'node:fs';
const dir = process.argv[2];
const f = readdirSync(dir).filter(x => x.endsWith('.cpuprofile'))[0];
const p = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
const byId = new Map(p.nodes.map(n => [n.id, n]));
const self = new Map();
const dt = p.timeDeltas; let total = 0;
for (let i = 0; i < p.samples.length; i++) {
  const n = byId.get(p.samples[i]); const cf = n.callFrame;
  const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + dt[i]); total += dt[i];
}
const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, +(process.argv[3] || 30));
console.log('total ms', (total / 1000).toFixed(0));
for (const [k, v] of rows) console.log((v / 1000).toFixed(0).padStart(7), (100 * v / total).toFixed(1).padStart(5) + '%', k);
