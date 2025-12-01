@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ========================================
echo   JobKorea 서버 종료
echo ========================================
echo.

REM 1단계: 특정 포트를 사용하는 프로세스 종료
echo 📍 1단계: 특정 포트를 사용하는 Node.js 프로세스 종료 중...

REM 포트 4001 (백엔드) 사용 프로세스 종료
echo [1/2] 백엔드 서버 (포트 4001) 종료 중...
set found=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :4001 ^| findstr LISTENING') do (
    set found=1
    echo     PID %%a 종료 중...
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo     ✅ PID %%a 종료 완료
    ) else (
        echo     ⚠️ PID %%a 종료 실패 (이미 종료되었거나 권한이 없습니다)
    )
)
if !found! equ 0 (
    echo     ℹ️ 포트 4001을 사용하는 프로세스가 없습니다.
)

REM 포트 5173 (프론트엔드) 사용 프로세스 종료
echo [2/2] 프론트엔드 서버 (포트 5173) 종료 중...
set found=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5173 ^| findstr LISTENING') do (
    set found=1
    echo     PID %%a 종료 중...
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo     ✅ PID %%a 종료 완료
    ) else (
        echo     ⚠️ PID %%a 종료 실패 (이미 종료되었거나 권한이 없습니다)
    )
)
if !found! equ 0 (
    echo     ℹ️ 포트 5173을 사용하는 프로세스가 없습니다.
)

REM 남은 Node.js 프로세스 추가 확인
echo.
echo [3/3] 남은 프로세스 추가 확인중...
set cleanup_count=0

REM 포트를 사용하는 모든 프로세스 한번 더 정리
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":4001 " ^| findstr "LISTENING"') do (
    set /a cleanup_count+=1
    taskkill /F /PID %%a >nul 2>&1
    echo     PID %%a 추가 정리 완료
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    set /a cleanup_count+=1
    taskkill /F /PID %%a >nul 2>&1
    echo     PID %%a 추가 정리 완료
)
if !cleanup_count! equ 0 (
    echo     OK - 추가 정리 필요 없음
)

REM 2단계: 추가 대기 및 재확인
echo.
echo 📍 2단계: 프로세스 종료 대기 중...
timeout /t 2 /nobreak >nul

REM 3단계: 최종 확인
echo.
echo 📍 3단계: 포트 상태 최종 확인...
set still_running=0

netstat -ano 2>nul | findstr :4001 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo     ⚠️ 경고: 포트 4001이 여전히 사용 중입니다!
    set still_running=1
) else (
    echo     ✅ 포트 4001 정상 종료 확인
)

netstat -ano 2>nul | findstr :5173 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo     ⚠️ 경고: 포트 5173이 여전히 사용 중입니다!
    set still_running=1
) else (
    echo     ✅ 포트 5173 정상 종료 확인
)

echo.
echo ========================================
if !still_running! equ 0 (
    echo   ✅ 모든 서버가 정상 종료되었습니다!
) else (
    echo   ⚠️ 일부 프로세스가 여전히 실행 중입니다.
    echo   문제가 지속되면 작업 관리자에서 수동으로 종료하거나
    echo   taskkill /F /IM node.exe 명령을 실행하세요.
)
echo ========================================
echo.
echo 💡 참고: 이 스크립트는 포트 4001과 5173을 사용하는 프로세스만 종료합니다.
echo    다른 Node.js 프로세스는 안전하게 유지됩니다.
echo.


