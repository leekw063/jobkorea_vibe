import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import resumeRoutes from './routes/resumeRoutes.js';

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/resumes', resumeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 서버 시작됨`);
  console.log(`[${timestamp}]    포트: ${PORT}`);
  console.log(`[${timestamp}]    환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[${timestamp}]    Health Check: http://localhost:${PORT}/health`);
  console.log(`[${timestamp}]    API Base: http://localhost:${PORT}/api`);
});
