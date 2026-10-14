import { sourceCleanliness, EMPTY_STATUS_SHA256, STATUS_EXCLUSION_POLICY } from '../../scripts/build-identity.mjs';

export async function fetchServedIdentity(base, { fetchImpl = fetch } = {}) {
  const url = new URL('build-info.json', base).href;
  const response = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Served app identity unavailable at ${url}: HTTP ${response.status}`);
  return { url, observedAt: new Date().toISOString(), build: await response.json() };
}

export async function fetchPageServedIdentity(page, base) {
  return page.evaluate(async path => {
    const url = new URL(path, location.href).href;
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Served app identity unavailable at ${url}: HTTP ${response.status}`);
    return { url, pageUrl: location.href, observedAt: new Date().toISOString(), build: await response.json() };
  }, new URL('build-info.json', base).pathname);
}

export function verifyServedIdentity(served, { atlasCommit, treeKitCommit, atlasStatus, treeKitStatus } = {}) {
  const build = served?.build;
  const findings = [];
  for (const [name, expected, expectedStatus] of [['atlas', atlasCommit, atlasStatus], ['treeKit', treeKitCommit, treeKitStatus]]) {
    const identity = build?.[name];
    const known = /^[a-f\d]{40}$/i.test(identity?.commit ?? '') &&
      typeof identity?.dirty === 'boolean' && (build.mode === 'build' ? validBuildSummary(identity) :
        build.mode === 'development' && typeof identity?.workingTree === 'string' &&
        identity.dirty === Boolean(identity.workingTree.trim()) && validSourceCleanliness(identity));
    findings.push({ code: `served-${name}-identity`, passed: known,
      detail: `The served app must identify the exact ${name} commit and working-tree state.`, observed: identity ?? null });
    findings.push({ code: `served-${name}-clean`, passed: known && (identity.sourceDirty ?? identity.dirty) === false,
      detail: `Release measurements require clean served ${name} source; dev reports retain exclusions and production metadata records their counts.`,
      observed: { dirty: identity?.dirty ?? null, sourceDirty: identity?.sourceDirty ?? identity?.dirty ?? null,
        allowedUntrackedPaths: identity?.allowedUntrackedPaths ?? null, excludedUntrackedPaths: identity?.excludedUntrackedPaths ?? null,
        allowedUntrackedPathCount: identity?.allowedUntrackedPathCount ?? identity?.allowedUntrackedPaths?.length ?? null,
        excludedUntrackedPathCount: identity?.excludedUntrackedPathCount ?? identity?.excludedUntrackedPaths?.length ?? null } });
    findings.push({ code: `served-${name}-expected-commit`, passed: known && Boolean(expected) && identity.commit === expected,
      detail: `The served ${name} commit must match the requested commit (default: the reporter checkout).`,
      observed: { expected: expected ?? null, served: identity?.commit ?? null } });
    if (build?.mode === 'build') findings.push({ code: `served-${name}-expected-status`,
      passed: known && Boolean(expectedStatus) && identity.workingTreeSha256 === expectedStatus.workingTreeSha256 &&
        identity.sourceWorkingTreeSha256 === expectedStatus.sourceWorkingTreeSha256,
      detail: `The production ${name} status digests must match the reporter checkout; matching HEAD alone cannot verify dirty source.`,
      observed: { expected: expectedStatus ?? null, served: identity ?? null } });
  }
  return findings;
}

export function sameServedIdentity(before, after) {
  const snapshot = served => JSON.stringify(['atlas', 'treeKit'].map(name => {
    const identity = served?.build?.[name];
    return [identity?.commit, identity?.dirty, identity?.workingTree, identity?.sourceDirty, identity?.sourceWorkingTree,
      identity?.workingTreeEntries, identity?.allowedUntrackedPaths, identity?.excludedUntrackedPaths,
      identity?.workingTreeSha256, identity?.sourceWorkingTreeSha256, identity?.workingTreeEntryCount,
      identity?.sourceEntryCount, identity?.allowedUntrackedPathCount, identity?.excludedUntrackedPathCount, identity?.exclusionPolicy];
  }).concat([served?.build?.mode, served?.build?.builtAt]));
  // Dev builtAt is the time of the request, so only compare the source identity.
  const withoutDevTime = served => served?.build?.mode === 'development'
    ? { ...served, build: { ...served.build, builtAt: null } } : served;
  return snapshot(withoutDevTime(before)) === snapshot(withoutDevTime(after));
}

function validBuildSummary(identity) {
  const counts = ['workingTreeEntryCount', 'sourceEntryCount', 'allowedUntrackedPathCount', 'excludedUntrackedPathCount'];
  const rawFields = ['workingTree', 'workingTreeEntries', 'sourceWorkingTree', 'allowedUntrackedPaths', 'excludedUntrackedPaths', 'error'];
  return !rawFields.some(key => key in identity) &&
    counts.every(key => Number.isSafeInteger(identity[key]) && identity[key] >= 0) &&
    typeof identity.sourceDirty === 'boolean' && identity.exclusionPolicy === STATUS_EXCLUSION_POLICY &&
    identity.dirty === (identity.workingTreeEntryCount > 0) && identity.sourceDirty === (identity.sourceEntryCount > 0) &&
    identity.sourceEntryCount + identity.excludedUntrackedPathCount === identity.workingTreeEntryCount &&
    identity.excludedUntrackedPathCount <= identity.allowedUntrackedPathCount &&
    /^[a-f\d]{64}$/i.test(identity.workingTreeSha256 ?? '') && /^[a-f\d]{64}$/i.test(identity.sourceWorkingTreeSha256 ?? '') &&
    (identity.workingTreeSha256 === EMPTY_STATUS_SHA256) === (identity.workingTreeEntryCount === 0) &&
    (identity.sourceWorkingTreeSha256 === EMPTY_STATUS_SHA256) === (identity.sourceEntryCount === 0) &&
    (identity.workingTreeSha256 === identity.sourceWorkingTreeSha256) === (identity.excludedUntrackedPathCount === 0);
}

function validSourceCleanliness(identity) {
  if (identity.sourceDirty === undefined) return true;
  // New source-cleanliness claims require the original NUL-delimited status
  // records as an array. A newline display cannot safely delimit filenames.
  if (!Array.isArray(identity.allowedUntrackedPaths) || !Array.isArray(identity.workingTreeEntries) ||
      identity.workingTreeEntries.some(entry => typeof entry !== 'string' || !entry || entry.includes('\0'))) return false;
  try {
    const derived = sourceCleanliness(identity.workingTreeEntries, identity.allowedUntrackedPaths);
    return identity.workingTree === identity.workingTreeEntries.join('\n').trim() &&
      identity.dirty === (identity.workingTreeEntries.length > 0) &&
      identity.sourceDirty === derived.sourceDirty && identity.sourceWorkingTree === derived.sourceWorkingTree &&
      JSON.stringify(identity.allowedUntrackedPaths) === JSON.stringify(derived.allowedUntrackedPaths) &&
      JSON.stringify(identity.excludedUntrackedPaths) === JSON.stringify(derived.excludedUntrackedPaths);
  } catch {
    return false;
  }
}
