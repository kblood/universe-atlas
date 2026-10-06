// Median of the C1 (mountain-assembly-cost) one-line results per world, for a directory of <world>-<i>.log files.
import fs from 'node:fs';
const dir = process.argv[2], med = a => {const s = [...a].sort((x, y) => x - y);return s.length ? s[s.length >> 1] : NaN;};
for (const w of ['Maithea', 'Selawyn', 'Raiva', 'Lethuris']) {
  const rows = fs.readdirSync(dir).filter(f => f.startsWith(w + '-') && f.endsWith('.log')).map(f => fs.readFileSync(`${dir}/${f}`, 'utf8')).filter(t => t.includes('WEIGHTED'))
    .map(t => ({wt: +t.match(/WEIGHTED RESIDENT (-?[\d.]+)%/)[1], out: +t.match(/outside main \d+ vs \d+ ns \((-?[\d.]+)%\)/)[1], mo: +t.match(/outside main (\d+)/)[1], bo: +t.match(/outside main \d+ vs (\d+)/)[1], warm: +t.match(/warm (\d+) ns/)[1], rm: +t.match(/region main (\d+)/)[1]}));
  if (!rows.length) continue;
  console.log(w, 'n', rows.length, 'weighted median', med(rows.map(r => r.wt)).toFixed(2) + '%', 'range', Math.min(...rows.map(r => r.wt)).toFixed(1), '..', Math.max(...rows.map(r => r.wt)).toFixed(1),
    '| outside', med(rows.map(r => r.mo)), '/', med(rows.map(r => r.bo)), '(' + med(rows.map(r => r.out)).toFixed(1) + '%) | region', med(rows.map(r => r.rm)), '/', med(rows.map(r => r.warm)));
}
