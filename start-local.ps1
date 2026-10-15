param([int]$Port = 8767)
$ErrorActionPreference = 'Stop'
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($taskNodeCommand) { $taskNodePath = $taskNodeCommand.Source }
else { $taskNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNodePath)) { throw 'Node.js를 찾을 수 없습니다. index.html 파일을 브라우저에서 직접 열어주세요.' }
Write-Host "http://127.0.0.1:$Port (종료: Ctrl+C)"
& $taskNodePath (Join-Path $PSScriptRoot 'server.cjs') $Port
