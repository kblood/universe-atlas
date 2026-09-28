# Forest work-list verification

- Source revision: `c2bca35` (`Retain ordered forest work across census frames`).
- Focused command: `node --test tests/forest-ordered-work.test.mjs tests/planet-forest-worklist.test.mjs tests/forest-patch-broadphase.test.mjs tests/forest-retention.test.mjs tests/planet-canopy.test.mjs tests/planet-forest-tree-assets.test.mjs`
- Result: 77 passed; 0 failed, skipped, cancelled, or todo. The raw runner output is in [focused-cpu.log](focused-cpu.log).
- `npx tsc --noEmit`: passed.
- `npm run build`: passed (TypeScript plus Vite production build).
- Coverage includes original canonical ordering/capacity winners, the 650 m cutoff with a 20 m cached observer window, census fallback, water invalidation, date changes, canopy ownership revisions, and existing resident/slot behavior.
- No browser/GPU acceptance or before/after game performance profile was run for this change. These checks establish behavior and compilation, not a runtime speedup.
