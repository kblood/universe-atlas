import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCreatureGenome, realisticIndividualCreatureGenome } from '../src/creature-model.ts';
import { createQuadrupedPlan } from '../src/fauna-body-plan.ts';
import { appendFaunaStructuralFeatures } from '../src/fauna-structural-appendages.ts';
import { createFaunaSkinInspector } from '../src/fauna-skin-inspector.ts';
import { faunaMotionTraits } from '../src/fauna-locomotion.ts';

test('structural appendages have closed outward-wound finite surfaces within a fixed budget', () => {
  for (const family of ['proboscidean', 'winged']) for (const stage of ['adult', 'juvenile']) {
    const genome = realisticIndividualCreatureGenome(generateCreatureGenome('STRUCTURAL', 'browser'), 'subject', 1, stage, family);
    const plan = createQuadrupedPlan(genome), p = [], ix = [];
    const extra = appendFaunaStructuralFeatures(plan, p, ix);
    assert.equal(extra.colors.length, p.length / 3);
    assert.equal(extra.bones.length, p.length / 3);
    assert.ok(ix.length > 0 && ix.length / 3 < 1200);
    assert.ok(p.every(Number.isFinite));
    assert.ok(extra.colors.flat().every(c => Number.isFinite(c) && c >= 0 && c <= 1));
    assert.ok(extra.bones.every(b => b === (family === 'proboscidean' ? 6 : 3)));
    const edges = new Map(); let volume = 0;
    for (let t = 0; t < ix.length; t += 3) {
      const [a, b, c] = ix.slice(t, t + 3);
      for (const [x, y] of [[a,b],[b,c],[c,a]]) {
        const key = x < y ? `${x}/${y}` : `${y}/${x}`;
        const e = edges.get(key) || {count:0, direction:0};
        e.count++; e.direction += x < y ? 1 : -1; edges.set(key, e);
      }
      const A=p.slice(a*3,a*3+3), B=p.slice(b*3,b*3+3), C=p.slice(c*3,c*3+3);
      volume += (A[0]*(B[1]*C[2]-B[2]*C[1])+A[1]*(B[2]*C[0]-B[0]*C[2])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6;
    }
    assert.ok([...edges.values()].every(e=>e.count===2 && e.direction===0), `${family}: closed consistent winding`);
    assert.ok(volume > 0, `${family}: positive volume ${volume}`);
    const againP=[], againI=[];
    assert.deepEqual(appendFaunaStructuralFeatures(plan,againP,againI),extra);
    assert.deepEqual(againP,p); assert.deepEqual(againI,ix);
  }
});

test('inspection pose selection replays and structurally different animals keep their feet grounded', () => {
  for (const family of ['ungulate','cursorial','padded','long-neck','proboscidean','winged']) {
    const genome=realisticIndividualCreatureGenome(generateCreatureGenome('INSPECTION','browser'),'subject',0,'adult',family);
    for (const pose of ['idle','walk','feed']) {
      const rig=createFaunaSkinInspector(genome,`inspection/${family}`,{pose});
      try {
        const a=rig.update(3,'idle','flat'); rig.update(8,'idle','flat');
        assert.deepEqual(rig.update(3,'idle','flat'),a);
        assert.equal(a.gait,pose==='walk'?'walk':'idle');
        assert.ok(a.maxPenetration<.012,`${family}/${pose} penetration ${a.maxPenetration}`);
        assert.ok(a.maxReachError<genome.legLength*.06,`${family}/${pose} reach ${a.maxReachError}`);
        assert.ok(a.feet.every(f=>f.position.every(Number.isFinite)));
      } finally {rig.dispose();}
    }
  }
});

test('breathing and idle motion use stable individual channels and scale with anatomy',()=>{
  const adult=createQuadrupedPlan(realisticIndividualCreatureGenome(generateCreatureGenome('BREATH','browser'),'subject',0));
  const young=createQuadrupedPlan(realisticIndividualCreatureGenome(generateCreatureGenome('BREATH','browser'),'subject',0,'juvenile'));
  const a=faunaMotionTraits(adult,'A'), b=faunaMotionTraits(adult,'B');
  assert.deepEqual(a,faunaMotionTraits(adult,'A'));
  assert.notEqual(a.breathPhase,b.breathPhase);
  assert.notEqual(a.tailPhase,b.tailPhase);
  assert.ok(faunaMotionTraits(young,'A').breathM<a.breathM);
});
