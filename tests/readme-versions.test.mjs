// README version strings equal the code constants (backlog task 16, PLACE-QUERY-2 / PLATFORM-DOCS).
//
// The README's "Architecture and limits" section describes the CURRENT build, so every model version string it names
// must be a current code constant, and it must name the catalogue, terrain and place-query versions. The rest of the
// README is a dated changelog whose old version strings are history and are not checked.
// NEEDS-REGISTRATION: fails until the README hunk in test-results/place-query-2/README.patch (merger-owned README) is
// applied; then register it in the test selection (package.json / tier sets are merger-owned).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION as CATALOG_VERSION} from '../src/catalog.ts';
import {TERRAIN_VERSION} from '../src/terrain.ts';
import {PLACE_QUERY_VERSION} from '../src/place-query.ts';
import {OCEAN_VOLUME_VERSION} from '../src/ocean-volume.ts';
import {LOD_LADDER_VERSION} from '../src/lod-ladder.ts';
import {GEOPHYSICS_VERSION} from '../src/planet-geophysics.ts';
import {SURFACE_VERSION} from '../src/world-surface.ts';
import {BIOME_VERSION} from '../src/surface-biomes.ts';
import {CLIMATE_VERSION} from '../src/surface-climate.ts';

const README = readFileSync(new URL('../README.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const CURRENT = new Set([CATALOG_VERSION, TERRAIN_VERSION, PLACE_QUERY_VERSION, OCEAN_VOLUME_VERSION, LOD_LADDER_VERSION,
  GEOPHYSICS_VERSION, SURFACE_VERSION, BIOME_VERSION, CLIMATE_VERSION]);
/** Model version strings as the README writes them (catalogue atlas-x.y.z, terrain-x.y.z[-tag], and the dashed keys). */
const VERSION_LIKE = /\b(?:atlas-\d+\.\d+\.\d+|terrain-\d+\.\d+\.\d+(?:-[a-z0-9]+)*|place-query-\d+|lod-ladder-\d+|ocean-volume-\d+|planet-geophysics-\d+|atlas-surface-[\w-]+|surface-biomes-[\w.-]+|surface-climate-[\w.-]+)\b/g;

function architectureSection(text) {
  const start = text.indexOf('\n## Architecture and limits\n');
  assert.ok(start >= 0, 'README has an "Architecture and limits" section');
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? text.length : end);
}

test('README "Architecture and limits" names only current version strings (code constants)', () => {
  const section = architectureSection(README);
  const found = [...section.matchAll(VERSION_LIKE)].map(m => m[0]);
  assert.ok(found.length > 0, 'the section names versions');
  const stale = found.filter(v => !CURRENT.has(v));
  assert.deepEqual(stale, [], `stale version strings in the README section: ${stale.join(', ')}`);
  for (const v of [CATALOG_VERSION, TERRAIN_VERSION, PLACE_QUERY_VERSION])
    assert.ok(section.includes('`' + v + '`'), `the section names the current ${v}`);
});

test('README "Architecture and limits" makes no stale asset claim', () => {
  const section = architectureSection(README);
  assert.doesNotMatch(section, /no downloaded art/i, 'binary assets ship with provenance sidecars (tests/asset-provenance.test.mjs)');
  assert.match(section, /asset-provenance/);
});

test('control: the checker rejects the stale pre-patch lines', () => {
  const stale = '\n## Architecture and limits\n- `src/catalog.ts`: version `atlas-1.1.0`.\n- `src/terrain.ts`, version `terrain-1.3.0`.\n## Next\n';
  const found = [...architectureSection(stale).matchAll(VERSION_LIKE)].map(m => m[0]);
  assert.deepEqual(found, ['atlas-1.1.0', 'terrain-1.3.0']);
  assert.ok(found.every(v => !CURRENT.has(v)));
});
