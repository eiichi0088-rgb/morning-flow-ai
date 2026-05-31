$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packageJson = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = ([string]$packageJson.version) -replace '\.0$', ''
$date = Get-Date -Format 'yyyy-MM-dd'
$path = Join-Path $root 'CHANGELOG.md'

$content = Get-Content -LiteralPath $path -Raw
$heading = "## Version $version - $date"

if ($content -notmatch [regex]::Escape("## Version $version")) {
$entry = @"
$heading

- v3専用の個人プロファイル保存へ移行し、v2.x共有localStorageを読み込まないように変更
- Googleカレンダーは自動再接続せず、毎回アカウント選択と登録前確認を行うように強化
- 買い物リストの音声/テキスト入力、AIカテゴリ分け、数量保持、編集/削除/共有文を改善
- 電話・LINE・メール・SNS返信の連絡忘れチェックを追加
- 朝のAI整理に買い物候補と連絡忘れを含めるように強化
- `morning-flow-ai-v$version.zip` として保存

"@

  $updated = $content.TrimEnd() + "`r`n`r`n" + $entry
  Set-Content -LiteralPath $path -Value $updated -Encoding UTF8
}

Write-Host "CHANGELOG_UPDATED: Version $version"
