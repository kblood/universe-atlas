import fs from 'node:fs';
const parse = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').filter(l => /^(Maithea|Selawyn|Raiva|Lethuris) \{/.test(l)).map(l => [l.slice(0, l.indexOf(' ')), JSON.parse(l.slice(l.indexOf(' ') + 1))]));
for (const [m, bf, af] of [['staged', 'ledger-before.log', 'ledger-after-staged.log'], ['wired', 'ledger-before-wired.log', 'ledger-after-wired.log']]) {
  const a = parse(bf), b = parse(af);
  for (const w of Object.keys(a)) {
    const diff = [], same = [];
    for (const k of Object.keys(a[w].samplers)) (a[w].samplers[k] !== b[w].samplers[k] ? diff : same).push(k);
    for (const k of Object.keys(a[w].tiles)) a[w].tiles[k].forEach((h, i) => (h !== b[w].tiles[k][i] ? diff : same).push(`tile ${k}[${i}]`));
    for (const k of ['orbit', 'hypsometry', 'survey']) (a[w][k] !== b[w][k] ? diff : same).push(k);
    console.log(m, w, 'MOVED:', diff.join(', ') || 'none', '| identical:', same.length);
  }
}
