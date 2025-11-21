// 전역 에러 핸들러 (가장 먼저 설정)
process.on('uncaughtException', (error) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] 🔥 UNCAUGHT EXCEPTION:`);
  console.error(`[${timestamp}]    Error:`, error);
  console.error(`[${timestamp}]    Message:`, error.message);
  console.error(`[${timestamp}]    Stack:`, error.stack);
  console.error(`[${timestamp}]    Name:`, error.name);
  if (error.code) {
    console.error(`[${timestamp}]    Code:`, error.code);
  }
  if (error.errno) {
    console.error(`[${timestamp}]    Errno:`, error.errno);
  }
  if (error.syscall) {
    console.error(`[${timestamp}]    Syscall:`, error.syscall);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ⚠️ UNHANDLED REJECTION:`);
  console.error(`[${timestamp}]    Reason:`, reason);
  console.error(`[${timestamp}]    Promise:`, promise);
  if (reason instanceof Error) {
    console.error(`[${timestamp}]    Message:`, reason.message);
    console.error(`[${timestamp}]    Stack:`, reason.stack);
  }
});

console.log(`[${new Date().toISOString()}] 🔧 서버 초기화 시작...`);
console.log(`[${new Date().toISOString()}]    Node.js 버전: ${process.version}`);
console.log(`[${new Date().toISOString()}]    플랫폼: ${process.platform}`);
console.log(`[${new Date().toISOString()}]    작업 디렉토리: ${process.cwd()}`);

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(`[${new Date().toISOString()}] 📁 현재 파일 경로: ${__filename}`);
console.log(`[${new Date().toISOString()}] 📁 현재 디렉토리: ${__dirname}`);

const envPath = join(__dirname, '../.env');
console.log(`[${new Date().toISOString()}] 🔍 환경 변수 파일 경로: ${envPath}`);

try {
  const envResult = dotenv.config({ path: envPath });
  if (envResult.error) {
    console.warn(`[${new Date().toISOString()}] ⚠️ .env 파일 로드 실패:`, envResult.error.message);
  } else {
    console.log(`[${new Date().toISOString()}] ✅ 환경 변수 파일 로드 완료`);
    console.log(`[${new Date().toISOString()}]    로드된 환경 변수 수: ${Object.keys(envResult.parsed || {}).length}`);
  }
} catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ 환경 변수 로드 오류:`, error.message);
}

console.log(`[${new Date().toISOString()}] 📦 Express 모듈 로드 중...`);
import express from 'express';
console.log(`[${new Date().toISOString()}] ✅ Express 모듈 로드 완료`);

console.log(`[${new Date().toISOString()}] 📦 CORS 모듈 로드 중...`);
import cors from 'cors';
console.log(`[${new Date().toISOString()}] ✅ CORS 모듈 로드 완료`);

console.log(`[${new Date().toISOString()}] 📦 라우트 모듈 로드 중...`);
import resumeRoutesModule from './routes/resumeRoutes.js';
const resumeRoutes = resumeRoutesModule.default || resumeRoutesModule;
console.log(`[${new Date().toISOString()}] ✅ 라우트 모듈 로드 완료`);

console.log(`[${new Date().toISOString()}] 🏗️ Express 앱 생성 중...`);
const app = express();
const PORT = process.env.PORT || 4001;
console.log(`[${new Date().toISOString()}] ✅ Express 앱 생성 완료`);
console.log(`[${new Date().toISOString()}]    설정된 포트: ${PORT}`);

// Middleware
console.log(`[${new Date().toISOString()}] 🔧 미들웨어 설정 중...`);
app.use(cors());
console.log(`[${new Date().toISOString()}]    ✅ CORS 미들웨어 설정 완료`);

app.use(express.json());
console.log(`[${new Date().toISOString()}]    ✅ JSON 파서 미들웨어 설정 완료`);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📥 ${req.method} ${req.path}`);
  if (Object.keys(req.query).length > 0) {
    console.log(`[${timestamp}]    Query:`, req.query);
  }
  if (Object.keys(req.body).length > 0) {
    console.log(`[${timestamp}]    Body:`, JSON.stringify(req.body, null, 2));
  }
  
  const originalSend = res.send;
  res.send = function(data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📤 ${req.method} ${req.path} - Status: ${res.statusCode}`);
    if (data && typeof data === 'string' && data.length < 500) {
      try {
        const parsed = JSON.parse(data);
        console.log(`[${timestamp}]    Response:`, JSON.stringify(parsed, null, 2));
      } catch (e) {
        // Not JSON, skip
      }
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Routes
console.log(`[${new Date().toISOString()}] 🛣️ 라우트 등록 중...`);
try {
  app.use('/api/resumes', resumeRoutes);
  console.log(`[${new Date().toISOString()}]    ✅ /api/resumes 라우트 등록 완료`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ 라우트 등록 실패:`, error.message);
  console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
  throw error;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Favicon handler (브라우저가 자동으로 요청하는 favicon.ico를 조용히 처리)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ERROR in ${req.method} ${req.path}:`);
  console.error(`[${timestamp}]    Message:`, err.message);
  console.error(`[${timestamp}]    Stack:`, err.stack);
  if (err.status) {
    console.error(`[${timestamp}]    Status Code:`, err.status);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

console.log(`[${new Date().toISOString()}] 🎧 서버 리스닝 시작 중...`);
try {
  app.listen(PORT, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🚀 서버 시작됨`);
    console.log(`[${timestamp}]    포트: ${PORT}`);
    console.log(`[${timestamp}]    환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[${timestamp}]    Health Check: http://localhost:${PORT}/health`);
    console.log(`[${timestamp}]    API Base: http://localhost:${PORT}/api`);
    console.log(`[${timestamp}]    이력서 수집: POST http://localhost:${PORT}/api/resumes/collect`);
    console.log(`[${timestamp}]    이력서 목록: GET http://localhost:${PORT}/api/resumes`);
  });
} catch (error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ 서버 시작 실패:`, error.message);
  console.error(`[${timestamp}]    Stack:`, error.stack);
  console.error(`[${timestamp}]    Error details:`, error);
  process.exit(1);
}
