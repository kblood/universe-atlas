// LOD ladder consistency contract (docs/lod-ladder-contract-v1.md, P3-LOD-CONTRACT).
//
// For Maithea and Lethuris, 12 stratified edge tiles (3 each: snowline, treeline, coast, range) per level
// pair L6->7, L8->9, L10->11, L12->13, L14->15: the coarse lattice, bilinear at the child lattice, against
// the child, judged with plan.lodLadder.tolerances_after_relief (src/lod-ladder.ts LOD_TOLERANCES).
//
// Tolerances that shipped terrain does not meet yet are NOT silently loosened: those rows assert a
// pinned ceiling (SHIPPED_CEILINGS) measured on shipped terrain with this package applied, so any
// regression fails, and P4 (relief calibration) replaces each ceiling by the plan tolerance once its
// AFTER column meets it. Colour, snow, forest and the carried biome name are computed from point samples
// that this package does not change; the re-classified name proxy (classifier re-run at the coarse
// interpolated height) moves with the peak correction and is pinned at its measured value.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as tiles from '../src/planet-tiles.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {waterWorlds} from './terrain-climate-fixtures.mjs';
import {
  LOD_LADDER_VERSION, LOD_TOLERANCES, SEABED_DETAIL_POLICY, ladderFor, ladderIdForLevel, levelForPose,
  peakCorrectionMaxLevel, seabedDistanceM, seabedLadderId, tileEdgeM, contactLevelFor, fineContactLevelFor,
} from '../src/lod-ladder.ts';
import {crossPair, newCrossAcc, summariseCross, retentionTile, newRetentionAcc, summariseRetention, tileDigest} from '../scripts/lod-consistency-report.mjs';
// Owner decision (e) 2026-10-05: the tile selection is FROZEN (the directions main 39e2448 picked), so a terrain
// change can no longer re-pick tiles and move a pin; see the fixture header for how it was recorded.
import {FROZEN_STRATIFIED, FROZEN_MAITHEA_RETENTION_EDGES, FROZEN_SELECTION_SOURCE} from './helpers/lod-frozen-selection.mjs';
import {pick, tierNote} from './helpers/tier.mjs';

const m={...tiles,terrainSampler,biomeClassifier,waterWorlds};
const PAIRS=[6,8,10,12,14];
// Tier (docs/test-tiers-2026-10-07.md): every pair is asserted on its own over all 12 tiles, so a subset of PAIRS keeps each
// check exact (the per-pair p99 and disagreement percentages are not subsampled). default = PAIRS.
const TIER_PAIRS=pick({smoke:[6,14],work:[6,10,14],default:PAIRS});
const bodies=Object.fromEntries(waterWorlds().map(b=>[b.name,b]));

/** Pinned ceilings (percent, RGB) for rows the terrain does not meet yet; each value is the measurement on
 * the 12 stratified tiles rounded UP to 0.1. A level absent here must meet the plan tolerance itself.
 *
 * RE-PINNED by P4-RELIEF r2 (terrain-1.8.0-relief, R-CAL-1) from the AFTER column of
 * test-results/relief-round-2026-10-03/P4-RELIEF/lod-stratified.txt (re-measured by this test on the relief
 * HEAD). tolerances_after_relief is NOT met at L6/L8 (colour p99 <= 12 / 4, class rows <= 0.5%); these
 * ceilings are a documented LOD exception, not the plan tolerance. Every cell is tightened or dropped except
 * ONE: Lethuris L6 `name` (the re-classified proxy) 6.87 -> 6.99%, ceiling 6.9 -> 7.0 (+0.1). That single
 * loosened cell is an explicit exception PENDING OWNER ACCEPTANCE (the carried name on the same tiles
 * improves 8.88 -> 8.15%). Maithea L10 now meets the plan tolerance in every row (ceiling removed).
 * OLD (shipped terrain-1.7.0 + P3, 2026-10-03):
 *   Maithea  6:{rgbP99:37.2,snow:1.7,forest:4.3,name:6.2,carriedName:7.6} 8:{rgbP99:5.8,snow:.9,forest:1.7,name:3.6,carriedName:3.8}
 *            10:{forest:.9,carriedName:1.0}
 *   Lethuris 6:{rgbP99:56.7,snow:5.1,forest:5.0,name:6.9,carriedName:8.9} 8:{rgbP99:14.3,snow:1.5,forest:2.9,name:3.8,carriedName:4.2}
 *            10:{rgbP99:1.8,forest:1.1,name:2.7,carriedName:2.7}
 * NEW measured (relief): Maithea L6 rgb 26.26 snow 1.25 forest .42 name 3.16 carried 3.49; L8 rgb 3.55 snow .31
 *   forest .01 name .76 carried 1.17; L10 rgb .47 snow .24 forest .15 name 0 carried .19. Lethuris L6 rgb 39.17
 *   snow 2.12 forest 1.76 name 6.99 carried 8.15; L8 rgb 11.05 snow .96 forest 2.17 name 1.85 carried 1.65;
 *   L10 rgb .92 snow .15 forest .64 name .43 carried .25.
 *
 * RE-PINNED by R5-ATLAS-CLIMATE-M1 (surface-climate-2, climate-m1-decision-2 (b), 2026-10-08; Opus-decided on Kasper's
 * instruction, overrulable). The heights, height max, ocean and shared-ocean rows are identical to main 290472d at
 * every level (gate G1), so every row below moved through the climate fields (snow, forest, class), not the terrain.
 * Each failing row is re-pinned at its measured value rounded UP to 0.1; LOD_TOLERANCES is unchanged (the plan
 * tolerances stay goals, owner sheet A3). Per-step bisect: test-results/climate-m1/resume/lod-bisect.json; the cause
 * named is the climate step from which the row fails at every later step (first failing step in brackets if earlier).
 *   Maithea  L6  rgbP99 26.3 -> 43.1 (43.013, step 1 PDD snow)      snow 1.3 -> 1.5 (1.478, step 1 PDD snow)
 *                forest plan 0.5 -> 1.9 (1.848, step 5 PET moisture)  name 3.2 -> 4.0 (3.988, step 5 PET [step 1])
 *                carriedName 3.5 -> 4.4 (4.383, step 5 PET [step 1])
 *   Maithea  L8  rgbP99 plan 4 -> 5.8 (5.750, step 1 PDD snow)        forest plan 0.5 -> 0.7 (0.694, step 5 PET)
 *                name 0.8 -> 1.3 (1.264, step 2 warm-column lapse)    carriedName 1.2 -> 1.4 (1.333, step 5 PET)
 *   Lethuris L6  rgbP99 39.2 -> 58.1 (58.058, step 1 PDD snow)        forest 1.8 -> 3.4 (3.327, step 1 PDD snow)
 *   Lethuris L8  rgbP99 11.1 -> 15.3 (15.212, step 2 warm lapse)      snow 1.0 -> 1.1 (1.042, step 2 warm lapse)
 *                forest 2.2 -> 2.5 (2.472, step 2 warm lapse)         name 1.9 -> 2.5 (2.458, step 1 PDD snow)
 *                carriedName 1.7 -> 3.0 (2.958, step 1 PDD snow)
 *   Lethuris L10 rgbP99 plan 1 -> 1.3 (1.276, step 1 PDD snow)        forest 0.7 -> 0.9 (0.861, step 2 warm lapse)
 *                name plan 0.5 -> 1.0 (0.944, step 1 PDD snow)        carriedName plan 0.5 -> 1.0 (0.917, step 1 PDD snow)
 * Unchanged cells: Maithea L10-L14 and Lethuris L12-L14 meet the plan tolerance; Lethuris L6 snow 2.125, name 6.494
 * and carriedName 7.763 stay under their old ceilings. Follow-up (LOD owner / A4): carry snow and forest edges
 * across levels, or blend colour across levels (docs/surface-climate-v2.md section 6b). */
const SHIPPED_CEILINGS={
  Maithea:{
    6:{rgbP99:43.1,snow:1.5,forest:1.9,name:4.0,carriedName:4.4},
    8:{rgbP99:5.8,forest:.7,name:1.3,carriedName:1.4},
  },
  Lethuris:{
    6:{rgbP99:58.1,snow:2.2,forest:3.4,name:7.0,carriedName:8.2},
    8:{rgbP99:15.3,snow:1.1,forest:2.5,name:2.5,carriedName:3.0},
    10:{rgbP99:1.3,forest:.9,name:1.0,carriedName:1.0},
  },
};
/** Pinned retention limits (percent) for coarse-keep rows the terrain does not meet yet; the plan's coarseKeeps
 * (LOD_TOLERANCES, 98 % snow at L6) stay the tracked target. Maithea L6 snow kept: 99.04 % on main 290472d ->
 * 95.26 % under surface-climate-2 (step 1 PDD snow: the snow edge in height is ~100 m wide instead of ~900 m), pinned
 * at the measured value rounded DOWN to 0.1 (R5-ATLAS-CLIMATE-M1, climate-m1-decision-2 (b)). */
const SHIPPED_RETENTION={Maithea:{snowL6:95.2}};

test('ladder lod-ladder-2: rung ranges, pose mapping and the seabed distance policy',()=>{
  assert.equal(LOD_LADDER_VERSION,'lod-ladder-4','lod-ladder-4: M5 riser reduction (docs/mountain-riser-lod-2026-10-07.md), tolerances unchanged; was lod-ladder-1 (P3); lod-ladder-2 adds the declared M3 carving reduction (mountains cost plan T3), every tolerance unchanged');
  const R=bodies.Maithea.radiusM,rungs=ladderFor(R);
  assert.deepEqual(rungs.map(r=>[r.id,...r.levels]),[['S0',0,4],['S1',5,9],['S2',10,14],['S3',15,contactLevelFor(R)],['S4',contactLevelFor(R)+1,fineContactLevelFor(R)]]);
  assert.equal(contactLevelFor(R),18);assert.equal(fineContactLevelFor(R),22);
  assert.equal(peakCorrectionMaxLevel(R),9,'peak correction ends with the last S1 level');
  for(const b of Object.values(bodies)){
    const r=ladderFor(b.radiusM);
    for(let i=1;i<r.length;i++)assert.equal(r[i].levels[0],r[i-1].levels[1]+1,`${b.name}: rungs tile the level range`);
    assert.equal(ladderIdForLevel(b.radiusM,peakCorrectionMaxLevel(b.radiusM)),'S1');
    assert.equal(ladderIdForLevel(b.radiusM,peakCorrectionMaxLevel(b.radiusM)+1),'S2');
    assert.ok(tileEdgeM(b.radiusM,peakCorrectionMaxLevel(b.radiusM)+1)<=10_000);
  }
  // Slant distance decides; nearer is never coarser.
  const order={S0:0,S1:1,S2:2,S3:3,S4:4};
  assert.equal(levelForPose(R,3e7,0),'S0');assert.equal(levelForPose(R,20_000,0),'S1');assert.equal(levelForPose(R,1.7,1000),'S2');
  assert.equal(levelForPose(R,1.7,100),'S3');assert.equal(levelForPose(R,1.7,1),'S4');
  let last=-1;for(const d of [2e7,1e6,1e5,6000,5999,500,499,3,2.9,0]){const k=order[levelForPose(R,0,d)];assert.ok(k>=last);last=k;}
  // Owner decision: seabed detail by distance to the seabed, never by water thickness; up to 16 km deep.
  assert.equal(SEABED_DETAIL_POLICY.rule,'distance-to-seabed');assert.equal(SEABED_DETAIL_POLICY.waterThicknessCapM,null);
  assert.equal(SEABED_DETAIL_POLICY.maxSeabedDepthM,16_000);
  assert.equal(seabedDistanceM(0,-16_000,0),16_000);
  assert.equal(seabedLadderId(R,1.7,-16_000,0),'S1','a 16 km deep seabed seen from the surface is far terrain');
  assert.equal(seabedLadderId(R,1.7,-4000,0),'S2');
  assert.equal(seabedLadderId(R,-15_999,-16_000,.5),'S4','a diver at the bottom gets full detail, whatever the water above');
});

for(const name of ['Maithea','Lethuris'])test(`${name}: 12 stratified edge tiles meet the cross-level contract at L6->7 ... L14->15`,t=>{
  if(TIER_PAIRS!==PAIRS)t.diagnostic(tierNote(`pairs ${TIER_PAIRS.map(L=>`L${L}->${L+1}`).join(', ')}`));
  const body=bodies[name],ts=terrainSampler(body),cls=biomeClassifier(body),picks=FROZEN_STRATIFIED[name];
  assert.deepEqual(FROZEN_SELECTION_SOURCE,{commit:'39e2448',terrainVersion:'terrain-1.8.1-grain'});
  for(const [kind,dirs] of Object.entries(picks))assert.equal(dirs.length,3,`${name}: three ${kind} tiles`);
  const dirs=Object.values(picks).flat(),tol=LOD_TOLERANCES;
  for(const L of TIER_PAIRS){
    const acc=newCrossAcc(true);for(const d of dirs)crossPair(m,body,ts,cls,d,L,acc);
    const s=summariseCross(acc),edge=tileEdgeM(body.radiusM,L),cap=SHIPPED_CEILINGS[name][L]||{},where=`${name} L${L}->${L+1}`;
    const limit=(key,planValue)=>Math.max(planValue,cap[key]??planValue);
    assert.ok(s.p99<=tol.heightP99M(edge),`${where}: height p99 ${s.p99.toFixed(1)} <= ${tol.heightP99M(edge).toFixed(0)} m`);
    assert.ok(s.max<=tol.heightMaxM(edge),`${where}: height max ${s.max.toFixed(1)} <= ${tol.heightMaxM(edge).toFixed(0)} m`);
    assert.equal(s.sharedOceanMismatch,0,`${where}: ocean flag identical on all ${s.shared} shared vertices (coastline invariance)`);
    assert.ok(s.ocean<=100*tol.classDisagreement,`${where}: ocean disagreement ${s.ocean.toFixed(2)}% <= 0.5%`);
    assert.ok(s.rgbP99<=limit('rgbP99',tol.colourP99(L)),`${where}: RGB p99 ${s.rgbP99.toFixed(2)}`);
    for(const key of ['snow','forest','name','carriedName'])
      assert.ok(s[key]<=limit(key,100*tol.classDisagreement),`${where}: ${key} disagreement ${s[key].toFixed(2)}% <= ${limit(key,100*tol.classDisagreement)}%`);
  }
});

test('Maithea coarse retention: peak area kept, summit loss, snow and forest (plan edge-tile selection)',()=>{
  // The plan's own edge selection (snowline .2-.95 or forest potential), frozen as picked on main 39e2448. K=32: at K=16 the L6 peak-area
  // figure is 84.99%, a statistical tie with the 85% target, so the larger sample decides (85.16%).
  const body=bodies.Maithea,ts=terrainSampler(body),cls=biomeClassifier(body),dirs=FROZEN_MAITHEA_RETENTION_EDGES,keeps=LOD_TOLERANCES.coarseKeeps;
  const at=L=>{const a=newRetentionAcc();for(const d of dirs)retentionTile(m,body,ts,cls,d,L,a);return summariseRetention(a);};
  const l6=at(6),l8=at(8);
  assert.ok(l6.peakKept>=100*keeps.peakAreaL6,`L6 peak area kept ${l6.peakKept.toFixed(2)}% >= 85% (shipped 70.9%)`);
  assert.ok(l8.peakKept>=100*keeps.peakAreaL8,`L8 peak area kept ${l8.peakKept.toFixed(2)}% >= 95% (shipped 91.2%)`);
  assert.ok(l6.summitP50<=120&&l6.summitMax<=400,`L6 summit loss ${l6.summitP50.toFixed(0)}/${l6.summitMax.toFixed(0)} m <= 120/400 m (shipped 205/661)`);
  assert.ok(l6.metaSummitP50<=l6.summitP50&&l6.metaSummitMax<=l6.summitMax,'metadata maxH (C2) bounds the summit at least as well as the stored lattice');
  assert.ok(l6.snowKept>=Math.min(100*keeps.snowL6,SHIPPED_RETENTION.Maithea.snowL6),`L6 snow kept ${l6.snowKept.toFixed(2)}% >= ${SHIPPED_RETENTION.Maithea.snowL6}% (target ${100*keeps.snowL6}%)`);
  assert.ok(l6.forestKept>=100*keeps.forestL6,`L6 forest kept ${l6.forestKept.toFixed(1)}%`);
});

test('coarse heights are a declared reduction: point sample plus a bounded non-negative correction',()=>{
  for(const name of ['Maithea','Lethuris']){
    const body=bodies[name],ts=terrainSampler(body),n=tiles.PATCH_SEGMENTS,maxL=peakCorrectionMaxLevel(body.radiusM);
    const range=FROZEN_STRATIFIED[name].range[0];
    for(const L of [4,maxL,maxL+1]){
      const tile=tiles.directionTile(range,L),data=tiles.buildTile(body,tile);
      let raised=0;
      for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
        const p=ts(tiles.tileDirection(tile,x/n,y/n)).groundHeightM,h=data.surfaceHeight[y*(n+1)+x];
        // Float32 storage: compare with the stored precision of p itself.
        const pf=Math.fround(p);
        if(L>maxL||(p<0&&body.water)){assert.equal(h,pf,`${name} L${L}: point sample stored`);continue;}
        assert.ok(h>=pf,`${name} L${L}: correction never lowers a vertex`);
        // Bounded by the highest of the vertex and its four cell centres.
        let top=p;for(const [dx,dy] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]])top=Math.max(top,ts(tiles.tileDirection(tile,(x+dx)/n,(y+dy)/n)).groundHeightM);
        assert.ok(h<=Math.fround(top),`${name} L${L}: correction bounded by the local max`);
        if(h>pf)raised++;
      }
      if(L<=maxL)assert.ok(raised>0,`${name} L${L}: correction active`);else assert.equal(raised,0);
    }
  }
});

test('morph: a child starts exactly on its corrected parent at every co-located node',()=>{
  const body=bodies.Maithea,n=tiles.PATCH_SEGMENTS,maxL=peakCorrectionMaxLevel(body.radiusM),ts=terrainSampler(body);
  const range=FROZEN_STRATIFIED.Maithea.range[0];
  for(const L of [7,maxL,maxL+1]){
    const child=tiles.directionTile(range,L),parent={face:child.face,level:L-1,x:child.x>>1,y:child.y>>1};
    const c=tiles.buildTile(body,child),p=tiles.buildTile(body,parent),ox=(child.x&1)*n/2,oy=(child.y&1)*n/2;
    let worst=0;
    for(let y=0;y<=n;y+=2)for(let x=0;x<=n;x+=2){const ci=y*(n+1)+x,pi=(oy+y/2)*(n+1)+ox+x/2;
      const d=[0,1,2].map(j=>(c.parents[ci*3+j]+c.anchor[j])-(p.positions[pi*3+j]+p.anchor[j]));worst=Math.max(worst,Math.hypot(...d)*body.radiusM);}
    assert.ok(worst<.05,`L${L}: child morph start vs parent vertex ${worst.toFixed(4)} m`);
  }
});

const DIGEST_TILES=[['Maithea',[.3,.8,-.52],[0,6,9,10,14,18]],['Lethuris',[-.6,.1,.79],[3,6,10,11,15]]];

test('determinism: bit-identical rebuilds, independent of visit order and of process',()=>{
  const forward=tileDigest(m,DIGEST_TILES,'forward');
  assert.equal(tileDigest(m,DIGEST_TILES,'reverse'),forward,'same process, reverse visit order');
  const report=new URL('../scripts/lod-consistency-report.mjs',import.meta.url).href,root=new URL('../',import.meta.url).href;
  const code=`const R=await import(${JSON.stringify(report)});const m=await R.loadCheckout(${JSON.stringify(root)});console.log('DIGEST '+R.tileDigest(m,${JSON.stringify(DIGEST_TILES)},'reverse'));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:120_000});
  const line=(child.stdout||'').split(String.fromCharCode(10)).map(l=>l.trim()).find(l=>l.startsWith('DIGEST '));
  assert.ok(line,`child process produced a digest (status ${child.status}; ${(child.stderr||'').slice(0,400)})`);
  assert.equal(line.slice(7).trim(),forward,'cold process, reverse visit order');
});
