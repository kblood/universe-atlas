#!/bin/sh
# Quiet-window driver 2026-10-07: scripts/cost-fair/run.sh of main (39d1f0e, unchanged since 1f41867) VERBATIM, run from
# main's checkout (H and SLOT resolve to main's harness), plus ONE added hook: `pre <tag>` before every counted process
# (plan part 2: shared-holder dir empty = hard assert; perf-host contender list + host idle recorded; flag, never drop).
# The counted protocol (point sets, arms, order, N, commands, analysis) is unchanged.
set -u
H=$(pwd)/scripts/cost-fair; SLOT=$(pwd)/tests/helpers/test-slot.mjs; N=${N:-30}
PRE=${PRE:?set PRE to precheck.mjs}
mkdir -p "$OUT"
pre() { node "$PRE" "$1" "$OUT/precheck.jsonl" "$OUT/baseline.json" || { echo "$(date +%T) PRECHECK ABORT $1" >> "$OUT/exits.log"; exit 3; }; }
for w in Maithea Selawyn Raiva Lethuris; do [ -f "$OUT/points-$w.json" ] || node $SLOT -- node $H/c1-points.mjs $w "$REF" "$OUT/points-$w"; done
c1() { pre "c1 $4 $1 $3 i=$i"; node $SLOT -- node $H/c1-ab.mjs $1 "$REF" "$2" "$OUT/points-$1" $3 $4 "$OUT/c1.jsonl" >> "$OUT/c1.log" 2>&1 < /dev/null; rc=$?
  echo "$(date +%T) c1 $4 $1 $3 i=$i exit=$rc" >> "$OUT/exits.log"; }
orbit() { if [ $3 = ref ]; then A="$REF"; B="$2"; else A="$2"; B="$REF"; fi
  pre "orbit $4 $1 $3 i=$i"; node $SLOT -- node $H/orbit-ab.mjs $1 "$A" "$B" 7 "" "$4|first=$3" >> "$OUT/orbit.jsonl" 2>> "$OUT/orbit.err" < /dev/null; rc=$?
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
