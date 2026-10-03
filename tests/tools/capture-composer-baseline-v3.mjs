#!/usr/bin/env node
// Captures tests/fixtures/composer-baseline-v3.json: every eye resolution of the face round (recipe v3,
// fauna-composer-face-1) BEFORE any eye-catalogue (EC1) source edit. Never regenerate after the v4 change.
//
//   node tests/tools/capture-composer-baseline-v3.mjs [--out tests/fixtures/composer-baseline-v3.json]
//
// Per source it records the eye resolution [built, irisBuilt, gazeYawDeg, k, effect], the composerSpeciesKey, and
// for the generators the raw eyes/iris values plus a digest of the 38 v2-key fields (anatomy, coat, variation and
// individual keys), so a later test can prove the frozen streams did not move.
// Sources: (a) every legacy text of composer-baseline-v2.json (420 v1 texts) and the 28 skin-3 texts, decoded;
// (b) the 12 presets, plus each preset x every explicit eye type; (c) randomComposerRecipe(String(i)) and
// coherentComposerSpecies(String(i)) for i < 1000.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = process.argv.includes('--out') ? resolve(process.argv[process.argv.indexOf('--out') + 1]) : resolve(root, 'tests/fixtures/composer-baseline-v3.json');
const {COMPOSER_EYE_TYPES, resolveComposerEyes} = await import(`file://${root}/src/fauna-composer-face.ts`);
const R = await import(`file://${root}/src/fauna-composer-recipe.ts`);
const {coherentComposerSpecies} = await import(`file://${root}/src/fauna-composer-species.ts`);
const {composerSpeciesKey} = await import(`file://${root}/src/fauna-composer-individual.ts`);
if (R.COMPOSER_RECIPE_VERSION !== 3) throw new Error('capture only from the unmodified recipe-v3 composer');

const eye = r => { const e = resolveComposerEyes(r); return [e.built, e.irisBuilt, e.gazeYawDeg, e.k, e.effect]; };
const v2digest = r => createHash('sha256').update(R.COMPOSER_V2_KEYS.map(k => `${k}_${String(r[k])}`).join('*')).digest('hex').slice(0, 16);
const v2 = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/composer-baseline-v2.json'), 'utf8'));
const skin3 = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/composer-skin3-links.json'), 'utf8'));
const texts = (list) => Object.fromEntries(list.map(text => { const {recipe, error} = R.decodeComposerRecipe(text); if (error) throw new Error(error); return [text, {eye: eye(recipe), speciesKey: composerSpeciesKey(recipe)}]; }));
const presets = Object.fromEntries(R.COMPOSER_PRESET_IDS.map(id => {
  const p = R.composerPreset(id);
  return [id, {eye: eye(p), speciesKey: composerSpeciesKey(p), explicit: Object.fromEntries(COMPOSER_EYE_TYPES.map(t => [t, eye({...p, eyes: t})]))}];
}));
const N = 1000, wild = [], coherent = [];
for (let i = 0; i < N; i++) {
  const w = R.randomComposerRecipe(String(i));
  wild.push({eye: eye(w), eyes: w.eyes, iris: w.iris, speciesKey: composerSpeciesKey(w), v2: v2digest(w)});
  const c = coherentComposerSpecies(String(i));
  coherent.push({archetype: c.archetype, attempt: c.attempt, eye: eye(c.recipe), eyes: c.recipe.eyes, iris: c.recipe.iris, speciesKey: composerSpeciesKey(c.recipe), v2: v2digest(c.recipe)});
}
let commit = 'unknown';
try { commit = execSync('git rev-parse HEAD', {cwd: root}).toString().trim(); } catch { /* not a checkout */ }
const fixture = {
  schema: 'composer-baseline-v3-1',
  capturedAt: {commit, date: '2026-10-03', recipeVersion: 3, face: 'fauna-composer-face-1',
    note: 'Captured from UNMODIFIED face-round composer code (recipe v3, fauna-composer-face-1) before any eye-catalogue (EC1) source edit, by tests/tools/capture-composer-baseline-v3.mjs. eye = resolveComposerEyes(recipe) as [built, irisBuilt, gazeYawDeg, k, effect] with the recipe\'s own bodyLength. v2 = sha256 (16 hex) of the 38 v2-key fields. These are the face-round auto rules (eyeRules 1). Never regenerate after the v4 change.'},
  counts: {legacyTexts: Object.keys(v2.legacy).length, skin3Texts: Object.keys(skin3.byText).length, presets: R.COMPOSER_PRESET_IDS.length, wild: N, coherent: N},
  legacy: texts(Object.keys(v2.legacy)),
  skin3: texts(Object.keys(skin3.byText)),
  presets, wild, coherent,
};
writeFileSync(out, JSON.stringify(fixture));
console.log(JSON.stringify({out, counts: fixture.counts, commit}));
