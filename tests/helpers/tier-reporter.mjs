// node:test reporter for the tiered runner (docs/test-tiers-2026-10-07.md): appends ONE JSON line per finished
// top-level test to $ATLAS_TIER_RESULTS, fsynced, so a killed run loses at most the test in flight. Built-ins only.
// Line: {t, file, test, class, status, skipReason, coverage, ms, known, diag}. class comes from the title prefix
// (HARD:/CONTRACT:/VISUAL-ADVISORY:/INFO:); unprefixed deterministic tests count as HARD (docs/test-policy.md).
import {openSync, writeSync, fsyncSync, closeSync, readFileSync} from 'node:fs';
import {relative, isAbsolute} from 'node:path';
import {classify} from './known-failures.mjs';

export const classOf = title => (/^(HARD|CONTRACT|VISUAL-ADVISORY|INFO):/.exec(title) || [, 'HARD'])[1];
export function appendLine(path, row) {
  const fd = openSync(path, 'a');
  try { writeSync(fd, JSON.stringify(row) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
}
const rel = f => (isAbsolute(f || '') ? relative(process.cwd(), f) : f || '').replaceAll('\\', '/');

export default async function* tierReporter(source) {
  const out = process.env.ATLAS_TIER_RESULTS;
  if (!out) throw new Error('ATLAS_TIER_RESULTS is required');
  let known = [];
  try { known = JSON.parse(readFileSync('tests/known-failures.json', 'utf8')).failures; } catch {}
  const tier = process.env.ATLAS_TEST_FULL === '1' ? 'gate' : process.env.ATLAS_TEST_TIER || 'default';
  const aware = process.env.ATLAS_TIER_AWARE === '1';
  // node:test emits a test's own diagnostics AFTER its test:pass/test:fail (subtest diagnostics before), so a row is
  // written when the file's next top-level test starts, 100 ms after it finished, or at the end of the stream.
  const sub = new Map(), pending = new Map();
  const flush = file => {const row = pending.get(file);if (!row) return;pending.delete(file);row.diag = row.diag.slice(0, 3);appendLine(out, row);};
  for await (const event of source) {
    const d = event.data, file = rel(d.file);
    if (event.type === 'test:start' && d.nesting === 0) flush(file);
    if (event.type === 'test:diagnostic' && d.file) {
      if (d.nesting === 0 && pending.has(file)) pending.get(file).diag.push(d.message);
      else (sub.get(file) ?? sub.set(file, []).get(file)).push(d.message);
    }
    if ((event.type === 'test:pass' || event.type === 'test:fail') && d.nesting === 0) {
      flush(file);
      const title = d.name, fail = event.type === 'test:fail';
      const status = d.todo ? 'todo' : d.skip ? 'skip' : fail ? 'fail' : 'pass';
      const msgs = sub.get(file) ?? [];sub.delete(file);
      if (fail && d.details?.error) msgs.unshift(String(d.details.error.cause?.message ?? d.details.error.message ?? d.details.error).slice(0, 600));
      pending.set(file, {t: new Date().toISOString(), file, step: process.env.ATLAS_TIER_STEP || file, test: title, class: classOf(title), status,
        skipReason: typeof d.skip === 'string' ? d.skip : typeof d.todo === 'string' ? d.todo : undefined,
        coverage: aware && (tier === 'smoke' || tier === 'work') ? 'subset' : 'full', ms: Math.round(d.details?.duration_ms ?? 0),
        known: fail && classify([{title, file}], known).matched.length > 0, attempt: Number(process.env.ATLAS_TIER_ATTEMPT || 1), diag: msgs});
      setTimeout(() => flush(file), 100).unref();
      yield `${fail ? 'FAIL' : status.toUpperCase()} ${file} :: ${title}\n`;
    }
  }
  for (const file of [...pending.keys()]) flush(file);
}
