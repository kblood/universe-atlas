#!/usr/bin/env node
// Headless creature export (fauna-composer-export-1, backlog task 10): writes one GLB per species plus a provenance
// sidecar and an asset brief, with no browser and no Atlas runtime.
//
//   node scripts/export-creature.mjs --out <dir> [selection...] [options]
//
// Selection (repeatable, at least one):
//   --preset <id|all>          a Creature Lab preset (COMPOSER_PRESET_IDS) or every preset
//   --seed <text>              a coherent random species (coherentComposerSpecies), optionally with --archetype <a>
//   --count <N> --seed-prefix <p>   N coherent species from seeds <p>-0 .. <p>-(N-1)
//   --recipe <text>            a shared recipe link (v1..v4 text)
// Options:
//   --motions <a,b,..>         subset of neutral,idle,walk,display (default all)
//   --fps <n>                  sample rate (default 30)
//   --gloss attribute|drop     keep the eye gloss as the _COMPOSER_GLOSS attribute (default) or drop it
//   --forward +Z|+X            exported heading (default +Z, the glTF asset front)
//
// Files per species, <key> = <label>-<8-hex hash of the recipe text>:
//   <key>.glb            the creature (see src/fauna-composer-export.ts)
//   <key>.creature.json  sidecar creature-export-sidecar-1: recipe, versions, generator source hash, clips, provenance
//   <key>.brief.json     an IWSDK asset brief (schemas/asset-brief/v1) for `assetctl package --brief`
// An existing file is never overwritten: identical bytes are accepted (a re-run is a no-op), different bytes fail.
// Nothing written depends on the clock, so a second export of the same selection is byte-identical.
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMPOSER_EXPORT_VERSION, exportCreatureGlb} from '../src/fauna-composer-export.ts';
import {COMPOSER_PRESET_IDS, composerHash, composerPreset, decodeComposerRecipe, isComposerPresetId} from '../src/fauna-composer-recipe.ts';
import {COMPOSER_ARCHETYPES, coherentComposerSpecies} from '../src/fauna-composer-species.ts';
import {COMPOSER_BUDGET, COMPOSER_MOTIONS} from '../src/fauna-composer-rig.ts';

export const CREATURE_EXPORT_SIDECAR_SCHEMA = 'creature-export-sidecar-1';
/** Sources whose bytes decide the exported GLB: the 12-module composer core and the exporter (repo-relative). */
export const CREATURE_EXPORT_GENERATOR_SOURCES = Object.freeze([
  'src/fauna-coat-fields.ts', 'src/fauna-coat-vocab.ts', 'src/fauna-composer-eye-catalogue.ts', 'src/fauna-composer-eye.ts',
  'src/fauna-composer-export.ts', 'src/fauna-composer-face-geometry.ts', 'src/fauna-composer-face.ts', 'src/fauna-composer-individual.ts',
  'src/fauna-composer-mesh.ts', 'src/fauna-composer-recipe.ts', 'src/fauna-composer-rig.ts', 'src/fauna-composer-species.ts', 'src/fauna-composer.ts',
]);
const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const hex8 = n => (n >>> 0).toString(16).padStart(8, '0');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'creature';

/** sha256 over the generator sources, sorted by path, LF line endings (a CRLF checkout hashes the same). */
export function generatorSourceHash(repo = REPO) {
  const h = createHash('sha256');
  for (const path of [...CREATURE_EXPORT_GENERATOR_SOURCES].sort()) {
    const text = readFileSync(join(repo, path), 'utf8').replace(/\r\n/g, '\n');
    h.update(`${path}\n${Buffer.byteLength(text)}\n`).update(text);
  }
  return h.digest('hex');
}

export function parseArgs(argv) {
  const out = {out: null, selections: [], motions: null, fps: undefined, gloss: undefined, forward: undefined};
  let count = null, prefix = null, archetype;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], value = () => { if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`); return argv[++i]; };
    if (flag === '--out') out.out = value();
    else if (flag === '--preset') { const id = value(); for (const p of id === 'all' ? COMPOSER_PRESET_IDS : [id]) { if (!isComposerPresetId(p)) throw new Error(`unknown preset ${p}; known: ${COMPOSER_PRESET_IDS.join(', ')}`); out.selections.push({kind: 'preset', preset: p}); } }
    else if (flag === '--seed') out.selections.push({kind: 'coherent-species', seed: value()});
    else if (flag === '--archetype') { archetype = value(); if (!COMPOSER_ARCHETYPES.includes(archetype)) throw new Error(`unknown archetype ${archetype}; known: ${COMPOSER_ARCHETYPES.join(', ')}`); }
    else if (flag === '--count') { count = Number(value()); if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('--count must be an integer 1..500'); }
    else if (flag === '--seed-prefix') prefix = value();
    else if (flag === '--recipe') out.selections.push({kind: 'recipe', recipe: value()});
    else if (flag === '--motions') { out.motions = value().split(',').map(s => s.trim()).filter(Boolean); for (const m of out.motions) if (!COMPOSER_MOTIONS.includes(m)) throw new Error(`unknown motion ${m}`); }
    else if (flag === '--fps') out.fps = Number(value());
    else if (flag === '--gloss') out.gloss = value();
    else if (flag === '--forward') out.forward = value();
    else throw new Error(`unknown argument ${flag}`);
  }
  if ((count === null) !== (prefix === null)) throw new Error('--count and --seed-prefix go together');
  if (count !== null) for (let k = 0; k < count; k++) out.selections.push({kind: 'coherent-species', seed: `${prefix}-${k}`});
  for (const s of out.selections) if (s.kind === 'coherent-species' && archetype) s.archetype = archetype;
  if (!out.out) throw new Error('--out <dir> is required');
  if (!out.selections.length) throw new Error('nothing selected: use --preset, --seed, --count/--seed-prefix or --recipe');
  return out;
}

/** Resolves a selection to {recipe, label, source}. */
export function resolveSelection(sel) {
  if (sel.kind === 'preset') return {recipe: composerPreset(sel.preset), label: sel.preset, source: {kind: 'preset', preset: sel.preset}};
  if (sel.kind === 'coherent-species') {
    const species = coherentComposerSpecies(sel.seed, sel.archetype ? {archetype: sel.archetype} : {});
    return {recipe: species.recipe, label: `${species.archetype}-${slug(sel.seed)}`,
      source: {kind: 'coherent-species', seed: sel.seed, archetype: species.archetype, archetypeRequested: sel.archetype ?? null, attempt: species.attempt, balancePass: species.balance.pass}};
  }
  const decoded = decodeComposerRecipe(sel.recipe);
  if (!decoded.recipe) throw new Error(`recipe: ${decoded.error}`);
  return {recipe: decoded.recipe, label: 'recipe', source: {kind: 'recipe', text: sel.recipe, issues: decoded.issues}};
}

function provenance(report, key, source) {
  return {
    sourceType: 'generated',
    generator: {provider: 'universe-atlas', model: 'fauna-composer', checkpoint: null, version: `${report.versions.graph} ${report.versions.skin} ${COMPOSER_EXPORT_VERSION}`, workflow: 'scripts/export-creature.mjs'},
    prompt: report.recipeText,
    // the species seed when one drew the recipe; otherwise the recipe text's hash (the recipe itself is the whole input)
    seed: source.kind === 'coherent-species' ? source.seed : `recipe-${hex8(composerHash(report.recipeText))}`,
    sourceUrl: null,
    sourceConsent: 'not-applicable',
    parents: [],
    license: {expression: 'NOASSERTION', attribution: null, restrictions: []},
    notes: `Procedural; no external inputs (no model checkpoint, texture, scan or third-party asset). The recipe text is the whole input. Licence open until the owner answers the creature-kit licence question. Asset ${key}.`,
  };
}

/** Builds the three files for one selection; returns {key, files: [[name, bytes]...], sidecar}. Pure apart from reading sources. */
export function buildCreatureFiles(sel, options = {}, sourceHash = generatorSourceHash()) {
  const {recipe, label, source} = resolveSelection(sel);
  const exportOptions = {};
  if (options.motions) exportOptions.clips = options.motions;
  if (options.fps !== undefined) exportOptions.fps = options.fps;
  if (options.gloss !== undefined) exportOptions.gloss = options.gloss;
  if (options.forward !== undefined) exportOptions.forward = options.forward;
  const {glb, report} = exportCreatureGlb(recipe, exportOptions);
  const key = `${slug(label)}-${hex8(composerHash(report.recipeText))}`;
  const prov = provenance(report, key, source);
  const sidecar = {
    schema: CREATURE_EXPORT_SIDECAR_SCHEMA,
    asset: {id: key, file: `${key}.glb`, bytes: glb.byteLength, sha256: sha256(glb)},
    source,
    recipeText: report.recipeText, speciesKey: report.speciesKey,
    individual: report.individual,
    versions: report.versions,
    generator: {description: 'procedural; no external inputs', sources: CREATURE_EXPORT_GENERATOR_SOURCES, sourceSha256: sourceHash, script: 'scripts/export-creature.mjs'},
    axes: report.axes, mesh: report.mesh, gloss: report.gloss, repairs: report.repairs, clips: report.clips,
    playback: 'Clips marked seamless loop with LoopRepeat; the others are exact poseComposer windows whose end differs from the start by the listed seam: play them with LoopPingPong or crossfade. Walk is a treadmill: move the creature along the forward axis at travelSpeed.',
    provenance: prov,
  };
  const brief = {
    schema: 'https://iwsdk.local/schemas/asset-brief/v1',
    id: key.slice(0, 64),
    kind: 'creature',
    purpose: `Procedural composer creature (${label}) exported headless from universe-atlas for use by other IWSDK games.`,
    target: {engine: 'IWSDK', project: 'universe-atlas', devices: ['desktop-web'], metersPerUnit: 1, runtimeCoordinates: 'right-handed-y-up'},
    artDirection: {summary: 'Stylised procedural animal: one skinned vertex-coloured mesh, composer skeleton, baked motion clips.', styleTags: ['procedural', 'vertex-colour', 'skinned']},
    deliverables: [
      {type: 'runtime', path: `${key}.glb`, format: 'glb', required: true},
      {type: 'animation', path: `${key}.glb`, format: 'glb-embedded-clips', required: true},
      {type: 'manifest', path: `${key}.creature.json`, format: CREATURE_EXPORT_SIDECAR_SCHEMA, required: true},
    ],
    constraints: {geometry: {maxTriangles: COMPOSER_BUDGET.maxTriangles, maxMaterials: 1, lodCount: 0, collision: 'none'}},
    acceptance: {
      visual: ['animal intact at normal viewing size', 'no skinning tears while the clips play', 'clips visibly play'],
      technical: ['assetctl validate passes', `at most ${COMPOSER_BUDGET.maxBones} joints`, 'clips match poseComposer at their keys', 'second export byte-identical'],
    },
    provenance: prov,
  };
  const json = v => new TextEncoder().encode(`${JSON.stringify(v, null, 2)}\n`);
  return {key, sidecar, files: [[`${key}.glb`, glb], [`${key}.creature.json`, json(sidecar)], [`${key}.brief.json`, json(brief)]]};
}

/** Writes a file unless it exists: identical bytes are accepted, different bytes throw. Returns 'written' | 'identical'. */
export function writeOnce(path, bytes) {
  if (existsSync(path)) {
    const old = readFileSync(path);
    if (Buffer.compare(old, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)) === 0) return 'identical';
    throw new Error(`refusing to overwrite ${path} (contents differ); export into a new directory`);
  }
  writeFileSync(path, bytes, {flag: 'wx'});
  return 'written';
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const dir = resolve(args.out);
  mkdirSync(dir, {recursive: true});
  const sourceHash = generatorSourceHash();
  const seen = new Set(), rows = [];
  for (const sel of args.selections) {
    const built = buildCreatureFiles(sel, args, sourceHash);
    if (seen.has(built.key)) { rows.push({key: built.key, status: 'duplicate selection skipped'}); continue; }
    seen.add(built.key);
    const status = built.files.map(([name, bytes]) => `${name}:${writeOnce(join(dir, name), bytes)}`);
    const m = built.sidecar.mesh;
    rows.push({key: built.key, triangles: m.triangles, bones: m.bones, bytes: built.sidecar.asset.bytes,
      clips: built.sidecar.clips.map(c => `${c.motion} ${c.duration.toFixed(2)}s${c.seamless ? '' : ' (seam)'}`).join(', '), status: status.join(' ')});
  }
  console.log(JSON.stringify({exporter: COMPOSER_EXPORT_VERSION, out: dir, generatorSourceSha256: sourceHash, creatures: rows}, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`export-creature: ${error.message}`); process.exitCode = 1; }
}
