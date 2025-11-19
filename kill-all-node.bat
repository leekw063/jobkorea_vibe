@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ========================================
echo   ⚠️ 모든 Node.js 프로세스 강제 종료
echo ========================================
echo.
echo 경고: 이 스크립트는 시스템의 모든 Node.js 프로세스를 종료합니다.
echo        다른 Node.js 애플리케이션도 영향을 받을 수 있습니다.
echo.
echo 계속하려면 아무 키나 누르세요...
pause >nul

echo.
echo 🔍 실행 중인 Node.js 프로세스 확인 중...
set count=0
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" 2^>nul ^| findstr /C:"node.exe"') do (
    set /a count+=1
)

if !count! equ 0 (
    echo ℹ️ 실행 중인 Node.js 프로세스가 없습니다.
    goto :end
)

echo 📊 총 !count!개의 Node.js 프로세스 발견
echo.
echo 🛑 모든 Node.js 프로세스 종료 중...

taskkill /F /IM node.exe >nul 2>&1

if !errorlevel! equ 0 (
    echo ✅ 모든 Node.js 프로세스가 종료되었습니다.
) else (
    echo ⚠️ 일부 프로세스 종료에 실패했습니다.
)

echo.
echo 🔍 포트 상태 확인 중...
timeout /t 2 /nobreak >nul

netstat -ano 2>nul | findstr :4001 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo     ⚠️ 포트 4001이 여전히 사용 중입니다!
) else (
    echo     ✅ 포트 4001 정상
)

netstat -ano 2>nul | findstr :5173 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo     ⚠️ 포트 5173이 여전히 사용 중입니다!
) else (
    echo     ✅ 포트 5173 정상
)

:end
echo.
echo ========================================
echo   완료
echo ========================================
echo.
pause

