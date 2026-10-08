// docs/platform-getting-started.md doc-test (backlog task 16, PLATFORM-DOCS): the guide's example (address -> date ->
// placeAt -> coastAt) is extracted, run as written in two fresh processes, and its output must equal the same query made
// here. A guide whose example drifts from the API fails this test.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {galaxies, refByAddress, system} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../src/world-time.ts';
import {sine, detCos} from '../src/det-math.ts';
import {placeAt, coastAt, PLACE_VERSIONS, PLACE_QUERY_VERSION} from '../src/place-query.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOC = readFileSync(new URL('../docs/platform-getting-started.md', import.meta.url), 'utf8');
const MARKER = '<!-- doctest:getting-started';

/** The fenced js block right after the doctest marker. */
function example() {
  const at = DOC.indexOf(MARKER);
  assert.ok(at >= 0, 'the guide marks its runnable example');
  const m = /```js\r?\n([\s\S]*?)\r?\n```/.exec(DOC.slice(at));
  assert.ok(m, 'a ```js block follows the marker');
  return m[1];
}

/** Run the example from a temp module whose './src/' imports point at this tree; returns stdout. */
function runExample(code) {
  const srcUrl = pathToFileURL(join(ROOT, 'src')).href + '/';
  const text = code.replace(/from '\.\/src\/([^']+)'/g, (_, f) => `from '${srcUrl}${f}'`);
  assert.notEqual(text, code, 'the example imports from ./src/');
  const dir = mkdtempSync(join(tmpdir(), 'atlas-getting-started-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"type": "module"}');
    const file = join(dir, 'example.mjs');
    writeFileSync(file, text);
    return execFileSync(process.execPath, [file], {cwd: ROOT, encoding: 'utf8', timeout: 120_000});
  } finally { rmSync(dir, {recursive: true, force: true}); }
}

test('the guide walks address -> date -> placeAt -> coastAt and names the determinism promise and version keys', () => {
  const order = ['galaxies(', 'system(refByAddress(galaxy', 'CATALOGUE_EPOCH_NS +', 'placeAt(ctx', 'coastAt(ctx'].map(k => example().indexOf(k));
  assert.ok(order.every(i => i >= 0), `example uses every step (${order})`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'in the documented order');
  assert.match(DOC, /## The determinism promise/);
  assert.match(DOC, /## Version keys/);
  for (const k of Object.keys(PLACE_VERSIONS)) assert.ok(DOC.includes(k), `guide names the version key ${k}`);
  assert.ok(DOC.includes('place-query-v2.md') && DOC.includes('place-query-v1.md'));
});

test('the example runs as written and its output equals the same query made here (twice, fresh processes)', () => {
  const code = example();
  const first = runExample(code), second = runExample(code);
  assert.equal(second, first, 'deterministic across processes');
  const out = JSON.parse(first.trim().split('\n').at(-1));

  // The same query, made directly.
  const sys = system(refByAddress(galaxies('LETHRA-001')[0], 'G001/C2128,0,1/0')), body = sys.planets[1];
  const t = CATALOGUE_EPOCH_NS + 500_000_000n * YEAR_NS, ctx = {sys, body, t};
  const direction = (latDeg, lonDeg) => {
    const lat = latDeg * Math.PI / 180, lon = lonDeg * Math.PI / 180;
    const v = [detCos(lat) * detCos(lon), sine(lat), detCos(lat) * sine(lon)], n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / n, v[1] / n, v[2] / n];
  };
  const place = placeAt(ctx, direction(20, 45)), coast = coastAt(ctx, direction(20, 45));
  assert.equal(place.exists, true);
  assert.deepEqual(out, JSON.parse(JSON.stringify({
    body: body.name, exists: place.exists, groundHeightM: place.groundHeightM, seaLevelM: place.seaLevelM, ocean: place.ocean,
    waterDepthM: place.waterDepthM, airPressurePa: place.airPressurePa, gravityMS2: place.gravityMS2, biome: place.biome.name,
    heightAboveSeaM: coast.heightAboveSeaM, seaSign: coast.seaSign,
    transect: [0, 10, 20, 30, 40].map(lon => coastAt(ctx, direction(20, lon)).seaSign),
    versions: place.versions, sameVersions: true,
  })));
  assert.equal(out.body, 'Maithea');
  assert.equal(out.versions.placeQuery, PLACE_QUERY_VERSION);
  assert.ok(out.seaLevelM < 0, 'the example date has a dated sea below the datum');
  assert.equal(out.ocean, out.heightAboveSeaM < 0);
});
