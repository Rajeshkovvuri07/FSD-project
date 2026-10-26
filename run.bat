@echo off
title Athena Library Book Management System
echo ============================================================
echo   Starting Athena Library Book Management System...
echo ============================================================
echo.
set PATH=C:\Users\somaraju\nodejs;%PATH%
cd /d "%~dp0"

echo [1/2] Verifying Node.js environment...
node -v
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

echo.
echo [2/2] Launching Server with Embedded In-Memory Database...
echo Opening in your browser at http://localhost:5000 ...
start http://localhost:5000
npm run dev:memory
pause
