@echo off
echo 포트 4001을 사용하는 프로세스를 찾는 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001 ^| findstr LISTENING') do (
    echo 프로세스 ID %%a 종료 중...
    taskkill /F /PID %%a
)
echo 완료!


