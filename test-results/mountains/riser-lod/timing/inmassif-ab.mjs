// Riser LOD pre-merge timing: the C1 in-massif warm bench (test-results/mountains/carving-c1/inmassif-bench.mjs,
// unchanged; truth rock path) and the INFO riser-path row (inmassif-riser-bench.mjs), main 7419733 export and this
// branch alternated, 3 runs each, one fresh process per run. Run under the EXCLUSIVE slot.
//   node test-results/mountains/riser-lod/timing/inmassif-ab.mjs <mainRoot>
import {execFileSync} from 'node:child_process';
const [mainRoot] = process.argv.slice(2), runs = {main: [], branch: []}, riser = {main: [], branch: []};
const run = (script, root, tag) => {const line = execFileSync(process.execPath, [script, root], {encoding: 'utf8'}).split('\n').find(l => l.startsWith(tag + ' '));return JSON.parse(line.slice(tag.length + 1));};
for (let r = 0; r < 3; r++) for (const [k, root] of (r % 2 ? [['branch', '.'], ['main', mainRoot]] : [['main', mainRoot], ['branch', '.']])) {
  const j = run('test-results/mountains/carving-c1/inmassif-bench.mjs', root, 'INMASSIF_BENCH');runs[k].push(j);console.log(k, JSON.stringify(j));
  const q = run('test-results/mountains/riser-lod/timing/inmassif-riser-bench.mjs', root, 'INMASSIF_RISER');riser[k].push(q);console.log(k, 'riser', JSON.stringify(q));
}
const med = a => [...a].sort((x, y) => x - y)[1];
const s = {mainRockNs: runs.main.map(j => j.carveRock.medianNs), branchRockNs: runs.branch.map(j => j.carveRock.medianNs),
  mainNoRockNs: runs.main.map(j => j.carveNoRock.medianNs), branchNoRockNs: runs.branch.map(j => j.carveNoRock.medianNs)};
for (const L of Object.keys(riser.branch[0].rows)) {s[`mainRiser${L}Ns`] = riser.main.map(q => q.rows[L].medianNs);s[`branchRiser${L}Ns`] = riser.branch.map(q => q.rows[L].medianNs);}
s.widths = riser.branch[0].widths;s.mainRockMedianNs = med(s.mainRockNs);s.branchRockMedianNs = med(s.branchRockNs);s.limitNs = 250;s.pass = s.branchRockMedianNs <= 250;
console.log('INMASSIF_AB ' + JSON.stringify(s));
