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
    const resumes = await getResumes({ status });
    res.json({ success: true, data: resumes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 수집 실행
router.post('/collect', async (req, res) => {
  try {
    const result = await collectUnreadResumes();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 상태 업데이트
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await updateResumeStatus(id, status);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PDF 다운로드
router.get('/pdf/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 경로 traversal 공격 방지
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filepath = path.join(__dirname, '../../pdfs', filename);
    
    // 파일 존재 여부 확인
    try {
      await fs.access(filepath);
    } catch (error) {
      return res.status(404).json({ success: false, error: 'PDF file not found' });
    }
    
    // PDF 파일 다운로드
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error('PDF 다운로드 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;