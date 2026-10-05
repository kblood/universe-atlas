// Mountains assembly (MTN-6, step A, docs/mountains-assembly-2026-10-05.md): M1 orogen layout + M2 massif
// envelope (massif-envelope-2) + M3 fixed-width carving wired into the relief floor's ridge term.
//
// HARD identity: the field outside every massif is bit-identical to main before the assembly. The digests were
// computed FIRST on unmodified main 39e2448 (terrain-1.8.1-grain) with this file's own selection rule
// (test-results/mountains/assembly-2/identity-pins-on-main.mjs reads main's src/terrain.ts read-only), and are
// literals here, never recomputed from the branch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainSampler} from '../src/terrain.ts';
import {identityDigest, outsideBelt, outsideMassif} from './helpers/mountain-assembly-identity.mjs';

const MAIN_DIGESTS = {
  outsideBelt: {heights: 'a7000ad60afb60709e7b7621ea8f573a003a712170f016467ea930a4e7e63d7b',
    colour: 'e04aa67d90a7950f4924c468d03b78c00c23bb762614f28184de239c913940ea',
    counts: {Maithea: 3869, Selawyn: 3935, Raiva: 3970, Lethuris: 3939}},
  outsideMassif: {heights: 'e26e77d3abd8ca436dd5e90553d55e2ad3bdf272900545e1add56b9bd54fd024',
    colour: '35a334d2c174dd99fecd3848c48b3779c2e4dd5154d6b596cd728acd70c8f4b0',
    counts: {Maithea: 3997, Selawyn: 4039, Raiva: 4025, Lethuris: 4039}},
};

for (const [label, select] of [['outsideBelt', outsideBelt], ['outsideMassif', outsideMassif]])
  test(`HARD: ${label} directions (4096 per water world) are bit-identical to main: heights, ocean and colour`, () => {
    const pin = MAIN_DIGESTS[label], h = identityDigest(terrainSampler, {select}), c = identityDigest(terrainSampler, {select, colour: true});
    assert.deepEqual(h.counts, pin.counts);
    assert.equal(h.sha, pin.heights);
    assert.equal(c.sha, pin.colour);
  });
