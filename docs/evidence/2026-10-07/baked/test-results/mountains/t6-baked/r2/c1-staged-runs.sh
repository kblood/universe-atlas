#!/bin/sh
# Unofficial staged C1 runs under the CPU-quiet slot: sh c1-staged-runs.sh <outdir> <n> [worlds...]
R=test-results/mountains/t6-baked/r2
OUT=$1; N=$2; shift 2; W="${*:-Maithea Selawyn Raiva Lethuris}"
mkdir -p $OUT
for w in $W; do i=1; while [ $i -le $N ]; do
  node tests/helpers/test-slot.mjs -- node $R/c1-staged.mjs $w $OUT/cost.json C:/LLM/IWSDK/universe-atlas-wt/ref-main --same-version > $OUT/$w-$i.log 2>&1 < /dev/null
  echo "$w $i exit=$?" >> $OUT/exits.log; i=$((i+1)); done; done
