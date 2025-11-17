@echo off
chcp 65001 >nul
echo ========================================
echo   JobKorea 서버 종료
echo ========================================
echo.

REM Node.js 프로세스 종료
echo Node.js 프로세스 종료 중...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js 프로세스가 종료되었습니다.
) else (
    echo ℹ️ 실행 중인 Node.js 프로세스가 없습니다.
)

REM CMD 창에서 "JobKorea" 제목을 가진 창 종료
echo.
echo JobKorea 서버 창 종료 중...
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq JobKorea*" /FO LIST ^| findstr /C:"PID"') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo   모든 서버가 종료되었습니다!
echo ========================================
echo.
pause


