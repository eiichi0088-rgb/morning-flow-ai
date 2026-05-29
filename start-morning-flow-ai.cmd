@echo off
cd /d "%~dp0"
echo MORNING FLOW AI を起動しています...
echo.
echo ブラウザで開くURL:
echo http://127.0.0.1:5173/
echo.
echo 終了するときは、この黒い画面を閉じてください。
echo.
npm.cmd run dev
pause
