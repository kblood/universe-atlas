import assert from 'node:assert/strict';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const base = process.env.ATLAS_URL || 'https://dionysus.dk/webxr/IWSDK/universe-atlas/';
const expectedCommit = process.env.ATLAS_EXPECTED_COMMIT || '4796b1ae9f83a91902dd5240d62651077307345d';
const dist = process.env.ATLAS_DIST || 'C:/LLM/IWSDK/universe-atlas/dist';
const out = process.env.ATLAS_RESULTS || 'test-results/deploy-4796b1a';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fetchBytes = async url => {
  const response = await fetch(url, { cache: 'no-store' });
  assert.equal(response.status, 200, `${url} returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

const stampBytes = await fetchBytes(new URL('build-info.json', base));
const stamp = JSON.parse(stampBytes.toString('utf8'));
assert.equal(stamp.commit, expectedCommit, 'live build stamp matches exact release commit');
assert.equal(stamp.dirty, false, 'live build was built from a clean tree');

const localIndex = await readFile(path.join(dist, 'index.html'));
const liveIndex = await fetchBytes(new URL('index.html', base));
assert.equal(sha256(liveIndex), sha256(localIndex), 'live HTML matches release checkout dist');
const jsFiles = (await readdir(path.join(dist, 'assets'))).filter(name => name.endsWith('.js')).sort();
assert.ok(jsFiles.length > 0, 'release dist has JavaScript assets');
const assets = [];
for (const name of jsFiles) {
  const local = await readFile(path.join(dist, 'assets', name));
  const live = await fetchBytes(new URL(`assets/${name}`, base));
  const localSha256 = sha256(local), liveSha256 = sha256(live);
  assert.equal(liveSha256, localSha256, `live asset ${name} matches release checkout dist`);
  assets.push({ name, bytes: local.byteLength, sha256: localSha256 });
}

const report = { ok: true, base, expectedCommit, stamp, dist, index: { bytes: localIndex.byteLength, sha256: sha256(localIndex) }, jsCount: assets.length, jsBytes: assets.reduce((sum, item) => sum + item.bytes, 0), assets };
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'live-assets.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, expectedCommit, stamp, index: report.index, jsCount: report.jsCount, jsBytes: report.jsBytes }, null, 2));
