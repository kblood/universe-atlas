#!/usr/bin/env node
// Composer part-diff: proves which skin parts and bones a source change moves.
//
//   node tests/tools/composer-part-diff.mjs --base <dir> --head <dir> --texts <set>[,<set>...] [--out report.json] [--verbose]
//
// <dir> is a source root that contains src/ (a repo checkout or a `git worktree add` of the base ref, created and
// removed by the caller). If <dir>/node_modules is missing, bare imports such as 'three' cannot resolve; junction it
// to the main checkout's node_modules first (Windows: mklink /J <dir>\node_modules <repo>\node_modules).
// <set> is a JSON file (an array of texts, an array of {name,text}, {specimens:[...]} or {byText:{...}}) or one of
//   builtin:skin2      the 28 texts pinned in tests/fixtures/composer-skin2-links.json
//   builtin:specimens  the 41 frozen review specimens in tests/fauna-face-specimens.json
//   builtin:graph435   the 435 recipes of the graph neutral-identity pin (fauna-composer-gait.test.mjs), with the
//                      V2 defaults applied, ENCODED BY THE BASE ROOT so both roots decode identical text even when
//                      the head's generators change.
// Builtin files are read from --head, falling back to --base (and to this checkout).
//
// Each root decodes the text with its own decodeComposerRecipe and builds exactly what createComposerCreature builds
// (normalize -> deriveComposerIndividual -> buildComposerGraph -> buildComposerSkin), without a renderer.
// Per skin part (key `part|label`, numbered when repeated) it hashes, rebased to the part's own vertex range:
// topology (indices minus the first vertex), positions, colours and skin weights (skinIndex + skinWeight), plus
// regions and any other per-vertex Float32/Uint8 channel present in BOTH roots. A channel present in only one root
// is listed under channelsOnlyIn and does not count as a part change. Per bone (keyed by name) it hashes the rest
// state: parent, part, side, restPosition, restQuaternion, offset, restLocal, length and the start/end sections.
// Prints {changedParts:{part:count}, changedBones, recipesChanged, unchangedRecipes, ...} as JSON.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const selfRoot = resolve(here, '..', '..');

function parseArgs(argv) {
  const a = {texts: [], verbose: false};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    if (k === '--base') a.base = resolve(v());
    else if (k === '--head') a.head = resolve(v());
    else if (k === '--texts') a.texts.push(...v().split(',').filter(Boolean));
    else if (k === '--out') a.out = resolve(v());
    else if (k === '--verbose') a.verbose = true;
    else if (k === '--help' || k === '-h') { a.help = true; }
    else throw new Error(`Unknown argument ${k}`);
  }
  return a;
}

async function loadRoot(dir) {
  if (!existsSync(join(dir, 'src', 'fauna-composer-rig.ts'))) throw new Error(`${dir} has no src/fauna-composer-rig.ts`);
  if (!existsSync(join(dir, 'node_modules', 'three'))) {
    let up = dirname(dir), found = false;
    while (up && up !== dirname(up)) { if (existsSync(join(up, 'node_modules', 'three'))) { found = true; break; } up = dirname(up); }
    if (!found) throw new Error(`${dir}/node_modules/three is missing; junction node_modules from the main checkout first.`);
  }
  const imp = f => import(pathToFileURL(join(dir, 'src', f)).href);
  const [recipe, rig, mesh, individual] = await Promise.all([
    imp('fauna-composer-recipe.ts'), imp('fauna-composer-rig.ts'), imp('fauna-composer-mesh.ts'), imp('fauna-composer-individual.ts'),
  ]);
  return {dir, recipe, rig, mesh, individual};
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function firstExisting(rel, roots) {
  for (const r of roots) { const p = join(r, rel); if (existsSync(p)) return p; }
  throw new Error(`None of ${roots.map(r => join(r, rel)).join(', ')} exists`);
}
function textsFromJson(doc, origin) {
  const list = Array.isArray(doc) ? doc : doc.specimens ?? (doc.byText ? Object.keys(doc.byText) : null);
  if (!list) throw new Error(`${origin}: expected an array, {specimens:[...]} or {byText:{...}}`);
  return list.map((e, i) => typeof e === 'string' ? {name: `${origin}#${i}`, text: e} : {name: e.name ?? `${origin}#${i}`, text: e.text});
}

function graph435(base) {
  // Mirrors fauna-composer-gait.test.mjs 'neutral identity' list order exactly, encoded by the base root.
  const R = base.recipe, V2 = R.COMPOSER_V2_DEFAULTS;
  const fixture = readJson(join(base.dir, 'tests', 'fixtures', 'composer-v1-links.json'));
  const out = Object.entries(R.COMPOSER_PRESETS).map(([id, r]) => ({name: `graph435:preset:${id}`, text: R.encodeComposerRecipe({...r, ...V2})}));
  for (let i = 0; i < 12; i++) out.push({name: `graph435:random:${i}`, text: R.encodeComposerRecipe({...R.randomComposerRecipe(`independent-rig-${i}`), ...V2})});
  for (const e of [...fixture.fixtureSeeds, ...fixture.extremes, ...fixture.wild])
    out.push({name: `graph435:${e.seed ?? e.label}`, text: R.encodeComposerRecipe({...R.decodeComposerRecipe(e.text).recipe, ...V2})});
  return out;
}

function collectTexts(sets, base, head) {
  const roots = [head.dir, base.dir, selfRoot];
  const all = [];
  for (const set of sets) {
    if (set === 'builtin:skin2') all.push(...textsFromJson(readJson(firstExisting('tests/fixtures/composer-skin2-links.json', roots)), 'skin2').map((e, i) => ({...e, name: `skin2#${i}`})));
    else if (set === 'builtin:specimens') all.push(...textsFromJson(readJson(firstExisting('tests/fauna-face-specimens.json', roots)), 'specimens'));
    else if (set === 'builtin:graph435') all.push(...graph435(base));
    else if (set.startsWith('builtin:')) throw new Error(`Unknown builtin set ${set}`);
    else all.push(...textsFromJson(readJson(resolve(set)), set));
  }
  return all;
}

const sha = (...arrays) => {
  const h = createHash('sha256');
  for (const a of arrays) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return h.digest('hex').slice(0, 24);
};

function build(root, text) {
  const dec = root.recipe.decodeComposerRecipe(text);
  if (dec.error || !dec.recipe) return {error: dec.error ?? 'no recipe'};
  const recipe = root.recipe.normalizeComposerRecipe(dec.recipe).recipe;
  const derived = root.individual.deriveComposerIndividual(recipe);
  const graph = root.rig.buildComposerGraph(derived.recipe);
  const skin = root.mesh.buildComposerSkin(graph);
  return {graph, skin, issues: dec.issues};
}

const CORE = new Set(['positions', 'colors', 'skinIndex', 'skinWeight', 'index', 'regions']);
/** Per-vertex channels other than the core ones (e.g. a gloss attribute), found by length. */
function extraChannels(skin) {
  const out = {};
  for (const [k, v] of Object.entries(skin)) {
    if (CORE.has(k) || !ArrayBuffer.isView(v) || v instanceof DataView) continue;
    if (skin.vertexCount > 0 && v.length % skin.vertexCount === 0) out[k] = v.length / skin.vertexCount;
  }
  return out;
}

function partHashes(skin, channels) {
  const idx = skin.index, seen = new Map(), out = new Map();
  for (const p of skin.parts) {
    const base = `${p.part}|${p.label}`, n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    const key = n === 1 ? base : `${base}#${n}`;
    let lo = Infinity, hi = -Infinity;
    for (let t = p.firstTriangle * 3; t < (p.firstTriangle + p.triangles) * 3; t++) { const v = idx[t]; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!Number.isFinite(lo)) { lo = 0; hi = -1; }
    const local = new Uint32Array(p.triangles * 3);
    for (let i = 0; i < local.length; i++) local[i] = idx[p.firstTriangle * 3 + i] - lo;
    const span = (arr, k) => arr.subarray(lo * k, (hi + 1) * k);
    const rec = {part: p.part, label: p.label, triangles: p.triangles, vertices: hi - lo + 1,
      topology: sha(local), position: sha(span(skin.positions, 3)), colour: sha(span(skin.colors, 3)),
      weight: sha(span(skin.skinIndex, 4), span(skin.skinWeight, 4)), region: skin.regions ? sha(span(skin.regions, 1)) : null, extra: {}};
    for (const [ch, k] of Object.entries(channels)) rec.extra[ch] = sha(span(skin[ch], k));
    out.set(key, rec);
  }
  return out;
}

function boneHashes(graph) {
  const out = new Map(), seen = new Map();
  for (const b of graph.bones) {
    const n = (seen.get(b.name) ?? 0) + 1; seen.set(b.name, n);
    const key = n === 1 ? b.name : `${b.name}#${n}`;
    const parentName = b.parent >= 0 ? graph.bones[b.parent].name : '';
    const f = new Float64Array([...b.restPosition, ...b.restQuaternion, ...b.offset, ...b.restLocal, b.length, b.side,
      b.start.w, b.start.h, b.start.yc, b.end.w, b.end.h, b.end.yc]);
    out.set(key, sha(Buffer.from(`${parentName}|${b.part}|${b.driver}|`), f));
  }
  return out;
}

const FIELDS = ['triangles', 'vertices', 'topology', 'position', 'colour', 'weight', 'region'];

export async function partDiff({base, head, texts}) {
  const B = await loadRoot(base), Hd = await loadRoot(head);
  const list = collectTexts(texts, B, Hd);
  const summary = {schema: 'composer-part-diff-1', base: B.dir, head: Hd.dir, texts, recipes: list.length,
    changedParts: {}, changedBones: 0, recipesChanged: 0, unchangedRecipes: 0, errors: [], channelsOnlyIn: {}, comparedExtraChannels: [], changed: []};
  for (const {name, text} of list) {
    const a = build(B, text), b = build(Hd, text);
    if (a.error || b.error) { summary.errors.push({name, base: a.error ?? null, head: b.error ?? null}); continue; }
    const ca = extraChannels(a.skin), cb = extraChannels(b.skin), both = {};
    for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
      if (ca[k] && cb[k] && ca[k] === cb[k]) both[k] = ca[k];
      else (summary.channelsOnlyIn[k] ??= {base: 0, head: 0})[ca[k] ? 'base' : 'head']++;
    }
    for (const k of Object.keys(both)) if (!summary.comparedExtraChannels.includes(k)) summary.comparedExtraChannels.push(k);
    const pa = partHashes(a.skin, both), pb = partHashes(b.skin, both);
    const parts = [];
    for (const key of new Set([...pa.keys(), ...pb.keys()])) {
      const x = pa.get(key), y = pb.get(key);
      if (!x || !y) { parts.push({key, part: (x ?? y).part, change: x ? 'removed' : 'added', triangles: [x?.triangles ?? 0, y?.triangles ?? 0]}); continue; }
      const fields = FIELDS.filter(f => x[f] !== y[f]).concat(Object.keys(both).filter(ch => x.extra[ch] !== y.extra[ch]));
      if (fields.length) parts.push({key, part: x.part, change: 'changed', fields, triangles: [x.triangles, y.triangles]});
    }
    const ba = boneHashes(a.graph), bb = boneHashes(b.graph), bones = [];
    for (const key of new Set([...ba.keys(), ...bb.keys()])) {
      const x = ba.get(key), y = bb.get(key);
      if (x !== y) bones.push({bone: key, change: !x ? 'added' : !y ? 'removed' : 'changed'});
    }
    const orderChanged = [...ba.keys()].join() !== [...bb.keys()].join();
    if (parts.length || bones.length || orderChanged) {
      summary.recipesChanged++;
      for (const p of parts) summary.changedParts[p.part] = (summary.changedParts[p.part] ?? 0) + 1;
      summary.changedBones += bones.length;
      summary.changed.push({name, parts, bones, boneOrderChanged: orderChanged,
        versions: {base: [a.graph.version, a.skin.version], head: [b.graph.version, b.skin.version]},
        totals: {base: {triangles: a.skin.triangleCount, vertices: a.skin.vertexCount, bones: a.graph.bones.length}, head: {triangles: b.skin.triangleCount, vertices: b.skin.vertexCount, bones: b.graph.bones.length}},
        headIssues: b.issues});
    } else summary.unchangedRecipes++;
  }
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.base || !args.head || !args.texts.length) {
    console.log('usage: node tests/tools/composer-part-diff.mjs --base <dir> --head <dir> --texts <file|builtin:skin2|builtin:specimens|builtin:graph435>[,...] [--out file] [--verbose]');
    process.exit(args.help ? 0 : 2);
  }
  const summary = await partDiff(args);
  if (args.out) writeFileSync(args.out, JSON.stringify(summary, null, 1) + '\n');
  const {changed, ...short} = summary;
  const printed = args.verbose ? summary : {...short, changed: changed.slice(0, 20).map(c => ({name: c.name, parts: c.parts.map(p => `${p.key}:${p.change}${p.fields ? '(' + p.fields.join('/') + ')' : ''}`), bones: c.bones.length})), changedListTruncated: changed.length > 20};
  console.log(JSON.stringify(printed, null, 1));
  process.exit(summary.errors.length ? 1 : 0);
}
