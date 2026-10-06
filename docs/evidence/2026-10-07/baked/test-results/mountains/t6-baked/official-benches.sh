#!/bin/sh
# Baked-coarse official benches (coordinator), one fresh process per world and arm pair, each under the CPU-quiet test
# slot. Run from the baked worktree root. REF = read-only checkout of main 9971c3f; WIRED = scratch copy of this
# branch with TERRAIN_MOUNTAINS_WIRED flipped (never committed).
#   sh official-benches.sh [contract] [orbit] [c1]
REF=C:/LLM/IWSDK/universe-atlas-wt/ref-main
WIRED=C:/LLM/IWSDK/universe-atlas-wt/_wired-baked
OUT=test-results/mountains/t6-baked
slot() { node tests/helpers/test-slot.mjs -- node "$@"; }
ALL="$*"
if [ -z "$ALL" ] || echo "$ALL" | grep -q contract; then
for w in Maithea Selawyn Raiva Lethuris; do
  slot test-results/mountains/t3/contract-build-bench.mjs $w $REF 5 $OUT/contract-build-bench.json > $OUT/contract-$w.log 2>&1 < /dev/null
  echo "contract $w exit=$?" >> $OUT/bench-exits.log
done
fi
if [ -z "$ALL" ] || echo "$ALL" | grep -q orbit; then
for w in Maithea Selawyn Raiva Lethuris; do
  slot test-results/mountains/t4/orbit-bench.mjs $w $REF $WIRED 7 $OUT/orbit-bench.json baked-wired-vs-main > $OUT/orbit-$w.log 2>&1 < /dev/null
  echo "orbit $w exit=$?" >> $OUT/bench-exits.log
done
fi
if [ -z "$ALL" ] || echo "$ALL" | grep -q c1; then
for w in Maithea Selawyn Raiva Lethuris; do
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    (cd $WIRED && node tests/helpers/test-slot.mjs -- node scripts/mountain-assembly-cost.mjs $w C:/LLM/IWSDK/universe-atlas-wt/baked/$OUT/c1/cost-$w-$i.json $REF --same-version) > $OUT/c1/$w-$i.log 2>&1 < /dev/null
    echo "c1 $w $i exit=$?" >> $OUT/bench-exits.log
  done
done
fi
