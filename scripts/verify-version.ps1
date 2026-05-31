$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packageJson = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = ([string]$packageJson.version) -replace '\.0$', ''
$zipName = "morning-flow-ai-v$version.zip"
$zipPath = Join-Path $root $zipName
$mainPath = Join-Path $root 'src/main.tsx'
$distPath = Join-Path $root 'dist'
$changelogPath = Join-Path $root 'CHANGELOG.md'
$versioningPath = Join-Path $root 'VERSIONING.md'
$nextVersionPath = Join-Path $root 'NEXT_VERSION.md'

$main = Get-Content -LiteralPath $mainPath -Raw
$changelog = Get-Content -LiteralPath $changelogPath -Raw
$versioning = Get-Content -LiteralPath $versioningPath -Raw
$nextVersion = Get-Content -LiteralPath $nextVersionPath -Raw

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

if ($versioning -notmatch 'Version 3\.0' -or $versioning -notmatch 'Version 3\.1') {
  throw "VERSIONING.md must include Version 3.0 and next planned Version 3.1."
}

if ($nextVersion -notmatch 'Version 3\.1') {
  throw "NEXT_VERSION.md must point to Version 3.1."
}

Write-Host "VERSION_VERIFIED: Version $version"
