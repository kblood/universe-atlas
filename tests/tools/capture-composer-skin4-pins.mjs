#!/usr/bin/env node
// Captures the eye round EC2 pins (fauna-composer-eye-2, fauna-composer-skin-4):
//   tests/fixtures/composer-skin4-links.json         the current-rules (eyeRules 2) skin of the 28 migrated neutral v1
//                                                    texts that composer-skin3-links.json pins under eyeRules 1
//   tests/fixtures/composer-eye-catalogue-links.json the skins of the eye-catalogue, eye-odd and eye-upgrade review
//                                                    specimens of tests/fauna-face-specimens.json
//
//   node tests/tools/capture-composer-skin4-pins.mjs --commit <base sha> [--date YYYY-MM-DD]
//
// Regenerate only with a deliberate skin, eye or graph version bump, and document the drift reason in the fixture.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {COMPOSER_RECIPE_VERSION, COMPOSER_V2_DEFAULTS, composerLegacyPresetId, decodeComposerRecipe, normalizeComposerRecipe} from '../../src/fauna-composer-recipe.ts';
import {COMPOSER_GRAPH_VERSION, buildComposerGraph} from '../../src/fauna-composer-rig.ts';
import {COMPOSER_SKIN_VERSION, buildComposerSkin} from '../../src/fauna-composer-mesh.ts';
import {COMPOSER_EYE_VERSION} from '../../src/fauna-composer-eye.ts';
import {deriveComposerIndividual} from '../../src/fauna-composer-individual.ts';
import {resolveComposerEyes} from '../../src/fauna-composer-face.ts';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const commit = arg('--commit'), date = arg('--date') ?? new Date().toISOString().slice(0, 10);
if (!commit) { console.error('usage: capture-composer-skin4-pins.mjs --commit <base sha> [--date YYYY-MM-DD]'); process.exit(64); }
const url = p => new URL(`../${p}`, import.meta.url);
const digest = (...arrays) => { const h = createHash('sha256'); for (const a of arrays) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };
const pin = recipe => {
  const graph = buildComposerGraph(recipe), skin = buildComposerSkin(graph);
  return {skin: digest(skin.positions, skin.index, skin.skinIndex, skin.skinWeight, skin.colors), gloss: digest(skin.gloss), vertices: skin.vertexCount, triangles: skin.triangleCount, bones: graph.bones.length};
};
const capturedAt = {commitBase: commit, date, graph: COMPOSER_GRAPH_VERSION, skin: COMPOSER_SKIN_VERSION, eye: COMPOSER_EYE_VERSION, recipe: COMPOSER_RECIPE_VERSION};

// ---- skin-4: the 28 texts, current rules
const skin3 = JSON.parse(readFileSync(url('fixtures/composer-skin3-links.json'), 'utf8'));
const DRIFT = 'fauna-composer-eye-2: eyes rebuilt under the current eye rules';
const byText = {};
for (const text of Object.keys(skin3.byText)) {
  const decoded = decodeComposerRecipe(text).recipe;
  const neutral = composerLegacyPresetId(decoded) ? {...decoded, ...COMPOSER_V2_DEFAULTS} : decoded;
  if (neutral.eyeRules !== 2) throw new Error(`${text}: a v1 text must upgrade to the current eye rules`);
  const p = pin(deriveComposerIndividual(neutral).recipe), prev = skin3.byText[text];
  byText[text] = {...p, driftFromSkin3: p.skin === prev.skin ? null : DRIFT, skin3: prev.skin};
}
writeFileSync(url('fixtures/composer-skin4-links.json'), JSON.stringify({
  schema: 'composer-skin4-links-1', capturedAt: {...capturedAt, note: 'Skin-4 digests (positions, index, skinIndex, skinWeight, colors) and gloss digests of the 28 migrated neutral v1 texts of composer-skin3-links.json, built under the current eye rules (eyeRules 2; owner decision 2026-10-03: old links upgrade). Eye round EC2 rebuilt every eye as the catalogue geometry (fauna-composer-eye-2), recoloured the nostrils and the blunt mouth disc and raised the eye sizes, so every entry drifts from its skin-3 pin (driftFromSkin3, previous pin in skin3). The same texts under eyeRules 1 still build their skin-3 pin byte for byte. Bone counts are unchanged (eyes are mesh-only).'},
  driftFromSkin3: DRIFT, byText,
}, null, 1) + '\n');

// ---- catalogue links: the eye review specimens
const specimens = JSON.parse(readFileSync(url('fauna-face-specimens.json'), 'utf8')).specimens.filter(s => ['eye-catalogue', 'eye-odd', 'eye-upgrade'].includes(s.group));
const links = specimens.map(s => {
  const decoded = decodeComposerRecipe(s.text);
  if (decoded.error) throw new Error(`${s.name}: ${decoded.error}`);
  const recipe = deriveComposerIndividual(normalizeComposerRecipe(decoded.recipe).recipe).recipe, e = resolveComposerEyes(recipe);
  return {name: s.name, group: s.group, text: s.text, kind: e.kind, eyeRules: e.rules, ...pin(recipe)};
});
writeFileSync(url('fixtures/composer-eye-catalogue-links.json'), JSON.stringify({
  schema: 'composer-eye-catalogue-links-1', capturedAt: {...capturedAt, note: 'Skin and gloss digests of the eye-catalogue, eye-odd and eye-upgrade review specimens (tests/fauna-face-specimens.json) as createComposerCreature builds them: the 13 catalogue kinds on a native face, odd kind x face combinations (built, never refused), and v3 links that upgrade beside their earlier-rules twin. Regenerate only with a deliberate skin, eye or graph version bump.'},
  links,
}, null, 1) + '\n');
console.log(`skin-4: ${Object.keys(byText).length} texts (${Object.values(byText).filter(v => v.driftFromSkin3).length} drift); catalogue links: ${links.length}`);
