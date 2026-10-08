#!/usr/bin/env bash
# Riser LOD pre-merge timing driver: everything below runs inside ONE exclusive test-slot hold
#   node tests/helpers/test-slot.mjs -- bash test-results/mountains/riser-lod/timing/run-timing.sh <mainRoot>
set -u
M="$1"; O=test-results/mountains/riser-lod/timing
echo "start $(date -u +%FT%TZ) slot=${ATLAS_TEST_SLOT_TOKEN:-none}"
for w in Maithea Selawyn Raiva Lethuris; do node $O/tile-build-ab.mjs $w "$M" 7 > $O/tile-build-$w.log 2>&1; echo "tile $w exit $? $(date -u +%T)"; done
node $O/inmassif-ab.mjs "$M" > $O/inmassif-ab.log 2>&1; echo "inmassif exit $? $(date -u +%T)"
ATLAS_M5_BENCH=1 node --test --test-name-pattern="ROW COST" tests/mountain-rock-detail.test.mjs > $O/m5-cost-branch.log 2>&1; echo "m5 branch exit $? $(date -u +%T)"
(cd "$M" && ATLAS_M5_BENCH=1 node --test --test-name-pattern="ROW COST" tests/mountain-rock-detail.test.mjs) > $O/m5-cost-main.log 2>&1; echo "m5 main exit $? $(date -u +%T)"
npm run test:perf > $O/test-perf.log 2>&1; echo "test:perf exit $? $(date -u +%T)"
echo "end $(date -u +%FT%TZ)"
