#!/bin/sh
# Fair A/B cost protocol for C1 (weighted warm resident sampler overhead) and the orbit bake, with an A/A control run
# the same way (decisions addendum (6), Q-A, docs/mountains-opus-decisions-2026-10-05.md). Run from the repo root:
#   REF=<main copy> REF2=<second identical main copy> CAND=<candidate copy, wired> OUT=<dir> [N=30] sh scripts/cost-fair/run.sh
# REF, REF2 and CAND are separate checkouts or `git archive` exports (separate module instances); they need a
# node_modules reachable by Node's resolution (e.g. a junction in their common parent; remove it with `cmd /c rmdir`).
# Every command takes ONE test-slot level (never nest). Then: node scripts/cost-fair/analyze.mjs $OUT
set -u
H=$(pwd)/scripts/cost-fair; SLOT=$(pwd)/tests/helpers/test-slot.mjs; N=${N:-30}
mkdir -p "$OUT"
for w in Maithea Selawyn Raiva Lethuris; do [ -f "$OUT/points-$w.json" ] || node $SLOT -- node $H/c1-points.mjs $w "$REF" "$OUT/points-$w"; done
c1() { node $SLOT -- node $H/c1-ab.mjs $1 "$REF" "$2" "$OUT/points-$1" $3 $4 "$OUT/c1.jsonl" >> "$OUT/c1.log" 2>&1 < /dev/null; rc=$?
  echo "$(date +%T) c1 $4 $1 $3 i=$i exit=$rc" >> "$OUT/exits.log"; }
orbit() { if [ $3 = ref ]; then A="$REF"; B="$2"; else A="$2"; B="$REF"; fi
  node $SLOT -- node $H/orbit-ab.mjs $1 "$A" "$B" 7 "" "$4|first=$3" >> "$OUT/orbit.jsonl" 2>> "$OUT/orbit.err" < /dev/null; rc=$?
  echo "$(date +%T) orbit $4 $1 $3 i=$i exit=$rc" >> "$OUT/exits.log"; }
i=1
while [ $i -le $N ]; do
  if [ $((i % 2)) = 1 ]; then f=cand; g=ref; else f=ref; g=cand; fi
  for w in Maithea Selawyn Raiva Lethuris; do
    if [ $((i % 2)) = 1 ]; then c1 $w "$CAND" $f AB; c1 $w "$REF2" $g AA; orbit $w "$CAND" $g AB; orbit $w "$REF2" $f AA
    else c1 $w "$REF2" $g AA; c1 $w "$CAND" $f AB; orbit $w "$REF2" $f AA; orbit $w "$CAND" $g AB; fi
  done
  i=$((i + 1))
done
echo "$(date +%T) DONE" >> "$OUT/exits.log"
