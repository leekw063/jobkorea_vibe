@echo off
chcp 65001 >nul

echo ========================================
echo   JobKorea Server Stop
echo ========================================
echo.

echo [1/2] Stopping Backend Server (port 4001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   - PID %%a terminated
)

echo [2/2] Stopping Frontend Server (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   - PID %%a terminated
)

echo.
echo ========================================
echo   All Servers Stopped
echo ========================================
