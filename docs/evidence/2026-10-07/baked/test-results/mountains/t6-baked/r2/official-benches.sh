#!/bin/sh
# Route A round 2 official benches (coordinator), each fresh process under the CPU-quiet test slot. Run from the baked
# worktree root. REF = detached checkout of main cc0032f; WIRED = scratch copy of this branch with
# TERRAIN_MOUNTAINS_WIRED flipped (never committed).  sh official-benches.sh <outdir> [contract] [orbit] [c1] [field]
REF=C:/LLM/IWSDK/universe-atlas-wt/ref-main
WIRED=C:/LLM/IWSDK/universe-atlas-wt/_wired-baked
OUT=$1; shift; mkdir -p $OUT/c1 $OUT/field
slot() { node tests/helpers/test-slot.mjs -- node "$@"; }
ALL="$*"
has() { [ -z "$ALL" ] || echo "$ALL" | grep -q $1; }
if has contract; then for w in Maithea Selawyn Raiva Lethuris; do
  slot test-results/mountains/t3/contract-build-bench.mjs $w $REF 5 $OUT/contract-build-bench.json > $OUT/contract-$w.log 2>&1 < /dev/null
  echo "contract $w exit=$?" >> $OUT/bench-exits.log; done; fi
if has orbit; then for w in Maithea Selawyn Raiva Lethuris; do
  slot test-results/mountains/t4/orbit-bench.mjs $w $REF $WIRED 7 $OUT/orbit-bench.json baked-wired-vs-main > $OUT/orbit-$w.log 2>&1 < /dev/null
  echo "orbit $w exit=$?" >> $OUT/bench-exits.log; done; fi
if has c1; then for w in Maithea Selawyn Raiva Lethuris; do for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  (cd $WIRED && node tests/helpers/test-slot.mjs -- node scripts/mountain-assembly-cost.mjs $w C:/LLM/IWSDK/universe-atlas-wt/baked/$OUT/c1/cost-$w-$i.json $REF --same-version) > $OUT/c1/$w-$i.log 2>&1 < /dev/null
  echo "c1 $w $i exit=$?" >> $OUT/bench-exits.log; done; done; fi
if has field; then for k in 0 1 2 3; do for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  slot test-results/mountains/t6-baked/r2/field-bench.mjs $k >> $OUT/field/world-$k.jsonl 2>> $OUT/field/err.log < /dev/null
  echo "field $k $i exit=$?" >> $OUT/bench-exits.log; done; done; fi
