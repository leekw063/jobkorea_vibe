import express from 'express';
import { getResumes, updateResumeStatus, updateResumeReviewScore, softDeleteResume, restoreResume, permanentDeleteResume, getJobPostingMarkdown } from '../services/supabaseService.js';
import { collectResumes, extractJobPostingMarkdown } from '../services/playwrightService.js';
import { reviewResume } from '../services/geminiService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
console.log(`[${new Date().toISOString()}] ✅ Resume 라우트 모듈 로드 완료`);

// 이력서 목록 조회 (필터링: 상태, 공고명, 공고번호, 삭제 여부)
router.get('/', async (req, res) => {
  try {
    const { status, job_posting_title, job_posting_id, include_deleted, deleted_only } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (job_posting_title) filters.job_posting_title = job_posting_title;
    if (job_posting_id) filters.job_posting_id = job_posting_id;
    if (include_deleted === 'true') filters.include_deleted = true;
    if (deleted_only === 'true') filters.deleted_only = true;
    
    console.log(`[${new Date().toISOString()}] 📋 이력서 목록 조회 요청 - 필터:`, filters);
    const resumes = await getResumes(filters);
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
    const result = await collectResumes();
    console.log(`[${new Date().toISOString()}] ✅ 이력서 수집 완료 - 공고: ${result.jobPostingCount || 0}개, 이력서: ${result.count || 0}개`);
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 수집 실패:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 상태 업데이트 (접수/면접/불합격/합격)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // '접수', '면접', '불합격', '합격'
    
    // 상태 값 검증
    const validStatuses = ['접수', '면접', '불합격', '합격'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    console.log(`[${new Date().toISOString()}] 🔄 이력서 상태 업데이트 - ID: ${id}, Status: ${status}`);
    const updated = await updateResumeStatus(id, status);
    console.log(`[${new Date().toISOString()}] ✅ 이력서 상태 업데이트 완료 - ID: ${id}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 상태 업데이트 실패 - ID: ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 소프트 삭제 (휴지통으로 이동)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] 🗑️ 이력서 소프트 삭제 요청 - ID: ${id}`);
    const deleted = await softDeleteResume(id);
    console.log(`[${new Date().toISOString()}] ✅ 이력서 소프트 삭제 완료 - ID: ${id}`);
    res.json({ success: true, data: deleted, message: '이력서가 휴지통으로 이동되었습니다.' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 소프트 삭제 실패 - ID: ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 복원 (휴지통에서 복원)
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] ♻️ 이력서 복원 요청 - ID: ${id}`);
    const restored = await restoreResume(id);
    console.log(`[${new Date().toISOString()}] ✅ 이력서 복원 완료 - ID: ${id}`);
    res.json({ success: true, data: restored, message: '이력서가 복원되었습니다.' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 복원 실패 - ID: ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 영구 삭제 (휴지통에서 완전 삭제)
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] 🗑️ 이력서 영구 삭제 요청 - ID: ${id}`);
    const deleted = await permanentDeleteResume(id);
    console.log(`[${new Date().toISOString()}] ✅ 이력서 영구 삭제 완료 - ID: ${id}`);
    res.json({ success: true, data: deleted, message: '이력서가 영구적으로 삭제되었습니다.' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 영구 삭제 실패 - ID: ${req.params.id}:`, error.message);
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

// Markdown 다운로드
router.get('/markdown/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    console.log(`[${new Date().toISOString()}] 📝 Markdown 다운로드 요청 - 파일: ${filename}`);
    
    // 경로 traversal 공격 방지
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`[${new Date().toISOString()}] ❌ 잘못된 파일명: ${filename}`);
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filepath = path.join(__dirname, '../../markdowns', filename);
    
    // 파일 존재 여부 확인
    try {
      await fs.access(filepath);
      console.log(`[${new Date().toISOString()}] ✅ Markdown 파일 발견: ${filepath}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Markdown 파일 없음: ${filepath}`);
      return res.status(404).json({ success: false, error: 'Markdown file not found' });
    }
    
    // Markdown 파일 다운로드
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    console.log(`[${new Date().toISOString()}] 📤 Markdown 전송 시작: ${filename}`);
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Markdown 다운로드 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Markdown 열람 (텍스트로 반환)
router.get('/markdown/:filename/view', async (req, res) => {
  try {
    const filename = req.params.filename;
    console.log(`[${new Date().toISOString()}] 📖 Markdown 열람 요청 - 파일: ${filename}`);
    
    // 경로 traversal 공격 방지
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`[${new Date().toISOString()}] ❌ 잘못된 파일명: ${filename}`);
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filepath = path.join(__dirname, '../../markdowns', filename);
    
    // 파일 존재 여부 확인
    try {
      await fs.access(filepath);
      console.log(`[${new Date().toISOString()}] ✅ Markdown 파일 발견: ${filepath}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Markdown 파일 없음: ${filepath}`);
      return res.status(404).json({ success: false, error: 'Markdown file not found' });
    }
    
    // Markdown 파일 읽기
    const content = await fs.readFile(filepath, 'utf-8');
    console.log(`[${new Date().toISOString()}] 📤 Markdown 내용 반환: ${filename} (${content.length} bytes)`);
    res.json({ success: true, content });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Markdown 열람 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 공고 정보를 Markdown으로 추출
router.get('/job-postings/:jobPostingId/markdown', async (req, res) => {
  try {
    const { jobPostingId } = req.params;
    console.log(`[${new Date().toISOString()}] 📋 공고 정보 Markdown 추출 요청 - 공고번호: ${jobPostingId}`);
    
    const result = await extractJobPostingMarkdown(jobPostingId);
    
    if (result.success) {
      console.log(`[${new Date().toISOString()}] ✅ 공고 정보 추출 완료 - 공고번호: ${jobPostingId}`);
      res.json(result);
    } else {
      console.error(`[${new Date().toISOString()}] ❌ 공고 정보 추출 실패 - 공고번호: ${jobPostingId}`);
      res.status(500).json(result);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 공고 정보 추출 오류:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 이력서 검토 (Gemini API 사용)
router.post('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] 🤖 이력서 검토 요청 - ID: ${id}`);
    
    // 이력서 정보 조회
    const { getResumeById } = await import('../services/supabaseService.js');
    const resume = await getResumeById(id);
    
    if (!resume) {
      return res.status(404).json({ success: false, error: '이력서를 찾을 수 없습니다.' });
    }
    
    // 공고 정보 Markdown 조회 (DB에서 저장된 Markdown 사용)
    let jobPostingMarkdown = '';
    if (resume.job_posting_id) {
      try {
        // 먼저 DB에서 저장된 Markdown 조회
        jobPostingMarkdown = await getJobPostingMarkdown(resume.job_posting_id);
        
        // DB에 저장된 Markdown이 없으면 실시간으로 추출
        if (!jobPostingMarkdown) {
          console.log(`[${new Date().toISOString()}] 📝 DB에 저장된 공고 Markdown이 없어 실시간 추출 시도 - 공고번호: ${resume.job_posting_id}`);
          const jobPostingResult = await extractJobPostingMarkdown(resume.job_posting_id);
          if (jobPostingResult.success) {
            jobPostingMarkdown = jobPostingResult.markdown;
          }
        } else {
          console.log(`[${new Date().toISOString()}] ✅ DB에서 공고 Markdown 조회 완료 - 공고번호: ${resume.job_posting_id}`);
        }
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ 공고 정보 추출 실패 (계속 진행):`, error.message);
      }
    }
    
    // 이력서 Markdown 원문 로드
    let resumeMarkdownContent = '';
    if (resume.md_url) {
      try {
        let filename = '';
        try {
          if (resume.md_url.startsWith('http')) {
            const url = new URL(resume.md_url);
            filename = path.basename(url.pathname);
          } else {
            filename = path.basename(resume.md_url);
          }
        } catch {
          filename = path.basename(resume.md_url);
        }
        
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          throw new Error('잘못된 md_url 형식');
        }
        
        const filepath = path.join(__dirname, '../../markdowns', filename);
        resumeMarkdownContent = await fs.readFile(filepath, 'utf-8');
        console.log(`[${new Date().toISOString()}] ✅ 이력서 Markdown 로드 완료 - ${filename} (${resumeMarkdownContent.length} bytes)`);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ 이력서 Markdown 로드 실패 (기본 정보만 사용): ${error.message}`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ 이력서 md_url이 없어 기본 정보만 사용합니다.`);
    }
    
    // Gemini API로 검토
    const reviewResult = await reviewResume(resume, jobPostingMarkdown, resumeMarkdownContent);
    
    if (reviewResult.success) {
      // 검토 점수와 결과 텍스트를 DB에 저장
      await updateResumeReviewScore(id, reviewResult.score, reviewResult.review);
      
      console.log(`[${new Date().toISOString()}] ✅ 이력서 검토 완료 - ID: ${id}, 점수: ${reviewResult.score}`);
      res.json({ 
        success: true, 
        score: reviewResult.score,
        review: reviewResult.review || '',
        rawResponse: reviewResult.rawResponse || ''
      });
    } else {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 검토 실패 - ID: ${id}`);
      res.status(500).json({ success: false, error: '검토에 실패했습니다.' });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 검토 오류 - ID: ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;