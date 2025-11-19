
@echo off
chcp 65001 >nul
echo ========================================
echo   JobKorea 서버 시작
echo ========================================
echo.

REM 프로젝트 루트 디렉토리로 이동
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"

REM 백엔드 서버 시작
echo [1/2] 백엔드 서버 시작 중...
start "JobKorea-Backend" cmd /k "cd /d %ROOT_DIR%backend-new && npm run dev"
timeout /t 3 /nobreak >nul

REM 프론트엔드 서버 시작
echo [2/2] 프론트엔드 서버 시작 중...
start "JobKorea-Frontend" cmd /k "cd /d %ROOT_DIR%frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   모든 서버가 시작되었습니다!
echo ========================================
echo.
echo 백엔드: http://localhost:4001
echo 프론트엔드: http://localhost:5173
echo.
echo 서버를 종료하려면 stop_all.bat를 실행하세요.
echo.
pause


