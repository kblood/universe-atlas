// Known-failures allowlist rules for `npm run test:full` (tests/known-failures.json, docs/test-policy.md "Result classes").
// Hardening of 2026-10-07 (docs/test-fixes-2026-10-07.md; Astra review 2026-10-05 item 3): an entry used to be keyed by
// title + file alone, so a CONTRACT failure (a pinned numeric target only the owner may change) could be waved through
// exactly like a flake. Now every `failures` entry declares its result class, and:
//   - class is HARD or CONTRACT (VISUAL-ADVISORY never fails a test; timing goes to tests/perf and is never allowed);
//   - a test whose title declares its class ("HARD: ...", "CONTRACT: ...") must be listed under that class;
//   - a CONTRACT entry must cite `decision`: a docs/ file that exists and names the exact test title (the owner
//     decision accepting the failure), otherwise the allowlist is invalid;
//   - an invalid allowlist rejects the whole run before any test runs (fail closed), and a CONTRACT-titled failure is
//     matched only by a valid CONTRACT entry even if validation were bypassed.
import {readFileSync, existsSync} from 'node:fs';
import {resolve, sep} from 'node:path';

export const ENTRY_CLASSES = Object.freeze(['HARD', 'CONTRACT']);
const REQUIRED = ['title', 'file', 'reason', 'owner', 'class'];

/** The class a test title declares by its prefix ("HARD:", "CONTRACT ..."), or null. */
export function titleClass(title) {
  const m = /^(HARD|CONTRACT)\b/.exec(String(title));
  return m ? m[1] : null;
}

const defaultReadDoc = path => {
  const docs = resolve('docs') + sep, abs = resolve(path);
  if (!abs.startsWith(docs) || !existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
};

/** Problems with one CONTRACT entry's decision reference ([] = valid). */
function decisionProblems(entry, readDoc) {
  if (typeof entry.decision !== 'string' || !entry.decision.trim()) return ['CONTRACT entry without a `decision` record (an owner decision under docs/)'];
  const path = entry.decision.split('#')[0];
  if (!/^docs\/[^]+\.md$/.test(path)) return [`decision ${entry.decision} is not a docs/*.md path`];
  const text = readDoc(path);
  if (text == null) return [`decision record ${path} does not exist under docs/`];
  if (!text.includes(entry.title)) return [`decision record ${path} does not name the test title verbatim`];
  return [];
}

/** Validate tests/known-failures.json (parsed). Returns a list of problems; empty = valid. */
export function validateKnown(doc, {readDoc = defaultReadDoc} = {}) {
  const problems = [];
  if (!doc || !Array.isArray(doc.failures)) return ['`failures` must be an array'];
  const seen = new Set();
  doc.failures.forEach((e, i) => {
    const at = `failures[${i}]${e && e.title ? ` (${e.file}: ${e.title})` : ''}`;
    if (!e || typeof e !== 'object') {problems.push(`${at}: not an object`); return;}
    for (const k of REQUIRED) if (typeof e[k] !== 'string' || !e[k].trim()) problems.push(`${at}: missing \`${k}\``);
    if (typeof e.class === 'string' && !ENTRY_CLASSES.includes(e.class)) problems.push(`${at}: class ${e.class} is not one of ${ENTRY_CLASSES.join(', ')}`);
    if (typeof e.file === 'string' && (!/^(?:tests|scripts)\/.+\.test\.mjs$/.test(e.file) || e.file.startsWith('tests/perf/'))) problems.push(`${at}: file must be a registered tests/**/*.test.mjs or scripts/**/*.test.mjs path outside tests/perf/ (timing is never allowlisted)`);
    const declared = titleClass(e.title);
    if (declared && e.class !== declared) problems.push(`${at}: the title declares ${declared} but the entry says ${e.class}`);
    if (e.class === 'CONTRACT') for (const p of decisionProblems(e, readDoc)) problems.push(`${at}: ${p}`);
    const key = `${e.file}\u0000${e.title}`;
    if (seen.has(key)) problems.push(`${at}: duplicate entry`);
    seen.add(key);
  });
  return problems;
}

/** Split failures into matched (allowlisted), fresh (NEW) and stale entries. A CONTRACT-titled failure is matched only by a
 * CONTRACT entry carrying a decision (defence in depth; validateKnown has already required the record to exist). */
export function classify(failures, known) {
  const matches = (f, k) => f.title === k.title && f.file === k.file
    && (titleClass(f.title) !== 'CONTRACT' || (k.class === 'CONTRACT' && typeof k.decision === 'string' && k.decision.length > 0));
  return {
    matched: failures.filter(f => known.some(k => matches(f, k))),
    fresh: failures.filter(f => !known.some(k => matches(f, k))),
    stale: known.filter(k => !failures.some(f => matches(f, k))),
  };
}
