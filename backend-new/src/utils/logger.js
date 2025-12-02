// 로그 저장 및 실시간 전송을 위한 로거 모듈

// 메모리에 로그 저장 (최대 1000개)
const MAX_LOGS = 1000;
const logs = [];

// SSE 클라이언트 목록
const clients = new Set();

// 로그 레벨
const LOG_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  DEBUG: 'debug'
};

// 로그 추가 함수
function addLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    id: Date.now(),
    timestamp,
    level,
    message,
    data
  };
  
  // 메모리에 저장
  logs.push(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  // 콘솔에도 출력
  const emoji = getEmoji(level);
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log(`[${timestamp}]    Data:`, data);
  }
  
  // SSE 클라이언트들에게 전송
  broadcastLog(logEntry);
  
  return logEntry;
}

// 이모지 매핑
function getEmoji(level) {
  switch (level) {
    case LOG_LEVELS.INFO: return 'ℹ️';
    case LOG_LEVELS.SUCCESS: return '✅';
    case LOG_LEVELS.WARNING: return '⚠️';
    case LOG_LEVELS.ERROR: return '❌';
    case LOG_LEVELS.DEBUG: return '🔍';
    default: return '📋';
  }
}

// SSE 클라이언트에게 로그 브로드캐스트
function broadcastLog(logEntry) {
  const data = JSON.stringify(logEntry);
  clients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      clients.delete(client);
    }
  });
}

// SSE 클라이언트 추가
function addClient(res) {
  clients.add(res);
  
  // 연결 종료 시 클라이언트 제거
  res.on('close', () => {
    clients.delete(res);
  });
}

// 최근 로그 가져오기
function getLogs(limit = 100) {
  return logs.slice(-limit);
}

// 로그 초기화
function clearLogs() {
  logs.length = 0;
}

// 편의 함수들
const logger = {
  info: (message, data) => addLog(LOG_LEVELS.INFO, message, data),
  success: (message, data) => addLog(LOG_LEVELS.SUCCESS, message, data),
  warning: (message, data) => addLog(LOG_LEVELS.WARNING, message, data),
  error: (message, data) => addLog(LOG_LEVELS.ERROR, message, data),
  debug: (message, data) => addLog(LOG_LEVELS.DEBUG, message, data),
  
  addClient,
  getLogs,
  clearLogs,
  LOG_LEVELS
};

export default logger;


