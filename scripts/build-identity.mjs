import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

// Shared by the app server/build and benchmark reporters. Never infer a clean
// checkout from a failed git probe (including an uninitialized submodule).
// Deliberately limited to root-level plain-text notes. Code, configuration,
// and runtime assets must never become clean by listing them as exclusions.
function validatedUntrackedPaths(paths) {
  if (!Array.isArray(paths) || paths.some(path => typeof path !== 'string' || !path ||
      /[\\/:*?\n\r\0]/.test(path) || !/^[^.].*\.txt$/i.test(path) ||
      /config|settings/i.test(path) || /^(?:CMakeLists|requirements(?:[.-].*)?|constraints(?:[.-].*)?)\.txt$/i.test(path))) {
    throw new Error('ATLAS_IDENTITY_ALLOW_UNTRACKED must be a JSON array of exact root-level .txt note paths; source, configuration, and runtime assets cannot be excluded.');
  }
  return [...new Set(paths)];
}

// Default empty; only untracked entries can be excluded, and the configured
// paths and actual exclusions remain visible in reports.
export function identityUntrackedAllowlist(value = process.env.ATLAS_IDENTITY_ALLOW_UNTRACKED || '[]') {
  return validatedUntrackedPaths(JSON.parse(value));
}

export function sourceCleanliness(entries, allowedUntrackedPaths = []) {
  const validatedPaths = validatedUntrackedPaths(allowedUntrackedPaths);
  const allowed = new Set(validatedPaths.map(path => `?? ${path}`));
  const excluded = entries.filter(entry => allowed.has(entry));
  const sourceEntries = entries.filter(entry => !allowed.has(entry));
  return { sourceDirty: sourceEntries.length > 0, sourceWorkingTree: sourceEntries.join('\n').trim(),
    allowedUntrackedPaths: validatedPaths, excludedUntrackedPaths: excluded.map(entry => entry.slice(3)) };
}

export function gitIdentity(root, { allowedUntrackedPaths = [] } = {}) {
  const git = args => {
    const output = execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8', timeout: 10000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Preserve leading status columns and filename whitespace in NUL records.
    return args[0] === 'status' ? output : output.trim();
  };
  try {
    const repositoryRoot = realpathSync(git(['rev-parse', '--show-toplevel']));
    const requestedRoot = realpathSync(root);
    if (repositoryRoot.toLowerCase() !== requestedRoot.toLowerCase()) {
      throw new Error(`Expected a repository rooted at ${requestedRoot}, found ${repositoryRoot}`);
    }
    const entries = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
    const workingTree = entries.join('\n').trim();
    return { commit: git(['rev-parse', 'HEAD']), branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
      subject: git(['log', '-1', '--format=%s']), dirty: entries.length > 0, workingTree, workingTreeEntries: entries,
      ...sourceCleanliness(entries, allowedUntrackedPaths) };
  } catch (error) {
    return { commit: null, branch: null, subject: null, dirty: null, workingTree: null, workingTreeEntries: null,
      sourceDirty: null, sourceWorkingTree: null, allowedUntrackedPaths, excludedUntrackedPaths: [], error: error.message };
  }
}

export function checkoutIdentity(root) {
  return { atlas: gitIdentity(root, { allowedUntrackedPaths: identityUntrackedAllowlist() }),
    treeKit: gitIdentity(resolve(root, 'external/tree-kit')) };
}

export const STATUS_EXCLUSION_POLICY = 'root-text-notes-v1';
export const EMPTY_STATUS_SHA256 = createHash('sha256').update('[]').digest('hex');

// Explicit public-output whitelist: never spread a detailed identity into a
// production artifact, including errors that could contain private paths.
export function publicBuildIdentity(identity) {
  const entries = identity.workingTreeEntries;
  const known = Array.isArray(entries);
  const source = known ? sourceCleanliness(entries, identity.allowedUntrackedPaths) : null;
  const excluded = new Set(source?.excludedUntrackedPaths.map(path => `?? ${path}`));
  const sourceEntries = known ? entries.filter(entry => !excluded.has(entry)) : null;
  const digest = records => records === null ? null : createHash('sha256').update(JSON.stringify(records)).digest('hex');
  return { commit: identity.commit, branch: identity.branch, subject: identity.subject,
    dirty: known ? entries.length > 0 : null, sourceDirty: source?.sourceDirty ?? null,
    workingTreeEntryCount: known ? entries.length : null, sourceEntryCount: sourceEntries?.length ?? null,
    allowedUntrackedPathCount: source?.allowedUntrackedPaths.length ?? null,
    excludedUntrackedPathCount: source?.excludedUntrackedPaths.length ?? null,
    workingTreeSha256: digest(known ? entries : null), sourceWorkingTreeSha256: digest(sourceEntries),
    exclusionPolicy: STATUS_EXCLUSION_POLICY };
}

export function createBuildInfo(root, { mode = 'build' } = {}) {
  const detailed = checkoutIdentity(root);
  const atlas = mode === 'development' ? detailed.atlas : publicBuildIdentity(detailed.atlas);
  const treeKit = mode === 'development' ? detailed.treeKit : publicBuildIdentity(detailed.treeKit);
  // Preserve the existing top-level fields used by pinned-build harnesses.
  return { schemaVersion: 2, ...atlas, atlas, treeKit, mode, builtAt: new Date().toISOString() };
}
