$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packageJson = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = ([string]$packageJson.version) -replace '\.0$', ''
$zipName = "morning-flow-ai-v$version.zip"
$zipPath = Join-Path $root $zipName
$mainPath = Join-Path $root 'src/main.tsx'
$distPath = Join-Path $root 'dist'
$changelogPath = Join-Path $root 'CHANGELOG.md'
$rulesPath = Join-Path $root 'PROJECT_RULES.md'
$nextVersionPath = Join-Path $root 'NEXT_VERSION.md'

$main = Get-Content -LiteralPath $mainPath -Raw
$changelog = Get-Content -LiteralPath $changelogPath -Raw
$rules = Get-Content -LiteralPath $rulesPath -Raw

if ($main -notmatch [regex]::Escape("v$version")) {
  throw "Version label v$version was not found in src/main.tsx."
}

if (!(Test-Path -LiteralPath $zipPath)) {
  throw "Release zip was not found: $zipName"
}

if (!(Test-Path -LiteralPath $distPath)) {
  throw 'dist was not found. Run build first.'
}

if ($changelog -notmatch [regex]::Escape("## Version $version")) {
  throw "CHANGELOG entry was not found: Version $version"
}

if (!$rules.Contains("Developer Mode Marker")) {
  throw "PROJECT_RULES developer mode section was not found."
}

if (!(Test-Path -LiteralPath $nextVersionPath)) {
  throw "NEXT_VERSION.md was not found."
}

Write-Host "VERSION_VERIFIED: Version $version"
