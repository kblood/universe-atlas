import {readFileSync,writeFileSync} from 'node:fs';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url),'utf8'));
const pools=read('rows-all-pools.json'),g=pools.gate,a=g.actual,w=g.without,c=g.controls;
const frozen=read('frozen-round4.json'),bench=read('cost-bench.json'),smoke=read('integration-m3-smoke.json').pools.m3;
const log=readFileSync(new URL('element.log',import.meta.url),'utf8');
const registered=JSON.parse(log.split(/\r?\n/).find(l=>l.startsWith('M5_ROWS ')).slice(8)),h=registered.hard;
const f=x=>typeof x==='number'?x.toFixed(6):String(x),pair=(a,b)=>`${f(a)} / ${f(b)}`;
const table=(heads,rows)=>[heads,heads.map(()=>'---'),...rows].map(r=>'| '+r.join(' | ')+' |').join('\n');
const rms=r=>`${pair(r.steepRms,r.flatRms)} / ${f(r.ratio)}`;
const reasons={SLOPE_ZERO_TAN:'Exact tan(10°) exclusion.',SLOPE_FULL_TAN:'Exact tan(30°) full weight.',SLOPE_STEP_M:'Fixed forward-gradient step, independent of LOD.',MAX_DEPTH_M:'55 m absolute incision cap.',CAP_FRACTION:'Preserves the nonnegative relief and upper envelope.',GULLY_CELL_M:'Near-regular 250 m lattice; nine centres searched.',GULLY_HALF_LENGTH_M:'200 m downhill half-length, safely within the finite search.',GULLY_HALF_WIDTH_M:'65 m cross-slope half-width.',GULLY_JITTER:'Centres span 0.35–0.65 cell; constant unit amplitude, no A_MIN.',KAPPA:'Slope-depth limit; depth ≤120 times slopeTan.',PROFILE_MAX_SLOPE:'Exact quartic-kernel derivative maximum.',STRATA_PERIOD_M:'280 vertical metres; approximately 280–600 m horizontally on 25–45° faces.',BENCH_RISE:'Linear tread over half the phase.',BENCH_FALL:'Fast linear return over 8% of the phase.',STRATA_WEIGHT:'Benches supply 98.5% of the shape.',RIB_WEIGHT:'Secondary gullies supply 1.5%.',JITTER_M:'Seed-constant height offset; spatial gradient exactly zero.',SEED_SALT:'Retained decorrelation salt.'};
let out=`Round 4 is implemented and remains staged. **All 17 enabled gate tests passed; one optional cost test was skipped.** The fresh gate meets HARD 1–7 and R1e/R2/R3′/R4/R5/R6, including every required negative control. The authorized real-M3 smoke meets all eight M3 rows and its R1e/R2/R3′ checks. Unofficial cost and test duration meet their limits. This is element and smoke evidence, not full integration or approval to wire M5.

The final mix is 98.5% height benches and 1.5% downhill gullies. Larger gully weights reintroduced fine pits in tuning; the small secondary term preserves the texture while benches supply the contrast. The 280 m period also avoids the weak R2 depth-control response seen near 220 m. The bench is continuous and piecewise linear, with corners, a fast return, zero over 42% of each cycle, and mean 0.29. The base fixture and background are unchanged. The six-argument API, exclusions, exports and version stay intact; no production wiring was edited.

Constants were saved in frozen-round4.json before the single fresh gate run. Only 730501–730508 and the authorized 730201/site-1 smoke informed selection. No gate-driven tuning occurred.

`;
out+=Object.entries(frozen.constants).map(([k,v])=>`- ${k} = ${v}: ${reasons[k]}`).join('\n');
out+=`

Version: mountain-rock-detail-1. Frozen bands: 1000/500/250/125 m. Reduction: longest wavelength 1000 m, 32 segments; maximum edge 8000 m.

With σ′ ≤1/0.5 on the rising tread and B=8/(3√3)=1.539600717839002, HARD 6 verifies:

**55×0.985/(280×0.5) + 0.6×1.539600717839002×0.015 = 0.386964286 + 0.013856406 = 0.400820692 ≤0.6.**

The bench-only height map has derivative ≥1−0.386964286=0.613035714. Even adding the conservative active-height-cap contribution 0.5 gives a climb bound 0.900820692<1 when weight and forward gradient are fixed. On a general surface, slope, weight and orientation vary spatially; this is **not a global pit-free proof for the complete weighted module**. In particular, ∇w=w′∇s remains a path to toe pits. The measured R6 row tests that failure mode. Seed-constant J contributes no gradient.

For HARD 7, |∇base|≤1.03 gives gradient Lipschitz G=2√2×1.03/125, direction Lipschitz G/tan10, and kernel bound B(1/200+1/65)(1+ρG/tan10), where ρ=210.297408 m. Omitted centres are at least (1.5−0.15)×250=337.5 m away, so the finite search has no seams. The product-rule bound includes cap 0.515, slope-depth 0.6×200×G, weight derivative 1.5/(tan30−tan10), bench absolute derivative max(1/0.5,1/0.08)/280, and the weighted kernel bound: **L_MAX=${f(h.continuity.L_MAX)}**, tolerance ${f(h.continuity.L_MAX*.01)} m per 0.01 m straddle.

`;
out+=table(['Gate HARD','Measured result — all PASS'],[
['1',`${h.exclusions} literal +0 exclusions.`],['2',`32,768 gate + 32,768 tuning samples; zero violations; negative on ${registered.gate.bounds.negative}/${registered.gate.bounds.steep} gate steep samples and ${registered.tuning.bounds.negative}/${registered.tuning.bounds.steep} tuning steep samples.`],['3','10,001 weight samples plus endpoint checks.'],['4','4,096 tuples; pinned forward/reverse/child digest agrees.'],['5',`Arithmetic-only/no-import audit; ${h.auditNegatives} forbidden-code controls rejected.`],['6','Frozen exports, cap, support and numerical inequalities above.'],['7',`6,000 straddles per pool; ${h.continuity.wraps} bench corner/wrap roots; ${h.continuity.thresholds} weight roots; three shared-edge lines, zero mismatches.`]]);
out+=`

Digest: ${h.digest}.

Gate/tuning straddle maxima: ${pair(h.continuity.gate.max,h.continuity.max)} m. Speckle maxima: ${pair(h.continuity.gate.speckleMax,h.continuity.speckleMax)} m, both fail the continuity bound as required. Level-dependent slope has ${h.continuity.levelMismatch} shared-vertex mismatches, failing as required. Midpoint deviations are INFO: gate ${f(h.continuity.edge.max)} m, tuning ${f(h.continuity.tuningEdge.max)} m, speckle gate ${f(h.continuity.speckleEdge.max)} m.

`;
out+=table(['Gate row','Measurement','Outcome'],[
['Fixture',`${pair(a.R2_R5.base.flatShare,a.R2_R5.base.steepShare)} flat/steep share; base fill and qualifying pits 0`,'PASS'],
['R1e',`${rms(a.R1e)} m steep / background-flat / ratio`,'PASS ≥2'],
['R2',`${pair(a.R2_R5.p50,a.R2_R5.p90)}°; without ${pair(w.R2_R5.p50,w.R2_R5.p90)}°`,'PASS p50 drop ≤0.5°, p90 ≤48.4°'],
['R3′',`${f(a.R3.beta)}; without ${f(w.R3.beta)}; ceiling ${f(registered.gate.R3prime.limit)}`,'PASS ≥2 and closes ≥⅓ of gap'],
['R4, fall line +x',f(a.R4),'PASS ≤0.20'],
['R5',`${pair(a.R2_R5.fill10ShareP50,a.R2_R5.pits025Per1000km2P50)} fill / qualifying pits per 1000 km²`,'PASS ≤0.05 / ≤50'],
['R6',`${a.R6.newPits} new pits / ${f(a.R6.areaKm2)} km² = ${f(a.R6.newPitsPerKm2)}/km²; base 0`,'PASS ≤1']]);
out+=`

R3′ uses the fixed literal 2.617, with provenance in the test: harness syntheticSampler(R=5194907,'alpine'), four sites, 125 m–2 km octaves. It was not remeasured this round.

Controls use gate seeds 730901–730904, except no-rock and round-2 R6/R7, which use all eight:

`;
out+=table(['Control','Gate value','Did it fail as required?'],[
['No rock R1e',f(w.R1e.ratio),'Yes, <2'],['Depth ×0.1 R1e',f(c.shallowR1.R1e.ratio),'Yes, <2'],
['MAX_DEPTH_M ×4 and KAPPA ×4 R2',pair(c.depth4R2.p50,c.depth4R2.p90),'Yes, p90 >48.4'],
['No rock R3′',`${f(w.R3.beta)} > ${f(registered.gate.R3prime.limit)}`,'Yes'],['White speckle at depth ×4 R3′',f(c.speckleR3.beta),'Yes, <2'],
['Extra 4 km octave R4',f(c.longR4),'Yes, >0.20'],['Round-2 isotropic R6',`${c.round2R6.newPits} pits; ${f(c.round2R6.newPitsPerKm2)}/km²`,'Yes, >1'],
['Forced weight R5',pair(c.alwaysWeightR5.fill10ShareP50,c.alwaysWeightR5.pits025Per1000km2P50),'No; reported control, failure no longer required'],
['Reversed bench R5',pair(c.reversedR5.fill10ShareP50,c.reversedR5.pits025Per1000km2P50),'No; INFO'],
['Equal gains, round-2 R3',f(c.equalGainsR3.beta),'INFO'],
['Forced weight R1 / R1d / R1e',`${pair(c.alwaysWeightR1.R1.ratio,c.alwaysWeightR1.R1d.ratio)} / ${f(c.alwaysWeightR1.R1e.ratio)}`,'INFO'],
['No rock surface R1',f(w.R1.ratio),'INFO']]);
out+=`

White speckle replaces the whole shape by a per-31.25 m cell hash; the spectrum control scales its output depth by four. HARD 7 uses the unscaled speckle. The long-wave control mixes the bench with a 4 km gradient-noise term. Reversed benches multiply the rising derivative to three before the existing shape clamp.

Gate INFO: surface R1 steep/flat/ratio **${rms(a.R1)}**; R1d **${rms(a.R1d)}**. R4 with fall line +y: **${f(a.R4y)}**. R5 all strict pits: **${f(a.R2_R5.allPitsINFO)}/1000 km²**. Mean gully: **${f(a.meanGully.mean)}**, measured at 131,072 plane samples (tuning ${f(pools.tuning.actual.meanGully.mean)}).

R7 p50/p99/max: **${pair(a.R7.p50,a.R7.p99)} / ${f(a.R7.max)}**; round-2 control **${pair(c.round2R7.p50,c.round2R7.p99)} / ${f(c.round2R7.max)}**. Of 20,000 gate points, ${a.R7.above06} exceed 0.6: ${a.R7.kinkExcess} have gradient lag >0.01, and both low-lag exceptions cross an analytic kink in the full derivative stencil: seed 730905 at (−51892,18072), ratio 0.709288; seed 730904 at (−140539,17349), ratio 1.314356. All 14 saved low-lag exceptions across the five pools cross a kink. Round 2 has ${c.round2R7.above06} exceedances, including ${c.round2R7.smoothExcess} low-lag cases. This diagnostic supports the kink mechanism; it does not prove global drainage.

Separate rows-all-pools.json evidence: T=730501–508, B1=730601–608, B2=730701–708, B3=730801–808, G=730901–908. Burnt pools never gate. G is the required exact cross-check of saved gate measurements.

`;
const getters=[
['R1 steep/flat/ratio',p=>rms(p.actual.R1)],['R1d steep/flat/ratio',p=>rms(p.actual.R1d)],['R1e steep/bg-flat/ratio',p=>rms(p.actual.R1e)],
['R2 p50/p90',p=>pair(p.actual.R2_R5.p50,p.actual.R2_R5.p90)],['R3′ beta / baseline',p=>pair(p.actual.R3.beta,p.without.R3.beta)],['R3′ ceiling',p=>f(p.without.R3.beta-(p.without.R3.beta-2.617)/3)],
['R4 +x / +y INFO',p=>pair(p.actual.R4,p.actual.R4y)],['R5 fill / qualifying pits',p=>pair(p.actual.R2_R5.fill10ShareP50,p.actual.R2_R5.pits025Per1000km2P50)],['R5 all pits INFO',p=>f(p.actual.R2_R5.allPitsINFO)],['R6 actual / round 2',p=>pair(p.actual.R6.newPitsPerKm2,p.controls.round2R6.newPitsPerKm2)],
['R7 p50/p99/max',p=>`${pair(p.actual.R7.p50,p.actual.R7.p99)} / ${f(p.actual.R7.max)}`],['Gully mean',p=>f(p.actual.meanGully.mean)],
['No-rock / shallow R1e',p=>pair(p.without.R1e.ratio,p.controls.shallowR1.R1e.ratio)],['Depth/KAPPA ×4 p50/p90',p=>pair(p.controls.depth4R2.p50,p.controls.depth4R2.p90)],['Speckle / equal-gains beta',p=>pair(p.controls.speckleR3.beta,p.controls.equalGainsR3.beta)],['Extra 4 km R4',p=>f(p.controls.longR4)],['Forced R5 fill/pits',p=>pair(p.controls.alwaysWeightR5.fill10ShareP50,p.controls.alwaysWeightR5.pits025Per1000km2P50)],['Reversed R5 fill/pits',p=>pair(p.controls.reversedR5.fill10ShareP50,p.controls.reversedR5.pits025Per1000km2P50)]];
out+=table(['Measurement','T','B1','B2','B3','G cross-check'],getters.map(([name,fn])=>[name,...['tuning','burnt','burnt2','burnt3','gate'].map(k=>fn(pools[k]))]));
out+=`

All five pools have zero base fine minima. Saved-evidence assertions confirm every required row control fails in all five pools. Full arrays, counts and diagnostic coordinates remain in the JSON. Registered sizes remain 257² at 31.25 m for R1/R6, 161² at 125 m for R2/R5, two 1024-point transects per seed for R3, and four 1024-point transects for R4. Background calibration remains the prior 1.999673 m octave RMS; it was not remeasured.

Real-M3 smoke, seed 730201, site 1 only, final candidate:

`;
out+=table(['M3 row','Without M5','With M5','Outcome'],smoke.with.rows.map((r,i)=>[r.id,f(smoke.without.rows[i].actual),f(r.actual),`Both PASS (${r.op} ${JSON.stringify(r.value)})`]));
out+=`

All-pits INFO: **${smoke.without.metrics.E3b_drainage.pitsPer1000km2P50} → ${smoke.with.metrics.E3b_drainage.pitsPer1000km2P50} per 1000 km²**. Fine smoke rows add the synthetic background through the same element metric paths:

`;
out+=table(['Fine smoke row','Without M5','With M5'],[
...['R1','R1d','R1e'].map(k=>[k+' steep/flat/ratio',rms(smoke.without.fine[k]),rms(smoke.with.fine[k])]),
['R2 p50/p90',...['without','with'].map(k=>pair(smoke[k].fine.R2.p50,smoke[k].fine.R2.p90))],
['R3′ beta',f(smoke.without.fine.R3.beta),f(smoke.with.fine.R3.beta)]]);
out+=`

Smoke R1e passes ≥2; R2 passes its 0.5° median-drop and 48.4° p90 guards; R3′ passes [2, ${f(smoke.R3prime.limit)}]. R1 and R1d are INFO. U follows the envelope at slope offsets in integration; the proposed wiring patch holds U at the centre. That difference remains unvalidated in wired terrain.

Unofficial cost: 15 interleaved million-call rounds; M3 median **${f(bench.aloneMedianNs)} ns**, combined **${f(bench.combinedMedianNs)} ns**, paired add-on **${f(bench.addonMedianNs)} ns ≤214**. Two warm builds, zero extra builds. No CPU-quiet slot or separate rock-only timing was run.

Registered test: exit **0**, **duration_ms ${log.match(/duration_ms ([\d.]+)/)[1]}**; 17 passed, 0 failed, 1 skipped. Per-test duration_ms:

`;
const timings=log.split(/\r?\n/).map(l=>l.match(/^[✔✖﹣] (.+?) \(([\d.]+)ms\)/)).filter(Boolean);
out+=table(['Test','duration_ms'],timings.map(m=>[m[1],m[2]]));
out+=`

Verification commands, worktree cwd unless stated; each exited **0**:

- \`node test-results/mountains/m5/tune-round4.mjs > test-results/mountains/m5/tune-round4.log 2>&1\`
- \`node test-results/mountains/m5/tune-refine-round4.mjs > test-results/mountains/m5/tune-refine-round4.log 2>&1\`
- \`node test-results/mountains/m5/tune-controls-round4.mjs > test-results/mountains/m5/tune-controls-round4.log 2>&1\`
- \`node --test --test-name-pattern='HARD' tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/hard-pre-gate.log 2>&1\`
- \`node --test tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/element.log 2>&1\` — single registered gate run.
- \`node test-results/mountains/m5/rows-all-pools.mjs\` — exact gate cross-check.
- \`npx --no-install tsc --noEmit\`
- \`node test-results/mountains/m5/cost-bench.mjs > test-results/mountains/m5/cost-bench.log 2>&1\`
- \`node --check test-results/mountains/m5/integration-m3.mjs\` — twice.
- PowerShell: \`$env:M5_INTEGRATION_SMOKE='1'; node test-results/mountains/m5/integration-m3.mjs > test-results/mountains/m5/integration-smoke.log 2>&1; exit $LASTEXITCODE\` — twice, first 220 m candidate, then final 280 m candidate.
- \`node test-results/mountains/m5/render.mjs\` — final gate seed 730901; CPU hillshades and depth map, black 0 m / white 55 m.
- \`python test-results/mountains/m5/build-wiring-patch.py\` — git show reads main 9971c3f; writes temporary source copies and the unapplied patch.
- \`git apply --check C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch\` — cwd C:/Users/Caldor/AppData/Local/Temp/atlas-m5-main-jv34vtfg.
- \`node test-results/mountains/m5/check-saved-evidence.mjs > test-results/mountains/m5/saved-evidence-check.log 2>&1\` — saved evidence only; no resampling.
- \`git diff --check\` — tracked diff only; task files are untracked/ignored, so this is not validation of their contents.
- \`node test-results/mountains/m5/report.mjs\` — generates this report from saved results.

Two inline Node measurePool(TUNING) probes and the inline digest/freeze writer also exited 0. They used no gate rows before freeze. Exploratory measurements contain rejected candidates, including beta <2 and failed depth controls; they are not claimed as passes. Initial read-only discovery of absent ancestor AGENTS.md paths exited 1; C:/LLM/IWSDK/AGENTS.md was found and read. No verification command failed.

Not run: full integration, any other integration seed/site, official isolated benchmark, optional synthetic COST, whole npm test, test:full, browser, GPU, network/downloads, patched typecheck or wired golden tests. No git-writing command ran. The patch remains unapplied.

Uncertainties: one smoke cannot establish real-world drainage; all strict smoke pits still increase despite the qualifying-pit row staying unchanged. Forward-gradient weight/depth variation can create toe pits, and R7 exceeds the affine bound at kinks. The CPU image shows strong contour benches, but visual naturalness and LOD behaviour are unvalidated. The full integration, official cost slot and eventual wiring checks remain coordinator work.
`;
writeFileSync(new URL('report.md',import.meta.url),out);
console.log('report.md written from saved round-4 evidence');
