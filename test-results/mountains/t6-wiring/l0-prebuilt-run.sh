#!/bin/sh
cd /c/LLM/IWSDK/universe-atlas-wt/t6 || exit 9
D=test-results/mountains/t6-wiring; rm -f $D/l0-prebuilt.json
i=1; while [ $i -le 6 ]; do
  if [ $((i % 2)) = 1 ]; then s=""; else s="--swap"; fi
  node tests/helpers/test-slot.mjs -- node $D/l0-protocol-prebuilt.mjs Maithea C:/LLM/IWSDK/universe-atlas $s $D/l0-prebuilt.json >> $D/l0-prebuilt.log 2>&1; echo "l0pre $i $s exit=$?" >> $D/bench-exits.log
  i=$((i + 1))
done
