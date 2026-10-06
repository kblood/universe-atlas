// Evidence helper (T4 target 3): preloaded after the wiring hook; prints the M3 block solves of the run as one line on
// stderr at exit, or after CAP_S seconds (then exits), so slow wired test files can be attributed without a full run.
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
const cap = +(process.env.CAP_S || 180), t0 = performance.now();
const report = tag => process.stderr.write(`\nBLOCKS ${JSON.stringify({tag, blockSolves: carvingBuildStats.count, s: Math.round((performance.now() - t0) / 1000)})}\n`);
process.on('exit', () => report('exit'));
setTimeout(() => {report('cap');process.exit(0);}, cap * 1000).unref();
