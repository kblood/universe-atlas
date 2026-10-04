// VISUAL-ADVISORY vote logic with a fake judge: no Luna/Codex call, no images read.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVerdict, tally, parseDiagnosis, aggregateDiagnoses, voteImage, runControls, applyCalibration,
  validateManifest, LunaUnavailable } from '../scripts/luna-vote.mjs';

/** Scripted judge: per image a queue of vote answers; diagnosis prompts get the image's diagnosis queue. */
function fakeJudge(script) {
  const calls = [];
  const judge = async (prompt, image) => {
    calls.push({ image, diagnosis: prompt.includes('Answer in exactly these five lines') });
    const s = script[image];
    const queue = calls.at(-1).diagnosis ? s.diag : s.votes;
    const next = queue.shift();
    return next === null ? { ok: false, error: 'offline' } : { ok: true, text: next };
  };
  return { judge, calls };
}
const V = (v) => `Looks like this.\nVERDICT: ${v}`;
const D = (el, amb = 'none') => `REASON: peaks are bare\nELEMENT: ${el}\nEXPECTED: white caps above 3 km\nCONFIDENCE: high\nAMBIGUITY: ${amb}`;

test('verdict parsing and strict-majority tally', () => {
  assert.equal(parseVerdict('blah\nVERDICT: fail\n'), 'FAIL');
  assert.equal(parseVerdict('VERDICT: PASS ... changed mind\nVERDICT: **FAIL**'), 'FAIL');
  assert.equal(parseVerdict('I think it passes'), 'UNCLEAR');
  assert.deepEqual(tally(['PASS', 'PASS', 'FAIL']), { status: 'PASS', pass: 2, fail: 1, unclear: 0, asks: 3 });
  assert.equal(tally(['FAIL', 'FAIL', 'PASS']).status, 'FAIL');
  assert.equal(tally(['PASS', 'FAIL', 'UNCLEAR']).status, 'UNSTABLE');
  assert.equal(tally(['PASS', 'PASS', 'FAIL', 'FAIL']).status, 'UNSTABLE');
});

test('PASS asks no diagnosis; FAIL and UNSTABLE are diagnosed and aggregated', async () => {
  const { judge, calls } = fakeJudge({
    good: { votes: [V('PASS'), V('PASS'), V('FAIL')], diag: [] },
    bad: { votes: [V('FAIL'), V('FAIL'), V('PASS')], diag: [D('snow line'), D('snow line'), D('haze/clouds', 'unclear what "snow" covers')] },
    split: { votes: [V('PASS'), V('FAIL'), 'no verdict'], diag: [D('Snow line')] },
  });
  const good = await voteImage({ judge, question: 'Snowy peaks?', image: 'good' });
  assert.equal(good.status, 'PASS');
  assert.equal(good.diagnosis, undefined);
  assert.equal(calls.filter((c) => c.diagnosis).length, 0);

  const bad = await voteImage({ judge, question: 'Snowy peaks?', image: 'bad', diagnoseAsks: 3 });
  assert.equal(bad.status, 'FAIL');
  assert.deepEqual(bad.diagnoses[0], { reason: 'peaks are bare', element: 'snow line', expected: 'white caps above 3 km', confidence: 'high', ambiguity: '' });
  assert.equal(bad.diagnosis.mostCommonElement, 'snow line');
  assert.deepEqual(bad.diagnosis.elementCounts, { 'snow line': 2, 'haze/clouds': 1 });
  assert.ok(bad.diagnosis.flags.some((f) => f.startsWith('element disagreement')));
  assert.ok(bad.diagnosis.flags.some((f) => f.startsWith('question possibly ambiguous (1 of 3')));

  const split = await voteImage({ judge, question: 'Snowy peaks?', image: 'split' });
  assert.equal(split.status, 'UNSTABLE');
  assert.equal(split.unclear, 1);
  assert.equal(split.diagnosis.mostCommonElement, 'snow line'); // case-insensitive element match
  assert.deepEqual(split.diagnosis.flags, []);
});

test('fewer than 3 answered asks = Luna unavailable (exit 2 path), never a verdict', async () => {
  const { judge } = fakeJudge({ x: { votes: [V('FAIL'), null, V('FAIL'), null], diag: [] } });
  await assert.rejects(voteImage({ judge, question: 'q', image: 'x' }), LunaUnavailable);
  const { judge: j2 } = fakeJudge({ x: { votes: [V('FAIL'), null, V('FAIL'), V('FAIL')], diag: [D('other: fog')] } });
  const r = await voteImage({ judge: j2, question: 'q', image: 'x', asks: 4 });
  assert.equal(r.status, 'FAIL');
  assert.equal(r.errors.length, 1);
  assert.equal(r.diagnosis.mostCommonElement, 'other: fog');
  await assert.rejects(voteImage({ judge: j2, question: 'q', image: 'x', asks: 2 }), /asks must be >= 3/);
});

test('controls: failing a known-good control marks the question UNCALIBRATED and its FAILs uncitable', async () => {
  const manifest = {
    id: 'snow', elements: ['snow line', 'haze/clouds'],
    questions: [{ id: 'q-snow', prompt: 'Snowy peaks?' }, { id: 'q-haze', prompt: 'Haze?' }],
    controls: [{ image: 'good.png', expect: 'PASS' }, { image: 'bad.png', expect: 'FAIL', element: 'snow line' }],
  };
  assert.deepEqual(validateManifest(manifest), []);
  assert.ok(validateManifest({ id: 'x', questions: [], controls: [{ image: 'a', expect: 'MAYBE' }] }).length >= 2);
  // runControls resolves image paths, so this scripted judge keys on the basename.
  const votes = { 'good.png': [V('PASS'), V('PASS'), V('PASS'), V('FAIL'), V('FAIL'), V('PASS')],
    'bad.png': [V('FAIL'), V('FAIL'), V('FAIL'), V('FAIL'), V('FAIL'), V('FAIL')] };
  const diag = { 'good.png': [D('haze/clouds', 'haze vs cloud not defined')], 'bad.png': [D('snow line'), D('haze/clouds')] };
  const byBase = async (prompt, image) => {
    const base = image.split(/[\\/]/).pop();
    return { ok: true, text: (prompt.includes('Answer in exactly these five lines') ? diag : votes)[base].shift() };
  };
  const out = await runControls({ judge: byBase, manifest });
  const [snow, haze] = out.questions;
  assert.equal(snow.status, 'CALIBRATED');
  assert.equal(snow.rows[1].elementMatch, true);
  assert.equal(haze.status, 'UNCALIBRATED');
  assert.match(haze.why, /known-good control not passed: good\.png/);
  assert.equal(haze.rows[0].diagnosis.flags[0], 'question possibly ambiguous (1 of 1 answers)');
  assert.equal(haze.rows[1].elementMatch, false);

  const fail = { status: 'FAIL', pass: 0, fail: 3, unclear: 0, asks: 3 };
  assert.equal(applyCalibration(fail, 'UNCALIBRATED').citable, false);
  assert.equal(applyCalibration(fail, undefined).calibration, 'NOT-CHECKED');
  assert.equal(applyCalibration(fail, 'CALIBRATED').citable, true);
  assert.equal(applyCalibration({ ...fail, status: 'UNSTABLE' }, 'CALIBRATED').citable, false);
});

test('a known-bad control that is not failed marks the question INSENSITIVE', async () => {
  const manifest = { id: 'x', questions: [{ id: 'q', prompt: 'p' }], controls: [{ image: 'g', expect: 'PASS' }, { image: 'b', expect: 'FAIL' }] };
  const judge = async (prompt) => ({ ok: true, text: prompt.includes('five lines') ? D('snow line') : V('PASS') });
  const out = await runControls({ judge, manifest });
  assert.equal(out.questions[0].status, 'INSENSITIVE');
  const noBad = await runControls({ judge, manifest: { ...manifest, controls: [manifest.controls[0]] } });
  assert.equal(noBad.questions[0].status, 'UNCALIBRATED');
});

test('parseDiagnosis tolerates bold labels and unknown elements', () => {
  const d = parseDiagnosis('**REASON:** flat\n**ELEMENT:** silhouette/slope/ridge\nEXPECTED: x\nCONFIDENCE: Medium-ish\nAMBIGUITY: None.');
  assert.equal(d.element, 'silhouette/slope/ridge');
  assert.equal(d.confidence, 'medium');
  assert.equal(d.ambiguity, '');
  assert.equal(parseDiagnosis('nothing useful').element, 'unknown');
  assert.ok(aggregateDiagnoses([parseDiagnosis('nothing')]).flags.includes('unparsed ELEMENT line'));
});
