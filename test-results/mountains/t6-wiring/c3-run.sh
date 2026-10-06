#!/bin/sh
# T6 C3 on the frozen massif tile set, one fresh process per (world, level), sequential, under ONE test-slot level:
#   node tests/helpers/test-slot.mjs -- sh test-results/mountains/t6-wiring/c3-run.sh
cd /c/LLM/IWSDK/universe-atlas-wt/t6 || exit 9
D=test-results/mountains/t6-wiring
rm -f $D/c3-tile-set.json; : > $D/c3-exits.log
for spec in Maithea:6:10 Selawyn:7:11 Raiva:5:9 Lethuris:7:11; do
  w=${spec%%:*}; rest=${spec#*:}; cut=${rest%%:*}; rock=${rest#*:}
  for L in $cut $((cut+1)) $((cut+2)) $rock $((rock+2)); do
    node $D/c3-tile-set.mjs $w $L $D/c3-tile-set.json > $D/c3-$w-L$L.log 2>&1
    echo "c3 $w L$L exit=$?" >> $D/c3-exits.log
  done
done
echo done >> $D/c3-exits.log
