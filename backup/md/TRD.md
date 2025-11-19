# 🧩 TRD: 잡코리아 이력서 관리 시스템 (JobKorea Resume Manager)

## 1. 시스템 개요

### 목적
잡코리아 기업 계정을 이용해 **진행중인 공고의 접수된 이력서를 자동 수집, 정리, PDF/Markdown 변환 및 보관**하고,  
**Supabase DB 및 Storage**를 통해 데이터를 안전하게 관리하는 기술적 인프라를 정의합니다.

---

## 2. 시스템 구성도

```mermaid
graph TD
A[사용자 (HR Manager)] --> B[React Web Client]
B --> C[Express API Server]
C --> D[Playwright Automation Engine]
C --> E[Supabase DB & Storage]
E -->|PDF & Resume Data| B
D -->|수집된 이력서 데이터| E
```

---

## 3. 환경 설정 및 보안 구성

### `.env` 환경 변수 예시

```bash
# JobKorea Credentials
JOBKOREA_ID=markany
JOBKOREA_PW=markany2018!

# Supabase Configuration
SUPABASE_URL=https://ydaqccbvionvjbvefuln.supabase.co
SUPABASE_ANON_KEY=sbp_0f69d6e679dc70239d931c4f4ac3bfd38e24a6a5

# App Configuration
NODE_ENV=development
PORT=4001
PLAYWRIGHT_HEADLESS=true
```

> ⚠️ `.env` 파일은 gitignore에 포함되어야 하며, 실제 배포 시에는 **AWS Secrets Manager** 또는 **GitHub Secrets**를 통해 관리합니다.

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
│   │   ├── playwrightService.js# 잡코리아 자동화
│   │   └── supabaseService.js  # Supabase CRUD
│   └── utils/
│       └── selectors.js        # Playwright selectors
├── pdfs/                       # PDF 저장 폴더
├── markdowns/                  # Markdown 저장 폴더
├── .env                        # 환경변수
└── package.json
```

### 의존성 추가
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "express": "^4.18.2",
    "playwright": "^1.40.0",
    "markitdown": "^1.0.0"  // PDF → Markdown 변환
  }
}
```

---

## 5. Playwright 자동화 구성

### 5.1. 수집 프로세스

```javascript
// playwrightService.js
export async function collectResumes() {
  const browser = await chromium.launch({ 
    headless: process.env.PLAYWRIGHT_HEADLESS === 'true' 
  });
  
  try {
    const page = await browser.newPage();
    
    // 1. 잡코리아 로그인
    await loginToJobKorea(page);
    
    // 2. 진행중인 공고 목록 수집
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

async function loginToJobKorea(page) {
  await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List');
  await page.waitForSelector(SELECTORS.COMPANY_TAB);
  await page.click(SELECTORS.COMPANY_TAB);
  await page.fill(SELECTORS.ID_INPUT, process.env.JOBKOREA_ID);
  await page.fill(SELECTORS.PASSWORD_INPUT, process.env.JOBKOREA_PW);
  await page.click(SELECTORS.LOGIN_BUTTON);
  await page.waitForURL('**/Corp/GIMng/**', { timeout: 15000 });
}

// 진행중인 공고 목록 수집
async function collectJobPostings(page) {
  await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List?PubType=1&SrchStat=1');
  await page.waitForSelector('.rowWrap', { timeout: 10000 });
  
  const jobItems = await page.locator('.giListItem').all();
  const jobPostings = [];
  
  for (const item of jobItems) {
    const title = await item.locator('.jobTitWrap a.tit').innerText().catch(() => '');
    const jobId = await item.locator(".date:has-text('공고번호') > span")
      .innerText()
      .catch(() => 
        item.locator("button[data-gno]").first.getAttribute('data-gno').catch(() => '')
      );
    
    if (title && jobId) {
      jobPostings.push({ title: title.trim(), id: jobId.trim() });
    }
  }
  
  return jobPostings;
}

// 각 공고별 접수된 이력서 수집 (중복 제외)
async function collectResumesFromJobPosting(page, jobPosting) {
  // 이미 수집된 이력서 목록 조회 (중복 체크용)
  const existingResumes = await getExistingResumes(jobPosting.id);
  const existingKeys = new Set(
    existingResumes.map(r => `${r.applicant_name}_${r.job_posting_id}`)
  );
  
  // 이력서 목록 페이지로 이동
  await page.goto(`https://www.jobkorea.co.kr/Corp/Applicant/list?GI_No=${jobPosting.id}&PageCode=YN`);
  
  // 이력서 수집 로직 (기존 로직 활용)
  // 중복 체크: applicant_name + job_posting_id 조합으로 확인
  // ...
}
```

### 5.2. PDF 및 Markdown 변환

```javascript
import { markdown } from 'markitdown';

async function extractResumeData(page, jobPosting) {
  // PDF 생성
  const pdfFilename = `resume_${Date.now()}.pdf`;
  const pdfPath = path.join(__dirname, '../../pdfs', pdfFilename);
  await page.pdf({ path: pdfPath, format: 'A4' });
  
  // PDF를 Markdown으로 변환
  const mdFilename = `resume_${Date.now()}.md`;
  const mdPath = path.join(__dirname, '../../markdowns', mdFilename);
  const mdContent = await markdown(pdfPath);
  await fs.writeFile(mdPath, mdContent, 'utf-8');
  
  return {
    pdf_url: `/api/resumes/pdf/${pdfFilename}`,
    md_url: `/api/resumes/markdown/${mdFilename}`,
    // ... 기타 데이터
  };
}
```

---

## 6. Supabase 연동

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ydaqccbvionvjbvefuln.supabase.co';
const supabaseKey = 'sbp_0f69d6e679dc70239d931c4f4ac3bfd38e24a6a5';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 데이터베이스 테이블

**resumes**
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| applicant_name | TEXT | 지원자 이름 |
| applicant_email | TEXT | 이메일 |
| applicant_phone | TEXT | 연락처 |
| job_posting_title | TEXT | 공고명 |
| job_posting_id | TEXT | 공고번호 (중복 체크용) |
| career | JSONB | 경력 |
| education | JSONB | 학력 |
| cover_letter | TEXT | 자기소개서 |
| pdf_url | TEXT | PDF 저장 경로 |
| md_url | TEXT | Markdown 저장 경로 |
| status | ENUM | 접수, 면접, 불합격, 합격 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**job_postings** (신규)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| job_posting_id | TEXT | 공고번호 (UNIQUE) |
| job_posting_title | TEXT | 공고명 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

---

## 7. API 엔드포인트

```javascript
// resumeRoutes.js

// 이력서 목록 조회 (필터링: 상태, 공고명, 공고번호)
router.get('/', async (req, res) => {
  const { status, job_posting_title, job_posting_id } = req.query;
  const resumes = await getResumes({ status, job_posting_title, job_posting_id });
  res.json({ success: true, data: resumes });
});

// 이력서 수집 실행
router.post('/collect', async (req, res) => {
  const result = await collectResumes();
  res.json(result);
});

// 이력서 상태 업데이트 (접수/면접/불합격/합격)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // '접수', '면접', '불합격', '합격'
  const updated = await updateResumeStatus(id, status);
  res.json({ success: true, data: updated });
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

// Markdown 열람 (텍스트로 반환)
router.get('/markdown/:filename/view', async (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../../markdowns', filename);
  const content = await fs.readFile(filepath, 'utf-8');
  res.json({ success: true, content });
});
```

---

## 8. 프론트엔드 구조

- **React + Vite + TailwindCSS**
- 주요 페이지:
  - `/dashboard` : 이력서 목록 조회, 필터링
  - `/settings` : 계정 및 환경 설정
  - `/logs` : 수집 로그 확인

### 주요 기능

```typescript
// apiClient.ts

// 이력서 목록 조회 (필터링)
export const getResumes = async (filters?: {
  status?: string;
  job_posting_title?: string;
  job_posting_id?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.job_posting_title) params.append('job_posting_title', filters.job_posting_title);
  if (filters?.job_posting_id) params.append('job_posting_id', filters.job_posting_id);
  
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

// Markdown 열람
export const getMarkdownContent = async (filename: string) => {
  return fetch(`/api/resumes/markdown/${filename}/view`).then(res => res.json());
};
```

### 상태 드롭다운
- 접수 (기본값)
- 면접
- 불합격
- 합격

---

## 9. 현재 구성

| 항목 | 설명 |
|------|------|
| 백엔드 | Node.js + Express (Port 4001) |
| 프론트엔드 | React + Vite + Tailwind CSS (Port 5173) |
| DB | Supabase PostgreSQL (더미 데이터 모드) |
| 자동화 | Playwright (Chromium) |
| 상태 | ✅ 실행 중 |

### 실행 명령어
```bash
# 백엔드
cd backend-new && npm run dev

# 프론트엔드  
cd frontend && npm run dev
```

---

## 10. 보안 및 법적 고려사항

| 구분 | 내용 |
|------|------|
| 인증정보 | Secrets Manager 또는 환경변수 관리 |
| 데이터 보호 | HTTPS 통신, RLS 적용 |
| 개인정보 처리 | PIPA 준수, 최소 수집 |
| 크롤링 범위 | 기업회원 내부 기능에 한정 사용 |

---

## 11. 테스트 및 품질 관리

| 테스트 항목 | 기준 |
|--------------|------|
| 로그인 성공 | 세션 유지 및 진행중인 공고 접근 가능 |
| 공고 수집 | 공고명 및 공고번호 정확히 추출 |
| 중복 체크 | 이미 수집된 이력서는 제외 |
| 데이터 저장 | Supabase DB 삽입 확인 |
| PDF 변환 | 98% 이상 성공률 |
| Markdown 변환 | PDF → Markdown 변환 성공률 95% 이상 |
| Rate Limit | 2초 Delay 정책 정상 작동 |
| 오류 처리 | Exception → Logger 기록 |
| UI 렌더링 | 대시보드 1초 이내 응답 |
| 상태 변경 | 드롭다운으로 상태 변경 정상 작동 |

---

---
