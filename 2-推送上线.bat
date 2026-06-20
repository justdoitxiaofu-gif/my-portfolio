@echo off
chcp 65001 >nul
title 推送上线
cd /d "C:\Users\yifumou\WorkBuddy\2026-06-10-19-28-57\my-portfolio"

echo ============================================================
echo   把本地改动推送到线上网站
echo ============================================================
echo.

git add -A
echo.
set /p MSG="请输入这次改了什么（直接回车用默认说明）: "
if "%MSG%"=="" set "MSG=update content via local admin"

git commit -m "%MSG%"
echo.
echo 正在推送到 GitHub（Vercel 会自动部署）...
git push origin master

echo.
echo ============================================================
echo   推送完成！
echo   等待约 1-2 分钟，Vercel 自动部署后，刷新网站即可看到更新：
echo   https://my-portfolio-three-xi-33.vercel.app
echo ============================================================
echo.
pause
