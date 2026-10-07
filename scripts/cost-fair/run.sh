#!/bin/sh
# Fair A/B cost protocol for C1 (weighted warm resident sampler overhead) and the orbit bake, with an A/A control run
# the same way (decisions addendum (6), Q-A, docs/mountains-opus-decisions-2026-10-05.md). Run from the repo root:
#   REF=<main copy> REF2=<second identical main copy> CAND=<candidate copy, wired> OUT=<dir> [N=30] [REF_SHA=<sha>] sh scripts/cost-fair/run.sh
# REF, REF2 and CAND are separate checkouts or `git archive` exports (separate module instances); they need a
# node_modules reachable by Node's resolution (e.g. a junction in their common parent; remove it with `cmd /c rmdir`).
# Then: node scripts/cost-fair/analyze.mjs $OUT
#
# Harness (O5, docs/cost-fair-harness-2026-10-07.md; addendum (7): the counted protocol is unchanged):
# - ONE exclusive test-slot level for the whole batch: this script re-enters itself under tests/helpers/test-slot.mjs
#   once; every child then runs WITHOUT the wrapper and inherits ATLAS_TEST_SLOT_TOKEN (never nest: a batch started
#   inside a shared holder, or one that would need a second level, is refused).
# - Resume: each counted process (kind, world, i) writes its own record OUT/rec/<seq>-<type>-<kind>-<world>-<first>-i<i>.json,
#   renamed into place only after exit 0 with exactly one line. A rerun with the same OUT skips every finished record
#   and every failed one (.fail: every run counts, none is repeated); an interrupted attempt (.tmp) is discarded and run.
#   c1.jsonl and orbit.jsonl are assembled from rec/ at the end of each session.
# - Before every counted process: scripts/cost-fair/precheck.mjs (flag, never drop; hard asserts exit 3).
# - C1 point sets: scripts/cost-fair/points.mjs, cached by REF sha in POINTS_CACHE (default test-results/cost-fair/points).
set -u
H=$(pwd)/scripts/cost-fair; SLOT=$(pwd)/tests/helpers/test-slot.mjs; N=${N:-30}
: "${REF:?}" "${REF2:?}" "${CAND:?}" "${OUT:?}"
node "$H/slot-held.mjs"; held=$?
if [ $held = 10 ]; then :
elif [ $held = 11 ] && [ -z "${COST_FAIR_SLOT_ENTERED:-}" ]; then
  COST_FAIR_SLOT_ENTERED=1; export COST_FAIR_SLOT_ENTERED REF REF2 CAND OUT N
  exec node "$SLOT" -- sh "$0"
else echo "cost-fair run.sh: refused (slot-held exit $held, entered=${COST_FAIR_SLOT_ENTERED:-}): never nest; start the batch at the top level" >&2; exit 2; fi

mkdir -p "$OUT/rec"
want="N=$N REF=$REF REF2=$REF2 CAND=$CAND"
if [ -f "$OUT/protocol.txt" ]; then
  [ "$(cat "$OUT/protocol.txt")" = "$want" ] || { echo "cost-fair run.sh: $OUT was started with '$(cat "$OUT/protocol.txt")', not '$want'; refusing to resume" >&2; exit 5; }
else echo "$want" > "$OUT/protocol.txt"; fi
echo "$(date +%T) SESSION pid=$$ $want" >> "$OUT/exits.log"
[ -f "$OUT/baseline.json" ] || node "$H/precheck.mjs" baseline "$OUT/precheck.jsonl" "$OUT/baseline.json" --baseline > /dev/null || exit 3
PC=$(node "$H/points.mjs" "$REF" "${REF_SHA:-}" "${POINTS_CACHE:-$(pwd)/test-results/cost-fair/points}" "$OUT") && [ -f "$PC/manifest.json" ] || { echo "$(date +%T) POINTS FAILED" >> "$OUT/exits.log"; exit 4; }

pre() { node "$H/precheck.mjs" "$1" "$OUT/precheck.jsonl" "$OUT/baseline.json" --in-batch || { echo "$(date +%T) PRECHECK ABORT $1" >> "$OUT/exits.log"; exit 3; }; }
# start <type> <kind> <world> <first>: sets rf (record path without extension); returns 1 if the record is finished or failed.
start() { seq=$((seq + 1)); tag="$1 $2 $3 $4 i=$i"; rf="$OUT/rec/$(printf %04d $seq)-$1-$2-$3-$4-i$i"
  if [ -f "$rf.json" ]; then echo "$(date +%T) $tag skip=done" >> "$OUT/exits.log"; return 1; fi
  if [ -f "$rf.fail" ]; then echo "$(date +%T) $tag skip=failed" >> "$OUT/exits.log"; return 1; fi
  if [ -f "$rf.tmp" ]; then echo "$(date +%T) $tag discarded interrupted attempt ($(wc -l < "$rf.tmp") lines)" >> "$OUT/exits.log"; rm -f "$rf.tmp"; fi
  pre "$tag"; return 0; }
finish() { if [ $1 = 0 ] && [ "$(wc -l < "$rf.tmp")" = 1 ]; then mv "$rf.tmp" "$rf.json"; else { echo "exit=$1"; cat "$rf.tmp" 2>/dev/null; } > "$rf.fail"; rm -f "$rf.tmp"; fi
  echo "$(date +%T) $tag exit=$1" >> "$OUT/exits.log"; }
c1() { start c1 $4 $1 $3 || return 0
  node $H/c1-ab.mjs $1 "$REF" "$2" "$PC/points-$1" $3 $4 "$rf.tmp" >> "$OUT/c1.log" 2>&1 < /dev/null; finish $?; }
orbit() { if [ $3 = ref ]; then A="$REF"; B="$2"; else A="$2"; B="$REF"; fi
  start orbit $4 $1 $3 || return 0
  node $H/orbit-ab.mjs $1 "$A" "$B" 7 "" "$4|first=$3" > "$rf.tmp" 2>> "$OUT/orbit.err" < /dev/null; finish $?; }
i=1
while [ $i -le $N ]; do
  seq=$(((i - 1) * 16))
  if [ $((i % 2)) = 1 ]; then f=cand; g=ref; else f=ref; g=cand; fi
  for w in Maithea Selawyn Raiva Lethuris; do
    if [ $((i % 2)) = 1 ]; then c1 $w "$CAND" $f AB; c1 $w "$REF2" $g AA; orbit $w "$CAND" $g AB; orbit $w "$REF2" $f AA
    else c1 $w "$REF2" $g AA; c1 $w "$CAND" $f AB; orbit $w "$REF2" $f AA; orbit $w "$CAND" $g AB; fi
  done
  i=$((i + 1))
done
for t in c1 orbit; do for x in "$OUT"/rec/*-$t-*.json; do [ -f "$x" ] && cat "$x"; done > "$OUT/$t.jsonl"; done
nf=0; for x in "$OUT"/rec/*.fail; do [ -f "$x" ] && nf=$((nf + 1)); done
echo "$(date +%T) DONE c1=$(wc -l < "$OUT/c1.jsonl") orbit=$(wc -l < "$OUT/orbit.jsonl") failed=$nf" >> "$OUT/exits.log"
[ $nf = 0 ]
