$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packageJson = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = ([string]$packageJson.version) -replace '\.0$', ''
$commitMessage = "Update MORNING FLOW AI to v$version"

$githubDesktopGitRoot = Join-Path $env:LOCALAPPDATA 'GitHubDesktop\app-3.5.11\resources\app\git'
$git = Join-Path $githubDesktopGitRoot 'mingw64\bin\git.exe'

if (!(Test-Path -LiteralPath $git)) {
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue
  if (!$gitCommand) {
    throw 'Git was not found. Install Git for Windows or GitHub Desktop.'
  }
  $git = $gitCommand.Source
}

$env:GIT_EXEC_PATH = Join-Path $githubDesktopGitRoot 'mingw64\bin'
$env:PATH = "$(Join-Path $githubDesktopGitRoot 'mingw64\bin');$(Join-Path $githubDesktopGitRoot 'cmd');$env:PATH"

Push-Location $root
try {
  & $git rm --cached -q --ignore-unmatch morning-flow-ai-*.zip
  & $git status --short --branch
  & $git add .
  & $git commit -m $commitMessage
  & $git push origin main
} finally {
  Pop-Location
}
