# 🧩 TRD: 잡코리아 이력서 관리 시스템 (JobKorea Resume Manager)

## 1. 시스템 개요

### 목적
잡코리아 기업 계정을 이용해 **미열람 이력서를 자동 수집, 정리, PDF 변환 및 보관**하고,  
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
├── .env                        # 환경변수
└── package.json
```

---

## 5. Playwright 자동화 구성

```javascript
// playwrightService.js
export async function collectUnreadResumes() {
  const browser = await chromium.launch({ 
    headless: process.env.PLAYWRIGHT_HEADLESS === 'true' 
  });
  
  try {
    const page = await browser.newPage();
    
    // 1. 로그인
    await loginToJobKorea(page);
    
    // 2. 미열람 이력서 수집
    const resumes = await scrapeUnreadResumes(page);
    
    return {
      success: true,
      count: resumes.length,
      resumes
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
  await page.goto(SELECTORS.LOGIN_URL);
  await page.fill(SELECTORS.ID_INPUT, 'markany');
  await page.fill(SELECTORS.PASSWORD_INPUT, 'markany2018!');
  await page.click(SELECTORS.LOGIN_BUTTON);
  await page.waitForLoadState('networkidle');
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
| job_posting_title | TEXT | 공고명 |
| career | JSONB | 경력 |
| education | JSONB | 학력 |
| pdf_url | TEXT | PDF 링크 |
| status | ENUM | unread, reviewing, accepted, rejected |

---

## 7. API 엔드포인트

```javascript
// resumeRoutes.js
router.get('/', async (req, res) => {
  const { status } = req.query;
  const resumes = await getResumes({ status });
  res.json({ success: true, data: resumes });
});

router.post('/collect', async (req, res) => {
  const result = await collectUnreadResumes();
  res.json(result);
});

router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await updateResumeStatus(id, status);
  res.json({ success: true, data: updated });
});
```

---

## 8. 프론트엔드 구조

- **React + Vite + TailwindCSS**
- 주요 페이지:
  - `/dashboard` : 이력서 목록 조회, 필터링
  - `/settings` : 계정 및 환경 설정
  - `/logs` : 수집 로그 확인

```typescript
// apiClient.ts
export const getResumes = async (status?: string) => {
  const query = status ? `?status=${status}` : '';
  return fetch(`/api/resumes${query}`).then(res => res.json());
};
```

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
| 로그인 성공 | 세션 유지 및 미열람 접근 가능 |
| 데이터 저장 | Supabase DB 삽입 확인 |
| PDF 변환 | 98% 이상 성공률 |
| Rate Limit | 2초 Delay 정책 정상 작동 |
| 오류 처리 | Exception → Logger 기록 |
| UI 렌더링 | 대시보드 1초 이내 응답 |

---

---
