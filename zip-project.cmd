@echo off
chcp 65001 > nul
setlocal
cd /d "%~dp0"

echo MORNING FLOW AI のZIPを作成しています...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\zip-project.ps1"

echo.
for /f "usebackq delims=" %%Z in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json; 'morning-flow-ai-v' + (($p.version -replace '\.0$','')) + '.zip'"`) do set "ZIP_NAME=%%Z"

if exist "%~dp0%ZIP_NAME%" (
  echo ZIP作成完了
  echo 保存先: %~dp0%ZIP_NAME%
) else (
  echo ZIP作成に失敗しました
)
echo.
pause
