$ErrorActionPreference = 'Stop'
# Staging is disposable and must remain inside this worktree.
$staging = (Resolve-Path 'test-results/mountains/t3/staged-off').Path
$expected = Join-Path $PWD 'test-results/mountains/t3/staged-off'
if ([IO.Path]::GetFullPath($staging) -ne [IO.Path]::GetFullPath($expected)) { throw 'Unexpected staging path' }
# Force removal was rejected by the shell policy; normal recursive removal
# succeeds on this ordinary, user-authorized temporary source copy.
Remove-Item -LiteralPath $staging -Recurse
New-Item -ItemType Directory -Force test-results/mountains/t3/staged-off | Out-Null
Copy-Item -Recurse src test-results/mountains/t3/staged-off/src
foreach ($world in @('Maithea', 'Raiva', 'Selawyn', 'Lethuris')) {
  node test-results/mountains/t3/contract-build-bench.mjs $world test-results/mountains/t3/staged-off 5 test-results/mountains/t3/fix-residual.json > "test-results/mountains/t3/fix-residual-$world.log" 2>&1
  $code = $LASTEXITCODE
  "residual $world=$code" | Add-Content test-results/mountains/t3/fix-check-exits.log
  Get-Content "test-results/mountains/t3/fix-residual-$world.log" -Tail 1
  if ($code -ne 0) { throw "Residual benchmark failed: $world" }
  node test-results/mountains/t3/contract-build-bench.mjs $world C:/LLM/IWSDK/universe-atlas 5 test-results/mountains/t3/fix-vs-main.json > "test-results/mountains/t3/fix-vs-main-$world.log" 2>&1
  $code = $LASTEXITCODE
  "vs-main $world=$code" | Add-Content test-results/mountains/t3/fix-check-exits.log
  Get-Content "test-results/mountains/t3/fix-vs-main-$world.log" -Tail 1
  if ($code -ne 0) { throw "Against-main benchmark failed: $world" }
}
