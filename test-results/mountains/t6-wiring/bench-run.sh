#!/bin/sh
# T6 contract §6 bench (4 worlds) and C2 L0 protocol (Maithea, 12 runs alternating --swap), each process under ONE
# test-slot level. main = C:/LLM/IWSDK/universe-atlas (9dcb1cf, staged). Real exit codes to bench-exits.log.
cd /c/LLM/IWSDK/universe-atlas-wt/t6 || exit 9
D=test-results/mountains/t6-wiring; M=C:/LLM/IWSDK/universe-atlas; SLOT=tests/helpers/test-slot.mjs
: > $D/bench-exits.log; rm -f $D/contract-bench.json $D/l0-protocol.json
for w in Maithea Selawyn Raiva Lethuris; do
  node $SLOT -- node test-results/mountains/t3/contract-build-bench.mjs $w $M 5 $D/contract-bench.json >> $D/contract-bench.log 2>&1; echo "bench $w exit=$?" >> $D/bench-exits.log
done
i=1; while [ $i -le 12 ]; do
  if [ $((i % 2)) = 1 ]; then s=""; else s="--swap"; fi
  node $SLOT -- node test-results/mountains/t3/l0-protocol.mjs Maithea $M $s $D/l0-protocol.json >> $D/l0-protocol.log 2>&1; echo "l0 $i $s exit=$?" >> $D/bench-exits.log
  i=$((i + 1))
done
echo done >> $D/bench-exits.log
