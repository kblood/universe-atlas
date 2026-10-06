Source and test changes are implemented, but **validation and digest repinning remain blocked** by filesystem permissions.

Files changed:

- `src/mountain-envelope.ts`: frozen margin constants, `coarseMarginH()`, version `massif-envelope-4`.
- `src/terrain.ts`: computes `uf` once, applies its margin, and maximizes non-skipped candidates with fallback to `main`.
- `src/mountain-layout.ts`: skip scalar becomes `END_H`; version `orogen-layout-4`.
- `tests/helpers/mountain-coarse-field.mjs`: ratio/bin measurements, interior-only negative control, updated zero-margin mutant, positive-belt counter, old-max mutant.
- `tests/mountain-coarse-field.test.mjs`: enclosure, tightness, separation, ramp and old-max checks.
- `tests/mountain-envelope.test.mjs`, `tests/mountain-layout.test.mjs`, `tests/mountain-layout-grid.test.mjs`, `tests/terrain-mountains-assembly.test.mjs`: version pins.
- `test-results/mountains/t6-margin/repin-coarse.mjs`: prepared repinning script; checks field identity and switch-tile non-parent fields against HEAD before writing.

Exact constants:

```ts
{ INTERIOR_H: 0.002, END_H: 0.2, RAMP_FROM: 0.94, RAMP_TO: 0.99 }
```

Check results:

| Command | Result |
|---|---|
| `node tests/helpers/test-slot.mjs -- npx tsc --noEmit -p .` | **Exit 1**, before compiler execution |
| `node tests/helpers/test-slot.mjs -- node --test tests/mountain-coarse-field.test.mjs tests/mountain-envelope.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/terrain-mountains-assembly.test.mjs tests/lod-carving-reduction.test.mjs` | Not run: shared-slot blocker |
| `node tests/helpers/test-slot.mjs -- node --test tests/lod-coarse-frame.test.mjs` | Not run: shared-slot blocker |
| `node tests/helpers/test-slot.mjs -- node test-results/mountains/t6-baked/field-report.mjs` | Not run: shared-slot blocker |
| `git diff --check` | **Exit 0** |

The blocker is `EPERM: mkdir C:\LLM\IWSDK\.atlas-test-slot`, outside the writable worktree. No writable shared-slot arrangement arrived after the clarification request.

Consequently, there are **no new measured frame/statistics/enclosure/control/build-time results**, and **no old → new digest ledger yet**. `lod-carving-reduction.test.mjs` still has its original digests.

ROOM pins, truth-core text, wiring flag, terrain/LOD versions, and docs are unchanged. No commits or Git writes were performed.