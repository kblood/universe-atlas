// Node 24's test CLI reads process.argv after synchronous --require preloads.
// Expand the curated list in memory so npm's Windows cmd.exe command stays short,
// while Node retains its native discovery, isolation, reporters, flags and status.
// --require is inherited by test workers; never expand their argv (or descendants).
if (process.execArgv.includes('--test') && process.env.NODE_TEST_CONTEXT === undefined) {
  const isolation = process.execArgv.flatMap((arg, i, args) => arg === '--test-isolation'
    ? [args[i + 1]] : arg.startsWith('--test-isolation=') ? [arg.slice('--test-isolation='.length)] : []).at(-1);
  // In this mode Node loads preloads AFTER discovery. Refuse before loading any
  // test file rather than silently discovering tests outside the curated list.
  if (isolation === 'none') throw new Error('curated npm test requires --test-isolation=process; --test-isolation=none loads its manifest preload after discovery');
  const {registeredTests} = require('./test-selection.mjs');
  process.argv.push(...registeredTests());
}
