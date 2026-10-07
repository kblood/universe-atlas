#!/bin/bash
# Runs inside the test slot (via test-slot.mjs CLI): CPU quiet gate (3 samples < 25%, max 180 s), then the one perf file strict.
cd /c/LLM/IWSDK/universe-atlas-wt/placeat-warmup
ok=0; for i in $(seq 1 90); do
  l=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average" | tr -d '\r')
  echo "CPU load $l%"; if [ "${l%.*}" -lt 25 ]; then ok=$((ok+1)); else ok=0; fi
  [ $ok -ge 3 ] && break; sleep 2; done
[ $ok -ge 3 ] || { echo "CPU quietness timeout; perf NOT run"; exit 9; }
OCEAN_PERF_STRICT=1 node --test --test-concurrency=1 --test-reporter=spec tests/perf/place-query.perf.test.mjs
