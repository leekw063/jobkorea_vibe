# 🧩 TRD: 잡코리아 이력서 관리 시스템 (JobKorea Resume Manager)

## 1. 시스템 개요

### 목적
잡코리아 기업 계정을 이용해 **진행중인 공고의 접수된 이력서를 자동 수집, AI 검토, PDF/Markdown 변환 및 보관**하고,  
**Supabase DB 및 Storage**를 통해 데이터를 안전하게 관리하며,  
**Gemini 2.0 Flash AI**를 활용한 이력서 검토 자동화를 제공하는 기술적 인프라를 정의합니다.

---

## 2. 시스템 구성도

```mermaid
graph TD
A[사용자 (HR Manager)] --> B[React Web Client]
B --> C[Express API Server]
C --> D[Playwright Automation Engine]
C --> E[Gemini 2.0 Flash AI]
C --> F[Supabase DB & Storage]
F -->|PDF & Resume Data| B
D -->|수집된 이력서 데이터| F
E -->|AI 검토 결과| F
```

---

## 3. 환경 설정 및 보안 구성

### `.env` 환경 변수

```bash
# JobKorea Credentials
JOBKOREA_ID=your_company_id
JOBKOREA_PW=your_password

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Gemini API (AI 이력서 검토)
GEMINI_API_KEY=your_gemini_api_key

# App Configuration
NODE_ENV=development
PORT=4001
```

> ⚠️ `.env` 파일은 `.gitignore`에 포함되어야 하며, 실제 배포 시에는 **AWS Secrets Manager** 또는 **GitHub Secrets**를 통해 관리합니다.

---

## 4. 백엔드 구조 (Node.js + Express)

### 폴더 구조
```
backend-new/
├── src/
│   ├── index.js                # 서버 엔트리포인트
│   ├── routes/
│   │   └── resumeRoutes.js     # 이력서 관련 API
│   ├── services/
│   │   ├── playwrightService.js# 잡코리아 자동화 + 공고 추출
│   │   ├── supabaseService.js  # Supabase CRUD
│   │   └── geminiService.js    # Gemini AI 검토
│   └── utils/
│       └── selectors.js        # Playwright selectors
├── pdfs/                       # PDF 저장 폴더
├── markdowns/                  # Markdown 저장 폴더
├── .env                        # 환경변수
└── package.json
```

### 의존성
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@supabase/supabase-js": "^2.38.4",
    "cheerio": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "pdf-parse": "^1.1.1",
    "playwright": "^1.40.0"
  }
}
```

---

## 5. Playwright 자동화 구성

### 5.1. 수집 프로세스

```javascript
// playwrightService.js
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export async function collectResumes() {
  const browser = await chromium.launch({ 
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false'
  });
  
  try {
    const page = await browser.newPage();
    
    // 1. 잡코리아 로그인
    await loginToJobKorea(page);
    
    // 2. 진행중인 공고 목록 수집 (중복 제외)
    const jobPostings = await collectJobPostings(page);
    
    // 3. 각 공고별 접수된 이력서 수집
    const allResumes = [];
    for (const jobPosting of jobPostings) {
      const resumes = await collectResumesFromJobPosting(page, jobPosting);
      allResumes.push(...resumes);
    }
    
    return {
      success: true,
      jobPostingCount: jobPostings.length,
      count: allResumes.length,
      resumes: allResumes
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      resumes: []
    };
  } finally {
    await browser.close();
  }
}

// 로그인
async function loginToJobKorea(page) {
  await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List');
  await page.waitForSelector(SELECTORS.COMPANY_TAB);
  await page.click(SELECTORS.COMPANY_TAB);
  await page.fill(SELECTORS.ID_INPUT, process.env.JOBKOREA_ID);
  await page.fill(SELECTORS.PASSWORD_INPUT, process.env.JOBKOREA_PW);
  await page.click(SELECTORS.LOGIN_BUTTON);
  await page.waitForURL('**/Corp/GIMng/**', { timeout: 15000 });
}

// 진행중인 공고 목록 수집 (중복 체크)
async function collectJobPostings(page) {
  // 이미 수집된 공고 목록 조회
  const existingJobPostings = await getExistingJobPostings();
  const existingIds = new Set(existingJobPostings.map(jp => jp.job_posting_id));
  
  await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List?PubType=1&SrchStat=1', {
    waitUntil: 'domcontentloaded',
    timeout: 10000
  });
  
  const jobItems = await page.locator('.giListItem').all();
  const jobPostings = [];
  
  for (const item of jobItems) {
    const title = await item.locator('.jobTitWrap a.tit').innerText().catch(() => '');
    const jobId = await item.locator(".date:has-text('공고번호') > span")
      .innerText()
      .catch(() => 
        item.locator("button[data-gno]").first.getAttribute('data-gno').catch(() => '')
      );
    
    // 중복 체크
    if (title && jobId && !existingIds.has(jobId.trim())) {
      jobPostings.push({ title: title.trim(), id: jobId.trim() });
      
      // 공고 상세 정보를 Markdown으로 추출 및 저장 (비동기)
      extractJobPostingMarkdownForStorage(jobId.trim(), title.trim())
        .catch(err => console.error(`공고 추출 오류: ${err.message}`));
    }
  }
  
  return jobPostings;
}

// 공고 상세 정보 Markdown 추출 및 저장
async function extractJobPostingMarkdownForStorage(jobId, jobTitle) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const detailUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read/${jobId}?Oem_Code=C1`;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);
    
    let markdown = `# ${jobTitle}\n\n`;
    
    // 제목 추출
    const titleSelectors = [
      'span[style*="18pt"]',
      'h1', 'h2', '.job-title',
      '.wrap-recruit-view h1',
      '.section-recruit h2'
    ];
    
    for (const selector of titleSelectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 3 && title.length < 100) {
        markdown = `# ${title}\n\n`;
        break;
      }
    }
    
    // 섹션별 키워드
    const sectionKeywords = [
      '주요업무', '담당업무', '지원자격', '자격요건', 
      '우대사항', '우대조건', '혜택 및 복지', '근무환경', 
      '채용 프로세스', '기업정보'
    ];
    
    // 텍스트 필터링 블랙리스트
    const blacklist = [
      '즉시지원', '로그인', '잡코리아', '입사지원', '공유하기',
      '스크랩', '관심기업', 'Copyright', '이용약관'
    ];
    
    const sections = {};
    sectionKeywords.forEach(key => sections[key] = []);
    
    // 컨테이너 제한 (관련 영역만 추출)
    const contentArea = $('.wrap-recruit-view, .section-recruit').html() || $('body').html();
    const $content = cheerio.load(contentArea);
    
    $content('p, li, h2, h3, dt, dd').each((i, elem) => {
      const text = $content(elem).text().trim();
      
      if (!text || text.length < 10 || text.length > 300) return;
      if (blacklist.some(word => text.includes(word))) return;
      
      let matched = false;
      for (const key of sectionKeywords) {
        if (text.includes(key)) {
          matched = true;
          break;
        }
        
        if (sections[key].length < 15) {
          const cleanText = text.replace(/[ㆍ●•]/g, '').trim();
          if (cleanText.length >= 10 && !sections[key].includes(cleanText)) {
            sections[key].push(cleanText);
          }
        }
      }
    });
    
    // Markdown 생성
    for (const [section, items] of Object.entries(sections)) {
      if (items.length > 0) {
        markdown += `## ${section}\n\n`;
        items.forEach(item => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }
    }
    
    // 섹션이 비어있으면 전체 텍스트 추출
    if (Object.values(sections).every(arr => arr.length === 0)) {
      const fullText = $content('body').text().trim().substring(0, 1500);
      markdown += `## 공고 내용\n\n${fullText}\n`;
    }
    
    // DB 저장
    await saveJobPosting({
      job_posting_id: jobId,
      job_posting_title: jobTitle,
      job_detail_md: markdown
    });
    
    console.log(`[${new Date().toISOString()}] ✅ 공고 Markdown 저장 완료 - ${jobId}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 공고 추출 오류 - ${jobId}:`, error.message);
  } finally {
    await browser.close();
  }
}

// 각 공고별 접수된 이력서 수집 (이름+이메일 중복 체크)
async function collectResumesFromJobPosting(page, jobPosting) {
  // 전체 이력서 목록 조회 (이름+이메일 중복 체크용)
  const existingResumes = await getExistingResumes();
  const existingKeys = existingResumes.map(r => `${r.applicant_name}_${r.applicant_email}`);
  
  // 이력서 목록 페이지로 이동
  await page.goto(`https://www.jobkorea.co.kr/Corp/Applicant/list?GI_No=${jobPosting.id}&PageCode=YN`);
  
  // 이력서 수집 로직
  const resumeRows = await page.locator('tr.applicantRow').all();
  const resumes = [];
  
  for (const row of resumeRows) {
    const resumeData = await extractResumeData(row, jobPosting);
    const resumeKey = `${resumeData.applicant_name}_${resumeData.applicant_email}`;
    
    // 중복 체크
    if (!existingKeys.includes(resumeKey)) {
      resumes.push(resumeData);
      existingKeys.push(resumeKey);
    } else {
      console.log(`[${new Date().toISOString()}] ⏭️  중복 이력서 건너뛰기 - ${resumeKey}`);
    }
  }
  
  return resumes;
}
```

### 5.2. PDF 및 Markdown 변환

```javascript
async function extractResumeData(row, jobPosting) {
  // PDF 생성
  const pdfFilename = `resume_${Date.now()}.pdf`;
  const pdfPath = path.join(__dirname, '../../pdfs', pdfFilename);
  await page.pdf({ path: pdfPath, format: 'A4' });
  
  // PDF를 Markdown으로 변환
  const mdFilename = `resume_${Date.now()}.md`;
  const mdPath = path.join(__dirname, '../../markdowns', mdFilename);
  
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(pdfBuffer);
  const mdContent = pdfData.text;
  await fs.writeFile(mdPath, mdContent, 'utf-8');
  
  return {
    applicant_name: '홍길동',
    applicant_email: 'hong@example.com',
    applicant_phone: '010-1234-5678',
    job_posting_title: jobPosting.title,
    job_posting_id: jobPosting.id,
    pdf_url: `/api/resumes/pdf/${pdfFilename}`,
    md_url: `/api/resumes/markdown/${mdFilename}`,
    status: '접수'
  };
}
```

---

## 6. Supabase 연동

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 데이터베이스 테이블

**resumes**
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| applicant_name | TEXT | 지원자 이름 (중복 체크) |
| applicant_email | TEXT | 이메일 (중복 체크) |
| applicant_phone | TEXT | 연락처 |
| job_posting_title | TEXT | 공고명 |
| job_posting_id | TEXT | 공고번호 |
| career | JSONB | 경력 |
| education | JSONB | 학력 |
| cover_letter | TEXT | 자기소개서 |
| pdf_url | TEXT | PDF 저장 경로 |
| md_url | TEXT | Markdown 저장 경로 |
| status | ENUM | 접수, 면접, 불합격, 합격 |
| review_score | INTEGER | AI 검토 점수 (0-100) |
| review_text | TEXT | AI 상세 평가 |
| reviewed_at | TIMESTAMP | 검토 일시 |
| deleted_at | TIMESTAMP | 삭제 일시 (Soft Delete) |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**job_postings**
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| job_posting_id | TEXT | 공고번호 (UNIQUE) |
| job_posting_title | TEXT | 공고명 |
| job_detail_md | TEXT | 공고 상세 (Markdown) |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

---

## 7. Gemini AI 검토 시스템

### geminiService.js

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function reviewResume(resumeMarkdown, jobPostingMarkdown) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `
당신은 HR 전문가입니다. 다음 채용 공고와 이력서를 비교 분석하여 평가해주세요.

## 채용 공고
${jobPostingMarkdown}

## 지원자 이력서
${resumeMarkdown}

## 평가 기준 (각 20점)
1. 기술스택 및 역량 적합도
2. 경력 수준 및 경험
3. 학력 및 자격증
4. 프로젝트 경험 및 성과
5. 커뮤니케이션 능력 및 자기소개서

## 응답 형식
점수: [0-100점 사이의 정수]
평가:
[약 1000자 분량의 상세 평가를 작성해주세요]
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // 점수 파싱
  const scoreMatch = response.match(/점수[:\s]*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
  
  // 평가 텍스트 파싱
  const reviewMatch = response.match(/평가[:\s]*([\s\S]+)/);
  const review = reviewMatch ? reviewMatch[1].trim() : response;
  
  return {
    score,
    review,
    rawResponse: response
  };
}
```

---

## 8. API 엔드포인트

```javascript
// resumeRoutes.js
import express from 'express';
import { reviewResume } from '../services/geminiService.js';
import { getJobPostingMarkdown } from '../services/supabaseService.js';

const router = express.Router();

// 이력서 목록 조회 (필터링: 상태, 공고명, 공고번호, 삭제 여부)
router.get('/', async (req, res) => {
  const { status, job_posting_title, job_posting_id, showDeleted } = req.query;
  const resumes = await getResumes({ 
    status, 
    job_posting_title, 
    job_posting_id,
    showDeleted: showDeleted === 'true'
  });
  res.json({ success: true, data: resumes });
});

// 이력서 수집 실행
router.post('/collect', async (req, res) => {
  const result = await collectResumes();
  res.json(result);
});

// 이력서 상태 업데이트
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // '접수', '면접', '불합격', '합격'
  const updated = await updateResumeStatus(id, status);
  res.json({ success: true, data: updated });
});

// AI 이력서 검토
router.post('/:id/review', async (req, res) => {
  const { id } = req.params;
  
  // 이력서 정보 조회
  const resume = await getResumeById(id);
  const resumeMarkdown = await fs.readFile(resume.md_url, 'utf-8');
  
  // 공고 Markdown 조회 (DB 우선, 없으면 실시간 추출)
  let jobPostingMarkdown = await getJobPostingMarkdown(resume.job_posting_id);
  if (!jobPostingMarkdown) {
    jobPostingMarkdown = await extractJobPostingMarkdown(resume.job_posting_id);
  }
  
  // Gemini AI 검토
  const reviewResult = await reviewResume(resumeMarkdown, jobPostingMarkdown);
  
  // DB에 저장
  await updateResumeReviewScore(id, reviewResult.score, reviewResult.review);
  
  res.json({ 
    success: true, 
    score: reviewResult.score,
    review: reviewResult.review,
    rawResponse: reviewResult.rawResponse
  });
});

// 휴지통 이동 (Soft Delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await softDeleteResume(id);
  res.json({ success: true });
});

// 복원
router.post('/:id/restore', async (req, res) => {
  const { id } = req.params;
  await restoreResume(id);
  res.json({ success: true });
});

// PDF 다운로드
router.get('/pdf/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../../pdfs', filename);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(path.resolve(filepath));
});

// Markdown 다운로드
router.get('/markdown/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../../markdowns', filename);
  res.setHeader('Content-Type', 'text/markdown');
  res.sendFile(path.resolve(filepath));
});

export default router;
```

---

## 9. 프론트엔드 구조

- **React 18 + Vite + TailwindCSS + Lucide Icons**
- 주요 페이지:
  - `/dashboard` : 이력서 목록 조회, 필터링, AI 검토
  - `/settings` : 계정 및 환경 설정
  - `/logs` : 수집 로그 확인

### 주요 기능

```typescript
// api.js

// 이력서 목록 조회 (필터링)
export const getResumes = async (filters?: {
  status?: string;
  job_posting_title?: string;
  job_posting_id?: string;
  showDeleted?: boolean;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.job_posting_title) params.append('job_posting_title', filters.job_posting_title);
  if (filters?.job_posting_id) params.append('job_posting_id', filters.job_posting_id);
  if (filters?.showDeleted) params.append('showDeleted', 'true');
  
  const query = params.toString();
  return fetch(`/api/resumes${query ? '?' + query : ''}`).then(res => res.json());
};

// 이력서 상태 업데이트
export const updateResumeStatus = async (id: string, status: '접수' | '면접' | '불합격' | '합격') => {
  return fetch(`/api/resumes/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).then(res => res.json());
};

// AI 검토
export const reviewResume = async (id: string) => {
  return fetch(`/api/resumes/${id}/review`, {
    method: 'POST'
  }).then(res => res.json());
};
```

### React Portal 기반 모달

```jsx
// ResumeCard.jsx
import { createPortal } from 'react-dom';

function ResumeCard({ resume }) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const handleReview = async () => {
    const result = await reviewResume(resume.id);
    setReviewScore(result.score);
    setReviewText(result.review);
    setShowReviewModal(true);
  };
  
  return (
    <>
      <div className="resume-card">
        {/* 카드 내용 */}
        {resume.review_score && (
          <button onClick={() => setShowReviewModal(true)}>
            점수: {resume.review_score}점
          </button>
        )}
      </div>
      
      {/* React Portal로 모달 렌더링 */}
      {showReviewModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI 검토 결과</h3>
              <button onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <p className="score">점수: {reviewScore}점</p>
              <pre className="review-text">{reviewText}</pre>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowReviewModal(false)}>닫기</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
```

---

## 10. 현재 구성

| 항목 | 설명 |
|------|------|
| 백엔드 | Node.js + Express (Port 4001) |
| 프론트엔드 | React 18 + Vite + Tailwind CSS (Port 5173) |
| DB | Supabase PostgreSQL |
| 자동화 | Playwright (Chromium) + Cheerio |
| AI | Google Gemini 2.0 Flash |
| 상태 | ✅ 실행 중 |

### 실행 명령어
```bash
# 루트에서 동시 실행
npm run dev

# 또는 배치 파일 (Windows)
start_all.bat

# 백엔드만
cd backend-new && npm run dev

# 프론트엔드만  
cd frontend && npm run dev
```

---

## 11. 보안 및 법적 고려사항

| 구분 | 내용 |
|------|------|
| 인증정보 | `.env` 파일로 관리, gitignore 포함 |
| 데이터 보호 | HTTPS 통신, RLS 적용 |
| 개인정보 처리 | PIPA 준수, 최소 수집 |
| 크롤링 범위 | 기업회원 내부 기능에 한정 사용 |
| AI 비용 | Gemini API 사용량 모니터링 |

---

## 12. 테스트 및 품질 관리

| 테스트 항목 | 기준 |
|--------------|------|
| 로그인 성공 | 세션 유지 및 진행중인 공고 접근 가능 |
| 공고 수집 | 공고명 및 공고번호 정확히 추출 + Markdown 저장 |
| 중복 체크 (공고) | 이미 수집된 공고는 제외 |
| 중복 체크 (이력서) | 이름+이메일 조합으로 중복 제외 |
| 데이터 저장 | Supabase DB 삽입 확인 |
| PDF 변환 | 98% 이상 성공률 |
| Markdown 변환 | PDF → Markdown 변환 성공률 95% 이상 |
| AI 검토 | Gemini 2.0 Flash 응답 시간 < 5초 |
| AI 검토 결과 | 점수 + 1000자 상세 평가 포함 |
| Rate Limit | 1.5초 Delay 정책 정상 작동 |
| 오류 처리 | Exception → Logger 기록 |
| UI 렌더링 | 대시보드 1초 이내 응답 |
| 상태 변경 | 드롭다운으로 상태 변경 정상 작동 |
| 모달 표시 | React Portal로 독립적 렌더링 |

---

## 13. 주요 기술 구현

### Cheerio를 활용한 HTML 파싱
- BeautifulSoup 스타일의 HTML 파싱
- CSS 셀렉터 지원
- 빠른 DOM 탐색

### React Portal
- 모달을 `document.body`에 직접 렌더링
- 부모 컴포넌트 CSS 제약 없음
- 스크롤 가능한 컨텐츠 영역

### Soft Delete
- `deleted_at` 컬럼으로 논리 삭제
- 휴지통 기능 제공
- 복원 가능

### 중복 방지 로직
- **공고**: `job_posting_id` 기준
- **이력서**: `applicant_name + applicant_email` 조합

---

**버전**: 1.0.0  
**최종 업데이트**: 2025-11-18
