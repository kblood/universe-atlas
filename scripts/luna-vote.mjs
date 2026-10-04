#!/usr/bin/env node
// VISUAL-ADVISORY voting over scripts/luna-eyes.mjs (docs/test-policy.md,
// "Result classes"). Luna's verdicts never block a gate; this script records
// them as PASS / FAIL / UNSTABLE with vote counts, asks Luna to DIAGNOSE every
// FAIL/UNSTABLE image (reason, element, expected, confidence), and checks a
// question against positive/negative control images.
//
//   node scripts/luna-vote.mjs --prompt "Do the peaks carry snow?" [--asks 3] \
//     [--elements "silhouette,snow line,haze/clouds"] [--json out.json] \
//     [--calibration controls-result.json --question <id>] sheet.png [more.png]
//   node scripts/luna-vote.mjs --controls tests/visual-controls/<feature>.json [--json out.json]
//
// Each image is judged on its own, N times (N >= 3). Exit 0 for every advisory
// result (PASS, FAIL, UNSTABLE, UNCALIBRATED). Exit 2 only when Luna is
// unavailable (fewer than 3 answered asks for an image): the visual check was
// NOT done. Exit 64 = usage. Only send generated review renders (AGENTS.md).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIN_ASKS = 3;
export const DEFAULT_ELEMENTS = ['silhouette/slope/ridge', 'snow line', 'haze/clouds', 'camera pose',
  'texture/colour', 'seabed detail', 'shoreline'];
export class LunaUnavailable extends Error {}

export function voteSuffix() {
  return '\n\nJudge this image on its own. End your answer with exactly one line: VERDICT: PASS or VERDICT: FAIL.';
}

export function diagnosisPrompt(question, elements) {
  return `Question that was asked about this image:\n"""${question}"""\n\nThis image did not clearly pass. ` +
    'Name the single most important reason this fails, which ELEMENT it belongs to ' +
    `(choose one of: ${elements.join(', ')}; or "other: <name>"), what you would expect to see instead, ` +
    'and how confident you are (low/medium/high). If this image should pass, say what in the question was ambiguous.\n' +
    'Answer in exactly these five lines:\nREASON: ...\nELEMENT: ...\nEXPECTED: ...\nCONFIDENCE: low|medium|high\n' +
    'AMBIGUITY: none | <what in the question was ambiguous>';
}

/** Last "VERDICT: PASS|FAIL" line wins; anything else is UNCLEAR. */
export function parseVerdict(text) {
  const all = [...String(text).matchAll(/VERDICT:\s*\**\s*(PASS|FAIL)\b/gi)];
  return all.length ? all[all.length - 1][1].toUpperCase() : 'UNCLEAR';
}

/** Strict majority of the answered asks; otherwise UNSTABLE. */
export function tally(verdicts) {
  const n = verdicts.length, pass = verdicts.filter((v) => v === 'PASS').length, fail = verdicts.filter((v) => v === 'FAIL').length;
  const status = pass * 2 > n ? 'PASS' : fail * 2 > n ? 'FAIL' : 'UNSTABLE';
  return { status, pass, fail, unclear: n - pass - fail, asks: n };
}

export function parseDiagnosis(text, elements = DEFAULT_ELEMENTS) {
  const field = (k) => (String(text).match(new RegExp(`^\\s*\\**${k}\\**:\\**\\s*(.+)$`, 'im')) || [])[1]?.trim() || '';
  const raw = field('ELEMENT'), lower = raw.toLowerCase();
  const element = elements.find((e) => lower === e.toLowerCase()) || elements.find((e) => lower.includes(e.toLowerCase())) || (raw ? raw : 'unknown');
  const confidence = (field('CONFIDENCE').toLowerCase().match(/low|medium|high/) || ['unknown'])[0];
  const ambiguity = field('AMBIGUITY');
  return { reason: field('REASON'), element, expected: field('EXPECTED'), confidence,
    ambiguity: /^none\b/i.test(ambiguity) ? '' : ambiguity };
}

/** Most common element, disagreement and "should pass" flags across diagnosis answers. */
export function aggregateDiagnoses(diagnoses) {
  const counts = {};
  for (const d of diagnoses) counts[d.element] = (counts[d.element] || 0) + 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const flags = [];
  if (ranked.length > 1) flags.push(`element disagreement: ${ranked.map(([e, c]) => `${e} x${c}`).join(', ')}`);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) flags.push('no single most common element');
  const ambiguous = diagnoses.filter((d) => d.ambiguity).length;
  if (ambiguous) flags.push(`question possibly ambiguous (${ambiguous} of ${diagnoses.length} answers)`);
  if (diagnoses.some((d) => d.element === 'unknown')) flags.push('unparsed ELEMENT line');
  return { mostCommonElement: ranked.length ? ranked[0][0] : null, elementCounts: counts, flags, answers: diagnoses.length };
}

/**
 * judge(prompt, image) -> Promise<{ ok: boolean, text?: string, error?: string }>.
 * Throws LunaUnavailable when fewer than MIN_ASKS asks were answered.
 */
export async function voteImage({ judge, question, image, asks = MIN_ASKS, elements = DEFAULT_ELEMENTS, diagnoseAsks = 1 }) {
  if (asks < MIN_ASKS) throw new Error(`asks must be >= ${MIN_ASKS}`);
  const verdicts = [], errors = [];
  for (let i = 0; i < asks; i++) {
    const r = await judge(question + voteSuffix(), image);
    if (r.ok) verdicts.push(parseVerdict(r.text)); else errors.push(r.error || 'judge failed');
  }
  if (verdicts.length < MIN_ASKS) throw new LunaUnavailable(`${image}: only ${verdicts.length} of ${asks} asks answered (${errors.join('; ')})`);
  const result = { image, ...tally(verdicts), verdicts, errors };
  if (result.status !== 'PASS') {
    const diagnoses = [];
    for (let i = 0; i < diagnoseAsks; i++) {
      const r = await judge(diagnosisPrompt(question, elements), image);
      if (r.ok) diagnoses.push(parseDiagnosis(r.text, elements)); else result.errors.push(`diagnosis: ${r.error || 'judge failed'}`);
    }
    result.diagnoses = diagnoses;
    result.diagnosis = aggregateDiagnoses(diagnoses);
  }
  return result;
}

/** Flag-only calibration lookup: a FAIL under an UNCALIBRATED question cannot be cited. */
export function applyCalibration(result, calibrationStatus) {
  const calibration = calibrationStatus || 'NOT-CHECKED';
  const citable = result.status === 'FAIL' ? calibration === 'CALIBRATED'
    : result.status === 'PASS' ? calibration === 'CALIBRATED' : false;
  return { ...result, calibration, citable };
}

/** Controls: a good image must PASS, a bad one must FAIL, for every question. */
export async function runControls({ judge, manifest, baseDir = '.' }) {
  const elements = manifest.elements?.length ? manifest.elements : DEFAULT_ELEMENTS;
  const goods = manifest.controls.filter((c) => c.expect === 'PASS'), bads = manifest.controls.filter((c) => c.expect === 'FAIL');
  const questions = [];
  for (const q of manifest.questions) {
    const rows = [];
    for (const c of manifest.controls) {
      const r = await voteImage({ judge, question: q.prompt, image: resolve(baseDir, c.image), asks: manifest.asks || MIN_ASKS, elements });
      rows.push({ control: c.image, expect: c.expect, status: r.status, pass: r.pass, fail: r.fail, unclear: r.unclear,
        ...(r.diagnosis ? { diagnosis: r.diagnosis, diagnoses: r.diagnoses } : {}),
        ...(c.element && r.diagnosis ? { expectedElement: c.element, elementMatch: r.diagnosis.mostCommonElement === c.element } : {}) });
    }
    const failedGood = rows.filter((r) => r.expect === 'PASS' && r.status !== 'PASS').map((r) => r.control);
    const passedBad = rows.filter((r) => r.expect === 'FAIL' && r.status !== 'FAIL').map((r) => r.control);
    let status = 'CALIBRATED', why = '';
    if (!goods.length || !bads.length) { status = 'UNCALIBRATED'; why = 'needs at least one good and one bad control'; }
    else if (failedGood.length) { status = 'UNCALIBRATED'; why = `known-good control not passed: ${failedGood.join(', ')}`; }
    else if (passedBad.length) { status = 'INSENSITIVE'; why = `known-bad control not failed: ${passedBad.join(', ')}`; }
    questions.push({ id: q.id, status, why, rows });
  }
  return { feature: manifest.id, questions };
}

export function validateManifest(m, baseDir) {
  const errs = [];
  if (!m || typeof m.id !== 'string') errs.push('id (string) required');
  if (!Array.isArray(m?.questions) || !m.questions.length) errs.push('questions[] required');
  else for (const q of m.questions) if (!q.id || !q.prompt) errs.push('each question needs id and prompt');
  if (!Array.isArray(m?.controls) || !m.controls.length) errs.push('controls[] required');
  else for (const c of m.controls) {
    if (!['PASS', 'FAIL'].includes(c.expect)) errs.push(`control ${c.image}: expect must be PASS or FAIL`);
    if (baseDir && !existsSync(resolve(baseDir, c.image || ''))) errs.push(`control image missing: ${c.image}`);
  }
  return errs;
}

function lunaJudge(prompt, image) {
  const eyes = join(dirname(fileURLToPath(import.meta.url)), 'luna-eyes.mjs');
  const r = spawnSync(process.execPath, [eyes, '--prompt', prompt, image], { encoding: 'utf8', timeout: 11 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? { ok: true, text: r.stdout } : { ok: false, error: `luna-eyes exit ${r.status}: ${(r.stderr || '').trim().slice(-300)}` };
}

function line(r) {
  const head = `${r.status} ${r.pass}/${r.fail}/${r.unclear} (pass/fail/unclear of ${r.asks})`;
  const diag = r.diagnosis ? ` -> element: ${r.diagnosis.mostCommonElement ?? 'none'}${r.diagnosis.flags.length ? ` [${r.diagnosis.flags.join('; ')}]` : ''}` : '';
  return `${head}${r.calibration ? ` calibration ${r.calibration}${r.citable ? '' : ' (not citable)'}` : ''}${diag}  ${r.image}`;
}

async function main(argv) {
  let prompt = '', asks = MIN_ASKS, json = '', controls = '', calibration = '', question = '', diagnoseAsks = 1, elements = DEFAULT_ELEMENTS;
  const images = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], need = () => { if (i + 1 >= argv.length) usage(`${a} needs a value`); return argv[++i]; };
    if (a === '--prompt') prompt = need();
    else if (a === '--prompt-file') prompt = readFileSync(need(), 'utf8');
    else if (a === '--asks') asks = Number(need());
    else if (a === '--diagnose-asks') diagnoseAsks = Number(need());
    else if (a === '--elements') elements = need().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--json') json = need();
    else if (a === '--controls') controls = need();
    else if (a === '--calibration') calibration = need();
    else if (a === '--question') question = need();
    else if (a.startsWith('--')) usage(`unknown flag ${a}`);
    else images.push(resolve(a));
  }
  if (!Number.isInteger(asks) || asks < MIN_ASKS) usage(`--asks must be an integer >= ${MIN_ASKS}`);
  if (!Number.isInteger(diagnoseAsks) || diagnoseAsks < 1) usage('--diagnose-asks must be an integer >= 1');
  let out;
  if (controls) {
    const manifest = JSON.parse(readFileSync(controls, 'utf8')), baseDir = dirname(resolve(controls));
    const errs = validateManifest(manifest, baseDir);
    if (errs.length) usage(`bad controls manifest ${controls}:\n  ${errs.join('\n  ')}`);
    out = { class: 'VISUAL-ADVISORY', kind: 'controls', ...(await runControls({ judge: lunaJudge, manifest, baseDir })) };
    for (const q of out.questions) {
      console.log(`${q.id}: ${q.status}${q.why ? ` (${q.why})` : ''}`);
      for (const r of q.rows) console.log(`  expect ${r.expect}: ${r.status} ${r.pass}/${r.fail}/${r.unclear}${r.diagnosis ? ` -> ${r.diagnosis.mostCommonElement}` : ''}  ${r.control}`);
    }
  } else {
    if (!prompt || !images.length) usage('need --prompt/--prompt-file and at least one image, or --controls');
    for (const f of images) if (!existsSync(f)) usage(`missing image: ${f}`);
    let calStatus = '';
    if (calibration) {
      if (!question) usage('--calibration needs --question <id>');
      const cal = JSON.parse(readFileSync(calibration, 'utf8')).questions?.find((q) => q.id === question);
      calStatus = cal ? cal.status : 'UNCALIBRATED';
    }
    const results = [];
    for (const image of images) {
      const r = await voteImage({ judge: lunaJudge, question: prompt, image, asks, elements, diagnoseAsks });
      results.push(applyCalibration(r, calStatus || undefined));
    }
    out = { class: 'VISUAL-ADVISORY', kind: 'vote', question: question || null, prompt, results };
    for (const r of results) console.log(line(r));
  }
  if (json) writeFileSync(json, JSON.stringify(out, null, 2) + '\n');
  console.log('VISUAL-ADVISORY: recorded only; never blocks a gate by itself.');
  return 0;
}

function usage(msg) {
  console.error(`luna-vote: ${msg}\nusage: luna-vote.mjs --prompt "<q>" [--asks N>=3] [--diagnose-asks N] [--elements a,b] [--json out] [--calibration file --question id] image...\n       luna-vote.mjs --controls tests/visual-controls/<feature>.json [--json out]`);
  process.exit(64);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => {
    if (e instanceof LunaUnavailable) { console.error(`luna-vote: Luna unavailable, visual check NOT done: ${e.message}`); process.exit(2); }
    console.error(`luna-vote: ${e.stack || e}`); process.exit(1);
  });
}
