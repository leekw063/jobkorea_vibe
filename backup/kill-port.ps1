# 포트 4001을 사용하는 프로세스 종료
$connections = Get-NetTCPConnection -LocalPort 4001 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "포트 4001을 사용하는 프로세스 종료: PID $($proc.Id) - $($proc.ProcessName)"
            Stop-Process -Id $proc.Id -Force
        }
    }
} else {
    Write-Host "포트 4001을 사용하는 프로세스가 없습니다."
}


