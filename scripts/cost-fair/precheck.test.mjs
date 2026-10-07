// Unit tests for the O5 fair-protocol pre-check classification and the batch slot check (no live slot, no processes
// sampled). Not registered in package.json scripts.test (owned by the runner lane); run:
//   node --test scripts/cost-fair/precheck.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir, hostname} from 'node:os';
import {classify, strongName, CPU_ACTIVE_FRAC} from './precheck.mjs';
import {slotHolding} from './slot-held.mjs';

const py = {pid: 101, name: 'python.exe'}, chrome = {pid: 102, name: 'chrome.exe'}, node = {pid: 103, name: 'node.exe'};
const m = frac => ({state: 'measured', frac});
const base = {gpu: [], idleFrac: 0.95, shared: []};

test('an idle NEW python (the 55-min case of GATE-1) is recorded as quiet and does not count', () => {
  const c = classify({...base, heavy: [py], cpu: new Map([[101, m(0)]])});
  assert.deepEqual(c.reasons, []);
  assert.equal(c.quiet.length, 1);
  assert.equal(c.active.length, 0);
});
test('a NEW strong process above 5 % of one CPU counts; exactly 5 % does not (">5 %")', () => {
  assert.match(classify({...base, heavy: [py], cpu: new Map([[101, m(0.2)]])}).reasons.join(), /new strong contender active.*101 python\.exe 20\.0%/);
  assert.deepEqual(classify({...base, heavy: [py], cpu: new Map([[101, m(CPU_ACTIVE_FRAC)]])}).reasons, []);
  assert.equal(classify({...base, heavy: [chrome], cpu: new Map([[102, m(0.051)]])}).active.length, 1);
});
test('fail closed: unreadable CPU time, a missing sample or a failed sampler counts; an exited process is gone', () => {
  assert.equal(classify({...base, heavy: [py], cpu: new Map([[101, {state: 'unknown'}]])}).active.length, 1);
  assert.equal(classify({...base, heavy: [py], cpu: new Map()}).active.length, 1);
  assert.equal(classify({...base, heavy: [py], cpu: null}).active.length, 1);
  const g = classify({...base, heavy: [py], cpu: new Map([[101, {state: 'gone'}]])});
  assert.deepEqual(g.reasons, []);
  assert.equal(g.gone.length, 1);
});
test('baseline processes and non-strong names (node.exe) never count, whatever their CPU', () => {
  assert.deepEqual(classify({...base, heavy: [py], basePids: new Set([101]), cpu: new Map([[101, m(0.9)]])}).reasons, []);
  assert.deepEqual(classify({...base, heavy: [node], cpu: new Map([[103, m(0.9)]])}).reasons, []);
  assert.equal(strongName('pythonw.exe'), true);
  assert.equal(strongName('node.exe'), false);
});
test('host idle below 85 %, shared holders and a new GPU contender are reasons (unchanged rules)', () => {
  assert.match(classify({...base, heavy: [], idleFrac: 0.84}).reasons.join(), /host idle 84\.0%/);
  assert.deepEqual(classify({...base, heavy: [], idleFrac: 0.85}).reasons, []);
  assert.match(classify({...base, heavy: [], shared: ['x.json']}).reasons.join(), /shared holders x\.json/);
  assert.match(classify({...base, heavy: [], gpu: [{pid: 7, name: 'python.exe', class: 'contender'}]}).reasons.join(), /new GPU contender/);
  assert.deepEqual(classify({...base, heavy: [], gpu: [{pid: 7, name: 'python.exe', class: 'contender'}], baseGpuPids: new Set([7])}).reasons, []);
});
test('slotHolding: exclusive owner with our token, shared holder, stale/dead/foreign token, no token', () => {
  const dir = `${mkdtempSync(`${tmpdir()}/cf-slot-`)}/slot`;
  try {
    const tok = '11111111-2222-4333-8444-555555555555', alive = () => true, dead = () => false;
    assert.equal(slotHolding({env: {}, dir}).state, 'none');
    mkdirSync(dir);
    writeFileSync(`${dir}/owner.txt`, JSON.stringify({name: 'batch', pid: process.pid, host: hostname(), token: tok}));
    assert.equal(slotHolding({env: {ATLAS_TEST_SLOT_TOKEN: tok}, dir, alive}).state, 'exclusive');
    assert.equal(slotHolding({env: {ATLAS_TEST_SLOT_TOKEN: tok}, dir, alive: dead}).state, 'none');
    assert.equal(slotHolding({env: {ATLAS_TEST_SLOT_TOKEN: tok}, dir, alive, host: 'elsewhere'}).state, 'none');
    assert.equal(slotHolding({env: {ATLAS_TEST_SLOT_TOKEN: 'aaaaaaaa-2222-4333-8444-555555555555'}, dir, alive}).state, 'none');
    rmSync(dir, {recursive: true});
    mkdirSync(`${dir}.shared`);
    writeFileSync(`${dir}.shared/${tok}.json`, JSON.stringify({name: 'npm test', pid: process.pid, host: hostname(), token: tok, class: 'shared', tokens: 16}));
    assert.equal(slotHolding({env: {ATLAS_TEST_SLOT_TOKEN: tok}, dir, alive}).state, 'shared');
  } finally { rmSync(dir.replace(/\/slot$/, ''), {recursive: true, force: true}); }
});
