$ErrorActionPreference = 'Stop'
$benchRoot = 'C:/LLM/IWSDK/universe-atlas'
$benchEvidence = 'test-results/mountains/t3'
foreach ($benchWorld in @('Maithea', 'Selawyn', 'Raiva', 'Lethuris')) {
  node test-results/mountains/t3/contract-build-bench.mjs $benchWorld $benchRoot 5 "$benchEvidence/opt-after-contract.json" > "$benchEvidence/opt-after-contract-$benchWorld.log"
  "contract $benchWorld exit=$LASTEXITCODE" | Add-Content "$benchEvidence/opt-bench-exits.log"
  if ($LASTEXITCODE -ne 0) { throw "contract benchmark failed: $benchWorld" }
}
foreach ($benchWorld in @('Maithea', 'Raiva')) {
  $benchLevels = if ($benchWorld -eq 'Maithea') {'0,1,2,3,4,5'} else {'0,1,2,3,4'}
  node test-results/mountains/t3/tile-bench-arms.mjs $benchWorld $benchRoot $benchLevels main,on > "$benchEvidence/opt-after-$benchWorld.log"
  "quick $benchWorld exit=$LASTEXITCODE" | Add-Content "$benchEvidence/opt-bench-exits.log"
  if ($LASTEXITCODE -ne 0) { throw "quick benchmark failed: $benchWorld" }
  node test-results/mountains/t3/tile-bench-arms.mjs $benchWorld $benchRoot $benchLevels main,off > "$benchEvidence/opt-off-$benchWorld.log"
  "off $benchWorld exit=$LASTEXITCODE" | Add-Content "$benchEvidence/opt-bench-exits.log"
  if ($LASTEXITCODE -ne 0) { throw "off benchmark failed: $benchWorld" }
}
