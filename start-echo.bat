@echo off
title ECHO - Communication Coach
echo ========================================================
echo         ECHO - Communication Coach Setup & Launch
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed on your computer.
    echo.
    echo Please download and install the LTS version of Node.js from:
    echo https://nodejs.org
    echo.
    echo After installing, restart this file.
    echo.
    pause
    exit /b 1
)

echo [1/3] Node.js detected successfully.
echo.

if not exist node_modules (
    echo [2/3] Installing required packages (this only happens once)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERROR] Package installation failed. Please check your internet connection.
        pause
        exit /b 1
    )
) else (
    echo [2/3] Packages already installed.
)

echo.
echo [3/3] Starting ECHO server...
echo.
echo ========================================================
echo ECHO is now running!
echo Opening http://localhost:5173 in your default browser...
echo (Leave this black window open while using ECHO)
echo ========================================================
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173

npm run dev
pause

