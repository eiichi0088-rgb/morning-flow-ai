$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $root 'package.json'
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$version = [string]$packageJson.version
$displayVersion = $version -replace '\.0$', ''
$zipFileName = "morning-flow-ai-v$displayVersion.zip"
$zipPath = Join-Path $root $zipFileName

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$excludedNames = @(
  'node_modules',
  '.npm-cache',
  '.npm-cache-v2',
  '.env',
  'api - コピー',
  'morning-flow-ai-mvp.zip',
  'morning-flow-ai-v1.2.zip'
)

$items = Get-ChildItem -LiteralPath $root -Force |
  Where-Object {
    $excludedNames -notcontains $_.Name -and
    $_.Name -notlike 'morning-flow-ai-v*.zip'
  }

Compress-Archive -LiteralPath $items.FullName -DestinationPath $zipPath -Force

Write-Host "ZIP_CREATED: $zipFileName"
