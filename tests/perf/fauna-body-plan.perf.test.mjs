import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCreatureGenome, individualCreatureGenome } from '../../src/creature-model.ts';
import {
  buildQuadrupedBody, quadrupedBodyBuildSteps, createQuadrupedPlan, quadrupedBodyDistance,
  QUADRUPED_BONE_NAMES, QUADRUPED_BONE_PARENTS, BONE,
} from '../../src/fauna-body-plan.ts';

test('the resumable build stays within the step timing cap', () => {
  const genome = generateCreatureGenome('STEPPED', 'runner'), steps = quadrupedBodyBuildSteps(genome);
  let result, yields = 0, longest = 0;
  for (;;) { const t = performance.now(), next = steps.next(); longest = Math.max(longest, performance.now() - t); if (next.done) { result = next.value; break; } yields++; }
  assert.ok(longest < 250, `longest step ${longest.toFixed(1)} ms`);
});
