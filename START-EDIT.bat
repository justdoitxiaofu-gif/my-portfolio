@echo off
title TinaCMS Local Editor
cd /d "C:\Users\yifumou\WorkBuddy\2026-06-10-19-28-57\my-portfolio"

set "NODE=C:\Users\yifumou\.workbuddy\binaries\node\versions\22.22.2\node.exe"
set "PATH=%CD%\node_modules\.bin;C:\Users\yifumou\.workbuddy\binaries\node\versions\22.22.2;%PATH%"
set "NEXT_PUBLIC_TINA_CLIENT_ID=4828ac8a-78f6-4911-95f3-66e9cb22aba9"
set "TINA_TOKEN=f941fbfb892963ec7ca15380c7d5970504ecb7fe"
set "TINA_SEARCH_TOKEN=c10bc44591a2827fcdceee85d361725d1b492bfc"

echo ============================================================
echo   Starting local visual editor...
echo   First start takes 20-40 seconds. Please wait.
echo.
echo   When you see "ready" or "compiled", open this URL:
echo        http://localhost:3000/admin/index.html
echo.
echo   Do NOT close this window while editing.
echo ============================================================
echo.

echo [setup] cleaning old cache...
if exist "tina\__generated__\.cache" rmdir /s /q "tina\__generated__\.cache" 2>nul
echo [setup] done.
echo.

"%NODE%" node_modules\@tinacms\cli\bin\tinacms dev -c "\"%NODE%\" node_modules\next\dist\bin\next dev"

echo.
echo Server stopped. Press any key to close.
pause >nul
