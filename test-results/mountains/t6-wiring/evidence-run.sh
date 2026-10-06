#!/bin/sh
# T6 evidence batch, sequential, run under ONE test-slot level:
#   node tests/helpers/test-slot.mjs -- sh test-results/mountains/t6-wiring/evidence-run.sh
# Every step's real exit code goes to evidence-exits.log.
cd /c/LLM/IWSDK/universe-atlas-wt/t6 || exit 9
D=test-results/mountains/t6-wiring
: > $D/evidence-exits.log
step() { name=$1; shift; start=$(date +%s); "$@" > $D/$name.log 2>&1; code=$?; echo "$name exit=$code $(( $(date +%s)-start )) s" >> $D/evidence-exits.log; }
step lod-cells-wired node $D/lod-cells-t6.mjs C:/LLM/IWSDK/universe-atlas-wt/t6 $D/lod-cells-wired.json
step lod-cells-main node $D/lod-cells-t6.mjs C:/LLM/IWSDK/universe-atlas $D/lod-cells-main.json
step hyps-truth node $D/hyps-truth.mjs $D/hyps-truth.json
step m5-pool node $D/m5-pool.mjs $D/m5-pool.json
step m3-rows node $D/m3-rows.mjs
mkdir -p $D/m4-fresh-norock $D/m4-fresh-rock $D/m4-old-rock
step m4-fresh-norock env SEED_BASE=730301 ROCK=0 PART2=1 node $D/m4-summits.mjs $D/m4-fresh-norock C:/LLM/IWSDK/universe-atlas
step m4-fresh-rock env SEED_BASE=730301 ROCK=1 PART2=0 node $D/m4-summits.mjs $D/m4-fresh-rock C:/LLM/IWSDK/universe-atlas
step m4-old-rock env SEED_BASE=730201 ROCK=1 PART2=0 node $D/m4-summits.mjs $D/m4-old-rock C:/LLM/IWSDK/universe-atlas
step massif-tile-set node $D/massif-tile-set.mjs $D/massif-tile-set.json
rm -f $D/c3-tile-set.json
for w in Maithea:6:10 Selawyn:7:11 Raiva:5:9 Lethuris:7:11; do
  name=${w%%:*}; rest=${w#*:}; cut=${rest%%:*}; rock=${rest#*:}
  for L in $cut $((cut+1)) $((cut+2)) $rock $((rock+2)); do
    step c3-$name-L$L node $D/c3-tile-set.mjs $name $L $D/c3-tile-set.json
  done
done
echo done >> $D/evidence-exits.log
