#!/bin/sh
# Split-core official benches (coordinator), one fresh process per world and arm pair, each under the CPU-quiet test slot.
# Run from the split-core worktree root. REF = read-only checkout of main 33b049a; WIRED = scratch copy of this branch
# with TERRAIN_MOUNTAINS_WIRED flipped (never committed).
REF=C:/LLM/IWSDK/universe-atlas-wt/ref-main
WIRED=C:/LLM/IWSDK/universe-atlas-wt/_wired-split-core
OUT=test-results/mountains/t6-split
slot() { node tests/helpers/test-slot.mjs -- node "$@"; }
for w in Maithea Selawyn Raiva Lethuris; do
  slot test-results/mountains/t3/contract-build-bench.mjs $w $REF 5 $OUT/contract-build-bench.json > $OUT/contract-$w.log 2>&1
  echo "contract $w exit=$?" >> $OUT/bench-exits.log
done
for w in Maithea Selawyn Raiva Lethuris; do
  slot test-results/mountains/t4/orbit-bench.mjs $w $REF $WIRED 7 $OUT/orbit-bench.json split-wired-vs-main > $OUT/orbit-$w.log 2>&1
  echo "orbit $w exit=$?" >> $OUT/bench-exits.log
done
