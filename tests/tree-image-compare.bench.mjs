// Focused CPU microbenchmark of the exact embedded-image equality operation
// used by prepareTreeLODPair. It reads the shipped GLBs and compares the real
// LOD image bufferViews; no renderer or GPU is involved.
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { performance } from 'node:perf_hooks';

const trials = Math.max(7, Math.min(31, Number(process.env.ATLAS_TREE_COMPARE_TRIALS) || 9));

function readGlb(path) {
  return readFile(path).then(bytes => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12, json;
    while (offset < bytes.byteLength) {
      const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
      if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length));
      else if (type === 0x004e4942) return { json, binary: bytes.subarray(offset + 8, offset + 8 + length) };
      offset += 8 + length;
    }
    throw new Error(`No BIN chunk in ${path}`);
  });
}

function embeddedImages(doc) {
  return doc.json.images.map(image => {
    const bufferView = doc.json.bufferViews[image.bufferView];
    return doc.binary.subarray(bufferView.byteOffset ?? 0,
      (bufferView.byteOffset ?? 0) + bufferView.byteLength);
  });
}

function equalSome(a, b) {
  return a.length === b.length && !a.some((byte, index) => byte !== b[index]);
}

function equalIndexed(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function time(fn, a, b) {
  const start = performance.now();
  const equal = fn(a, b);
  return { equal, elapsedMs: performance.now() - start };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

async function benchmark(family, names) {
  const root = `public/assets/forest/desktop-v1/${family}`;
  const [lod0, lod1] = await Promise.all(names.map(name => readGlb(`${root}/${name}.glb`)));
  const a = embeddedImages(lod0), b = embeddedImages(lod1);
  if (a.length !== 4 || b.length !== 4 || a.some((image, i) => image.byteLength !== b[i].byteLength)) {
    throw new Error(`${family} image views do not match the shipped tree contract`);
  }
  const equalSomeAll = () => a.every((image, i) => equalSome(image, b[i]));
  const equalIndexedAll = () => a.every((image, i) => equalIndexed(image, b[i]));
  if (!equalSomeAll() || !equalIndexedAll()) throw new Error(`${family} LOD image bytes are not identical`);
  for (let i = 0; i < 3; i++) { equalSomeAll(); equalIndexedAll(); }

  const rows = { some: [], indexed: [] };
  for (let trial = 0; trial < trials; trial++) {
    const order = trial % 2 === 0 ? ['some', 'indexed'] : ['indexed', 'some'];
    for (const method of order) {
      const result = time(method === 'some' ? equalSomeAll : equalIndexedAll);
      if (!result.equal) throw new Error(`${family} ${method} comparison changed equality`);
      rows[method].push({ trial, order: order.join(','), elapsedMs: result.elapsedMs });
    }
  }
  const paired = rows.some.map((some, i) => ({ trial: some.trial,
    someMs: some.elapsedMs, indexedMs: rows.indexed[i].elapsedMs,
    indexedMinusSomeMs: rows.indexed[i].elapsedMs - some.elapsedMs }));
  const mismatchChecks = [0, 1, 2, 3].map(image => {
    const source = a[image], target = b[image];
    const first = target.slice(), middle = target.slice(), last = target.slice();
    if (target.length < 3) throw new Error('Expected image buffers with at least three bytes');
    first[0] ^= 0xff; middle[Math.floor(target.length / 2)] ^= 0xff;
    last[target.length - 1] ^= 0xff;
    return [equalIndexed(source, first), equalIndexed(source, middle), equalIndexed(source, last)];
  });
  const unequalLength = equalIndexed(a[0], a[0].subarray(1));
  if (mismatchChecks.some(row => row.some(Boolean)) || unequalLength) {
    throw new Error(`${family} indexed equality accepted a mismatch`);
  }
  return { family, imageBytes: a.map(image => image.byteLength),
    some: { p50Ms: median(rows.some.map(row => row.elapsedMs)), trials: rows.some },
    indexed: { p50Ms: median(rows.indexed.map(row => row.elapsedMs)), trials: rows.indexed },
    paired, mismatchChecks, unequalLengthAccepted: unequalLength };
}

const result = { ok: true, method: 'real embedded LOD0/LOD1 PNG view equality; paired alternating order; CPU-only; no renderer/GPU',
  environment: { platform: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model ?? 'unknown', node: process.version, trials },
  families: [await benchmark('branching', ['oak-lod0', 'oak-lod1']),
    await benchmark('spire', ['conifer-lod0', 'conifer-lod1'])] };
console.log(JSON.stringify(result, null, 2));
