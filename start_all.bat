@echo off
chcp 65001 >nul

echo ========================================
echo   JobKorea Server Start
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server (port 4001)...
start "Backend-4001" cmd /k "cd backend-new && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend Server (port 5173)...
start "Frontend-5173" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Started
echo ========================================
echo.
echo   Backend:  http://localhost:4001
echo   Frontend: http://localhost:5173
echo.
echo   To stop: run stop_all.bat
echo ========================================
