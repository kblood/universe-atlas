import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as planet from '#creature-kit/planet';
import * as genome from '../src/creature-model.ts';
import * as body from '../src/fauna-body-plan.ts';
import * as pose from '../src/fauna-locomotion.ts';
import {planetCoreCorpus} from './helpers/planet-core-corpus.mjs';
test('Atlas canonical compatibility paths call the actual built kit planet entry',()=>{
  assert.equal(genome.generateCreatureGenome,planet.generateCreatureGenome);
  assert.equal(genome.realisticIndividualCreatureGenome,planet.realisticIndividualCreatureGenome);
  assert.equal(body.buildQuadrupedBody,planet.buildQuadrupedBody);
  assert.equal(pose.quadrupedPoseAt,planet.quadrupedPoseAt);
});
test('built kit preserves the pre-extraction Atlas identity/geometry/appearance/pose corpus',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/planet-core-f96a8c1.json',import.meta.url),'utf8'));
  assert.equal(fixture.sourceAtlasCommit,'f96a8c1');assert.deepEqual(planetCoreCorpus(planet),fixture.outputs);
});
