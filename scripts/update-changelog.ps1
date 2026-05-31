$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packageJson = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = ([string]$packageJson.version) -replace '\.0$', ''
$date = Get-Date -Format 'yyyy-MM-dd'
$path = Join-Path $root 'CHANGELOG.md'

if (!(Test-Path -LiteralPath $path)) {
  @'
# CHANGELOG

このファイルには MORNING FLOW AI の各バージョンの変更内容を記録します。

'@ | Set-Content -LiteralPath $path -Encoding UTF8
}

$content = Get-Content -LiteralPath $path -Raw
$heading = "## Version $version - $date"

if ($content -notmatch [regex]::Escape("## Version $version")) {
$entry = @"
$heading

- 変更内容を記録
- `morning-flow-ai-v$version.zip` として保存

"@

  $updated = $content.TrimEnd() + "`r`n`r`n" + $entry
  Set-Content -LiteralPath $path -Value $updated -Encoding UTF8
}

Write-Host "CHANGELOG_UPDATED: Version $version"
