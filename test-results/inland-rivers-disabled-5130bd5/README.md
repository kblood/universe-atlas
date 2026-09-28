# Inland rivers withdrawal verification

Runtime candidate: `5130bd53e46ba0f882adf6bc22d6fc1628e53b5f`, based on the published `e0d9d9c` runtime. The browser acceptance receipt is in [inland-rivers-disabled-5130bd5-landing-rerun](../inland-rivers-disabled-5130bd5-landing-rerun/README.md).

## Independent CPU and build checks

The following focused command completed with **104 passed, 0 failed, 0 skipped**:

```powershell
node --test tests/inland-rivers-disabled.test.mjs tests/river-determinism.test.mjs tests/river-environment.test.mjs tests/river-terrain.test.mjs tests/river.test.mjs tests/river-water.test.mjs tests/river-surface.test.mjs tests/river-surface-conform.test.mjs tests/river-surface-bank.test.mjs tests/river-physical-field.test.mjs tests/world-surface.test.mjs
```

`npx tsc --noEmit`, `git diff --check` and `npm run build` also passed. The production build stamp was the candidate SHA above with `dirty: false` (`2026-09-28T18:58:10.257Z`).

Claude Code Opus 5.5 ran the implementation in the isolated worktree from exact baseline `e0d9d9c07509f53fa3a3385afb3e587c9c5b7999` and committed runtime change `944e2d9`. The runner returned first-party `claude-opus-5-5`, `terminal_reason: completed`, exit code 0. Its selected broader Node set, typecheck and build passed except three failures already present on the baseline: `version-compat` expecting the prior history version, `time-nav` horizon gating, and cosmology `scaleFactorAt` saturation. The runner did not provide aggregate test counts, so this record makes no broad-suite pass-count claim.

The preserved request and raw result are available as [task brief](../river-disable-opus-944e2d9/task-brief.md), [launch metadata with input hashes](../river-disable-opus-944e2d9/launch-metadata.json), [process receipt](../river-disable-opus-944e2d9/process.json), [exit receipt](../river-disable-opus-944e2d9/exit.json), and [unmodified Opus response](../river-disable-opus-944e2d9/response.json).

The browser run verified the legacy `?river=` notice and URL cleanup, absence of river controls/rendering, a dated ocean at −4500 m, and free-flight → descent → grounded contact with no browser errors. Ocean draw activity confirms rendering remained active; it is not an ocean visual-quality claim. The run does not validate the experimental forest or fauna presentation.
