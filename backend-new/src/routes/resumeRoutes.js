import express from 'express';
import { getResumes, updateResumeStatus } from '../services/supabaseService.js';
import { collectUnreadResumes } from '../services/playwrightService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// 이력서 목록 조회
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    console.log(`[${new Date().toISOString()}] 📋 이력서 목록 조회 요청 - status: ${status || 'all'}`);
    const resumes = await getResumes({ status });
    console.log(`[${new Date().toISOString()}] ✅ 이력서 ${resumes.length}개 조회 완료`);
    res.json({ success: true, data: resumes });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 목록 조회 실패:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 수집 실행
router.post('/collect', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 이력서 수집 시작`);
    const result = await collectUnreadResumes();
    console.log(`[${new Date().toISOString()}] ✅ 이력서 수집 완료 - ${result.count || 0}개 수집`);
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 수집 실패:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 상태 업데이트
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`[${new Date().toISOString()}] 🔄 이력서 상태 업데이트 - ID: ${id}, Status: ${status}`);
    const updated = await updateResumeStatus(id, status);
    console.log(`[${new Date().toISOString()}] ✅ 이력서 상태 업데이트 완료 - ID: ${id}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 상태 업데이트 실패 - ID: ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PDF 다운로드
router.get('/pdf/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    console.log(`[${new Date().toISOString()}] 📄 PDF 다운로드 요청 - 파일: ${filename}`);
    
    // 경로 traversal 공격 방지
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`[${new Date().toISOString()}] ❌ 잘못된 파일명: ${filename}`);
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filepath = path.join(__dirname, '../../pdfs', filename);
    
    // 파일 존재 여부 확인
    try {
      await fs.access(filepath);
      console.log(`[${new Date().toISOString()}] ✅ PDF 파일 발견: ${filepath}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ PDF 파일 없음: ${filepath}`);
      return res.status(404).json({ success: false, error: 'PDF file not found' });
    }
    
    // PDF 파일 다운로드
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    console.log(`[${new Date().toISOString()}] 📤 PDF 전송 시작: ${filename}`);
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ PDF 다운로드 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;