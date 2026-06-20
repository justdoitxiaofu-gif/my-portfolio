@echo off
title Publish to website
cd /d "C:\Users\yifumou\WorkBuddy\2026-06-10-19-28-57\my-portfolio"

echo ============================================================
echo   Publish local changes to the live website
echo ============================================================
echo.

git add -A
echo.
set /p MSG="What did you change? (press Enter for default): "
if "%MSG%"=="" set "MSG=update content via local admin"

git commit -m "%MSG%"
echo.
echo Pushing to GitHub (Vercel will auto-deploy)...
git push origin master

echo.
echo ============================================================
echo   Done! Wait 1-2 minutes for Vercel, then refresh:
echo   https://my-portfolio-three-xi-33.vercel.app
echo ============================================================
echo.
pause
