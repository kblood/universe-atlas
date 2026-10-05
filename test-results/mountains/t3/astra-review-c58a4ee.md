Review target: **c58a4ee**. No files edited. Concurrent uncommitted edits now address findings 2–3, but are outside that commit.

1. **BLOCKER — T3 cost acceptance remains unproven.** `src/terrain.ts:473`; `tests/lod-carving-reduction.test.mjs:83`.  
   Building coarse tiles avoids M3 solves, but still incurs mountain initialization and sampling costs. Three exploratory fresh-process Maithea runs measured **395–426 ms versus main’s 301–313 ms**, approximately **+26–42%**, exceeding +10%. These were not CPU-quiet acceptance measurements. Available exhaustive-build logs stop at L1; the test samples directions rather than building every required tile.  
   **Fix:** complete the required CPU-quiet, fresh-process measurements for all worlds and coarse levels, record exhaustive zero-solve results, and resolve any confirmed budget failures before accepting T3.

2. **SHOULD-FIX — The regression test is omitted from normal/full runs.** `package.json:10`.  
   In the commit, neither `npm test` nor `test:full` runs `lod-carving-reduction.test.mjs`; the full runner derives its registry from `scripts.test`. A future parent-cache regression can therefore escape those runs.  
   **Fix:** register the test. The uncommitted package edit does this.

3. **SHOULD-FIX — The required reduction-contract amendment is absent.** `docs/lod-ladder-contract-v1.md:52`; `src/lod-ladder.ts:142`.  
   The committed code refers to a section-3 “Mountain carving” rule that does not exist in the committed contract, which still identifies `lod-ladder-1`.  
   **Fix:** include the required §3 amendment and version ledger. An uncommitted amendment is now present.

The implementation itself looks sound:

- Every parent sample, including correction centres, reaches the parent sampler at the switch. Point/raw caches separate the states; corrected-cache keys cannot collide because footprints are bounded by 2,800 and steps differ by 1,000,000. Different river footprints preserve that separation.
- Child vertices, metadata centres, normals—including the geodesic halo—and colour texels retain the child sampler. Ocean geometry remains the uniform sea-level shell.
- The cut arithmetic is correct. The floor and downstream detail/landform composition preserve the upper envelope. Ocean flags remain unchanged for the supported sea levels ≤0; that guarantee would not extend to arbitrary positive flooding levels.
- Default arithmetic grouping is preserved, with no extra sampler or effective cache split. Direct comparisons against main matched **8,192 sampler results and 20 tile builds exactly**. Existing positional callers remain compatible.
- **11/11 focused tests passed.** The independent lattice reference matches the contract, and the mutation represents a parent sampled with child carving. Real seam errors were below 0.007 m; mutant seam errors were 133–1,298 m. Selection and direction matching are correct, although all four selected seams are within a cube face, so cross-face coverage is not demonstrated.
- Flipping the constant activates the staged wiring for existing callers; T6 still needs its planned version, golden and acceptance work.

**Verdict: REJECT**