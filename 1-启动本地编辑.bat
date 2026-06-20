@echo off
chcp 65001 >nul
title TinaCMS 本地编辑后台
cd /d "C:\Users\yifumou\WorkBuddy\2026-06-10-19-28-57\my-portfolio"

set "NODE=C:\Users\yifumou\.workbuddy\binaries\node\versions\22.22.2\node.exe"
set "NEXT_PUBLIC_TINA_CLIENT_ID=4828ac8a-78f6-4911-95f3-66e9cb22aba9"
set "TINA_TOKEN=f941fbfb892963ec7ca15380c7d5970504ecb7fe"
set "TINA_SEARCH_TOKEN=c10bc44591a2827fcdceee85d361725d1b492bfc"

echo ============================================================
echo   正在启动本地可视化编辑后台...
echo   启动需要 20-40 秒，请耐心等待。
echo.
echo   看到 "ready" 或 "compiled" 字样后，
echo   用浏览器打开下面这个地址即可编辑（不需要登录、不弹窗）：
echo.
echo        http://localhost:3000/admin/index.html
echo.
echo   编辑完成后：直接关闭本窗口即可停止。
echo   然后双击 "2-推送上线.bat" 把改动发布到网站。
echo ============================================================
echo.

echo [准备] 清理旧缓存...
if exist "tina\__generated__\.cache" (
    rmdir /s /q "tina\__generated__\.cache" 2>nul
    if exist "tina\__generated__\.cache" (
        echo [提示] 缓存目录被占用，尝试解除占用...
        taskkill /f /im node.exe >nul 2>nul
        timeout /t 2 >nul
        rmdir /s /q "tina\__generated__\.cache" 2>nul
    )
)
echo [准备] 完成。
echo.

"%NODE%" node_modules\@tinacms\cli\bin\tinacms dev -c "next dev"

echo.
echo 本地后台已停止。按任意键关闭窗口。
pause >nul
