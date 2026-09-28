# Tree instance upload and tint checks

Implementation checkpoint: `851b221`. The reports' SHA-256 source and input
hashes identify the tested code and family-F GLBs. The final report records its
base commit and dirty worktree honestly; the parent subsequently verified that
those source hashes match the committed implementation.

- [Final CPU log](final-cpu.log): 33 cases, no failures or skips, with actual
  family-F inputs. Forest callbacks are simulated in CPU tests; they are not a
  full planetary browser test.
- [Build log](build.log): TypeScript and Vite build passed; the existing large
  JavaScript chunk warning remains. This local build was not deployed.
- [Genuine Opus review](opus/response.json), [input hashes](opus/inputs.json):
  `claude-opus-5-5`, firstParty. Source-only review before the tint-reset and
  initial-upload callback corrections. Later CPU/GPU checks exercise those
  corrections; they were not independently reviewed a second time.
- [Final hardware report](run-1790591702202/report.json): RTX 5090/D3D11,
  1440 x 1000, no recorded page/console/request/WebGL errors or failed
  assertions. It checks a 192-slot LOD0 batch's sparse/unchanged/hidden/initial
  update behavior, input rejection, regrowth and disposal. Both LODs also
  render tint/white replay under MASK/HASH and transmission off/0.35.

The renderer uses the public awaited `load()` promise and freezes its animation
loop. Explicit draws consume pending updates. Framebuffer checks use 32-bit
FNV hashes of WebGL pixels, excluding HTML. The three PNGs are page screenshots
including the controls; the frozen HUD can retain old loading text. It is not
used to determine readiness or measured pixels. These deliberately exaggerated
tints test data flow, not a realistic species palette or visual acceptance.
Inspect the [white baseline](run-1790591702202/white-before.png),
[tinted tree](run-1790591702202/tinted.png), and
[restored tree](run-1790591702202/white-restored.png).

The first run (`run-1790591446468`) failed five harness assertions: a sparse
attribute check read slot 1 instead of slot 191, and foliage alpha assertions
were incorrectly applied to bark. The corrected second run
(`run-1790591510207`) passed. The final run extends it to eight combinations
of LOD, coverage and transmission and explicitly records pre-compile GL errors
and dirty source state. Earlier runs remain preserved, not overwritten.

There is no instrumented driver-byte count, timing benchmark, XR validation,
far-canopy handoff, game adoption, or full-forest acceptance in this fixture.
Pending range payload is a CPU description of scheduled updates, not a frame
budget or a measured bandwidth saving.

## Reproduce

Serve this checkout using Vite on port 5197. From this project directory:

```powershell
$env:ATLAS_HARDWARE = '1'
$env:ATLAS_TREE_CANDIDATE = 'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f'
node test-results/tree-instance-updates/run.mjs
```

Each invocation writes a fresh `run-<timestamp>` directory and closes its
browser in `finally`. Serialize GPU runs. Input paths and hashes are recorded;
the input GLBs remain in the original assetctl output directory.
