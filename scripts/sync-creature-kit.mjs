#!/usr/bin/env node
// Creature-kit consumption (docs/creature-kit-consumption.md): Atlas holds a sha-pinned VENDORED copy of the creature
// kit's files at their original paths (src/fauna-composer*.ts, src/fauna-coat-*.ts, the export CLI, the composer tests
// and fixtures). vendor/creature-kit/VENDOR.json records the kit commit and the sha256 of every file;
// tests/creature-kit-vendor.test.mjs fails when a vendored file no longer matches it.
//
//   node scripts/sync-creature-kit.mjs [--kit <dir>]            check: Atlas files vs VENDOR.json vs the kit (exit 1 on drift)
//   node scripts/sync-creature-kit.mjs --write [--kit <dir>]    copy the kit's files in and rewrite VENDOR.json
//
// <dir> defaults to $CREATURE_KIT_DIR, else <repo>/../creature-kit. --write refuses a kit whose vendored paths have
// uncommitted changes, so VENDOR.json always names a commit that holds exactly these bytes. Nothing is downloaded and
// node_modules is never touched. sha256 is taken over LF-normalised text, so CRLF and LF checkouts hash the same; a
// written file keeps the line-ending style of the Atlas file it replaces.
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const VENDOR_SCHEMA = 'creature-kit-vendor-1';
const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const VENDOR_JSON = 'vendor/creature-kit/VENDOR.json';

/** Repo-relative paths owned by creature-kit. Same path in both repos. Atlas-only composer files (the Creature Lab,
 * fauna-review-*, tests/fauna-composer.test.mjs, tests/fauna-coat-fields.test.mjs with its lineage-B check,
 * tests/creature-core-boundary.test.mjs) are NOT vendored. */
export const VENDORED_PATHS = Object.freeze([
  'assets/briefs/creature-export-quest-3.json',
  'scripts/export-creature.mjs',
  'src/fauna-coat-fields.ts',
  'src/fauna-coat-vocab.ts',
  'src/fauna-composer-export.ts',
  'src/fauna-composer-eye-catalogue.ts',
  'src/fauna-composer-eye.ts',
  'src/fauna-composer-face-geometry.ts',
  'src/fauna-composer-face.ts',
  'src/fauna-composer-individual.ts',
  'src/fauna-composer-lod.ts',
  'src/fauna-composer-mesh.ts',
  'src/fauna-composer-recipe.ts',
  'src/fauna-composer-rig.ts',
  'src/fauna-composer-species.ts',
  'src/fauna-composer.ts',
  'tests/fauna-composer-coat.test.mjs',
  'tests/fauna-coat-allocation.bench.mjs',
  'tests/fauna-composer-coat-crisp.test.mjs',
  'tests/fauna-composer-export.test.mjs',
  'tests/fauna-composer-eye-catalogue-geometry.test.mjs',
  'tests/fauna-composer-eye-catalogue.test.mjs',
  'tests/fauna-composer-eyes.test.mjs',
  'tests/fauna-composer-face.test.mjs',
  'tests/fauna-composer-gait.test.mjs',
  'tests/fauna-composer-gloss.test.mjs',
  'tests/fauna-composer-head-geometry.test.mjs',
  'tests/fauna-composer-head-occlusion.test.mjs',
  'tests/fauna-composer-individual.test.mjs',
  'tests/fauna-composer-lod.test.mjs',
  'tests/fauna-composer-mesh-stability.test.mjs',
  'tests/fauna-composer-recipe-independent.test.mjs',
  'tests/fauna-composer-rig-independent.test.mjs',
  'tests/fauna-composer-skin-anatomy.test.mjs',
  'tests/fauna-composer-skin4-links.test.mjs',
  'tests/fauna-composer-structure-independent.test.mjs',
  'tests/fauna-face-specimens.json',
  'tests/fixtures/composer-baseline-v2.json',
  'tests/fixtures/composer-baseline-v3.json',
  'tests/fixtures/composer-eye-catalogue-links.json',
  'tests/fixtures/composer-skin2-links.json',
  'tests/fixtures/composer-skin3-links.json',
  'tests/fixtures/composer-skin4-links.json',
  'tests/fixtures/composer-skin5-links.json',
  'tests/fixtures/composer-v1-links.json',
  'tests/fixtures/creature-core-exports.json',
  'tests/helpers/composer-head-occlusion.mjs',
]);

export const lfText = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
export const lfSha256 = path => createHash('sha256').update(lfText(path)).digest('hex');
export const readVendor = (repo = REPO) => JSON.parse(readFileSync(join(repo, VENDOR_JSON), 'utf8'));

/** Drift rows between VENDOR.json, the Atlas files and (optional) a kit checkout. Empty = in sync. */
export function vendorDrift(repo = REPO, kitDir = null) {
  const vendor = readVendor(repo), rows = [];
  const pinned = new Map(vendor.files.map(f => [f.path, f.sha256]));
  for (const p of VENDORED_PATHS) if (!pinned.has(p)) rows.push(`${p}: in VENDORED_PATHS but not in ${VENDOR_JSON}`);
  for (const p of pinned.keys()) if (!VENDORED_PATHS.includes(p)) rows.push(`${p}: in ${VENDOR_JSON} but not in VENDORED_PATHS`);
  for (const [p, sha] of pinned) {
    const atlas = join(repo, p);
    if (!existsSync(atlas)) rows.push(`${p}: missing in Atlas`);
    else if (lfSha256(atlas) !== sha) rows.push(`${p}: Atlas file differs from VENDOR.json (edited in Atlas? change it in creature-kit and re-sync)`);
    if (kitDir) {
      const kit = join(kitDir, p);
      if (!existsSync(kit)) rows.push(`${p}: missing in the kit at ${kitDir}`);
      else if (lfSha256(kit) !== sha) rows.push(`${p}: the kit file differs from VENDOR.json (kit moved on: run --write)`);
    }
  }
  return rows;
}

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], {encoding: 'utf8'}).trim();

export function writeVendor(repo, kitDir) {
  const dirty = git(kitDir, 'status', '--porcelain', '--', ...VENDORED_PATHS);
  if (dirty) throw new Error(`creature-kit has uncommitted changes in vendored paths; commit them first:\n${dirty}`);
  const commit = git(kitDir, 'rev-parse', 'HEAD');
  const pkg = JSON.parse(readFileSync(join(kitDir, 'package.json'), 'utf8'));
  const files = [];
  for (const p of VENDORED_PATHS) {
    const src = join(kitDir, p), dst = join(repo, p);
    if (!existsSync(src)) throw new Error(`${p}: missing in the kit at ${kitDir}`);
    let text = lfText(src);
    if (existsSync(dst) && readFileSync(dst, 'utf8').includes('\r\n')) text = text.replace(/\n/g, '\r\n');
    if (!existsSync(dst) || readFileSync(dst, 'utf8') !== text) { mkdirSync(dirname(dst), {recursive: true}); writeFileSync(dst, text); }
    files.push({path: p, sha256: lfSha256(dst)});
  }
  const vendor = {
    schema: VENDOR_SCHEMA,
    kit: {name: pkg.name, version: pkg.version, commit, license: pkg.license},
    note: 'Files owned by creature-kit (C:/LLM/IWSDK/creature-kit), vendored at their original paths. Edit them in the kit, then run node scripts/sync-creature-kit.mjs --write --kit <dir>. sha256 is over LF-normalised text.',
    files,
  };
  mkdirSync(dirname(join(repo, VENDOR_JSON)), {recursive: true});
  writeFileSync(join(repo, VENDOR_JSON), `${JSON.stringify(vendor, null, 2)}\n`);
  return vendor;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), i = argv.indexOf('--kit');
  const kitDir = resolve(i >= 0 ? argv[i + 1] : process.env.CREATURE_KIT_DIR || join(REPO, '..', 'creature-kit'));
  try {
    if (argv.includes('--write')) {
      const v = writeVendor(REPO, kitDir);
      console.log(`synced ${v.files.length} files from creature-kit ${v.kit.version} @ ${v.kit.commit.slice(0, 12)}`);
    }
    const kit = existsSync(kitDir) ? kitDir : null;
    const rows = vendorDrift(REPO, kit);
    const v = readVendor(REPO);
    if (rows.length) { console.error(`creature-kit vendor drift (${rows.length}):\n  ${rows.join('\n  ')}`); process.exitCode = 1; }
    else console.log(`creature-kit vendor: ${v.files.length} files match VENDOR.json (kit ${v.kit.version} @ ${v.kit.commit.slice(0, 12)})${kit ? `; kit checkout ${kit} matches too` : '; no kit checkout to compare'}`);
  } catch (error) { console.error(`sync-creature-kit: ${error.message}`); process.exitCode = 1; }
}
