# 잡코리아 이력서 관리 시스템

잡코리아 기업회원 계정을 이용해 **진행중인 공고의 접수된 이력서를 자동 수집, AI 검토, PDF/Markdown 변환 및 보관**하는 시스템입니다.

## ✨ 주요 기능

- ✅ 진행중인 공고 자동 수집 (중복 방지)
- ✅ 공고별 접수된 이력서 자동 수집 (Pass_R_No 기반 중복 체크)
- ✅ 이력서 순차 처리 (안정성 향상)
- ✅ 이력서 PDF 및 Markdown 자동 생성
- ✅ 공고 상세 정보 Markdown 저장
- ✅ Gemini 2.0 Flash를 이용한 AI 이력서 검토 (점수 + 상세 평가)
- ✅ `md_url`에 저장된 이력서 Markdown과 공고 Markdown을 비교하는 정밀 매칭
- ✅ 웹 대시보드 (공고 목록, 이력서 목록, 필터링, 상태 관리, 검토 결과 표시)
- ✅ 공고 목록 탭 및 Markdown 상세보기 모달
- ✅ Supabase 데이터베이스 저장
- ✅ React Portal 기반 모달 UI
- ✅ 다크 모드 지원

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
# 루트에서 concurrently 설치
npm install

# 백엔드 설치
cd backend-new && npm install

# 프론트엔드 설치
cd ../frontend && npm install

# Playwright 브라우저 설치
npx playwright install chromium
```

### 2. 환경 설정

#### Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 가입 및 새 프로젝트 생성
2. SQL Editor에서 `supabase-schema.sql` 실행

#### 환경변수 설정
`backend-new/.env` 파일 생성:
```bash
# JobKorea Credentials
JOBKOREA_ID=your_company_id
JOBKOREA_PW=your_password

# Supabase Configuration
SUPABASE_URL=https://ydaqccbvionvjbvefuln.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Gemini API (AI 이력서 검토)
GEMINI_API_KEY=your_gemini_api_key

# App Configuration
NODE_ENV=development
PORT=4001
```

**Gemini API 키 발급**:
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. API 키 생성
3. `.env` 파일에 추가

**참고**: 환경 변수는 다음 순서로 읽습니다:
- `SUPABASE_ANON_KEY` (우선)
- `SUPABASE_KEY`
- `VITE_SUPABASE_ANON_KEY`

### 3. 실행

#### 방법 1: 배치 파일 사용 (Windows 권장)

```bash
# 모든 서버 시작
start_all.bat

# 모든 서버 정상 종료
stop_all.bat

# 긴급 상황: 모든 Node.js 프로세스 강제 종료
kill-all-node.bat
```

**배치 파일 설명**:
- `start_all.bat`: 백엔드(4001)와 프론트엔드(5173) 서버를 각각 별도 창에서 시작
- `stop_all.bat`: 포트 4001, 5173을 사용하는 프로세스만 안전하게 종료 (3단계 확인 포함)
- `kill-all-node.bat`: 모든 Node.js 프로세스를 강제 종료 (다른 Node 앱도 영향받음 주의)

#### 방법 2: 수동 실행

```bash
# 백엔드 실행 (터미널 1)
cd backend-new && npm run dev  # http://localhost:4001

# 프론트엔드 실행 (터미널 2)
cd frontend && npm run dev     # http://localhost:5173
```

## 🎯 핵심 기능 상세

### 1. 스마트 공고 수집
- 진행중인 공고 자동 감지 및 수집
- **중복 방지**: 이미 수집된 공고는 건너뛰기
- 공고 상세 정보를 Markdown으로 저장 (모집요강, 주요업무, 자격요건 등)

### 2. 이력서 자동 수집
- **Pass_R_No 기반 중복 체크**: Jobkorea 고유 이력서 ID로 정확한 중복 방지
- **순차 처리**: 안정적인 이력서 수집 (500ms 딜레이)
- 공고별 접수된 모든 이력서 수집
- PDF 및 Markdown 형식으로 자동 저장
- 010 시작 휴대폰 번호 자동 추출
- mailto 링크 기반 이메일 추출

### 3. AI 이력서 검토 (Gemini 2.0 Flash)
- 공고 요구사항과 이력서 매칭 분석 (공고 Markdown + 이력서 Markdown 전문 비교)
- **점수 (0-100점)** + **상세 평가 텍스트 (약 1000자)**
- 평가 기준: 기술스택 적합도, 경력 수준, 학력, 프로젝트 경험, 커뮤니케이션 능력
- 검토 결과를 DB에 저장하여 재사용
- Markdown 원문이 없을 경우에도 기본 요약 정보를 이용해 최소 평가 진행

#### Markdown 기반 비교 파이프라인
1. `resumes.md_url`에 저장된 Markdown 파일을 안전하게 로드
2. `job_postings.job_detail_md`와 함께 Gemini 2.0 Flash에 전달
3. 공고/이력서의 특정 구절을 인용하며 일치·불일치 여부를 보고
4. 점수, 상세 평가, 추천 여부를 Markdown 형식 그대로 반환
5. 결과는 Supabase에 저장되어 대시보드에서 즉시 확인 가능

### 4. 웹 대시보드
- **공고 목록 탭**: 수집된 공고 목록 조회 및 Markdown 상세보기
- **이력서 목록 탭**: 카드형/테이블형 뷰 전환
- 상태별 필터링 (접수/면접/불합격/합격)
- 휴지통 기능 (Soft Delete)
- PDF 다운로드 및 이력서 미리보기
- **평가 점수 클릭 시 상세 평가 모달 표시**
- React Portal 기반 모달 (스크롤 가능)
- 다크 모드 지원
- 일괄 작업 (선택된 이력서 일괄 상태 변경/삭제)

## 🛠 기술 스택

- **Frontend**: React 18, Tailwind CSS, Vite, Lucide Icons
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Automation**: Playwright (Chromium)
- **HTML Parsing**: Cheerio (BeautifulSoup 스타일)
- **AI**: Google Gemini 2.0 Flash
- **PDF**: Playwright PDF API
- **Markdown**: pdf-parse

## 📁 프로젝트 구조

```
jobkorea/
├── frontend/              # React 웹앱
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   │   ├── ResumeCard.jsx       # 이력서 카드/테이블
│   │   │   └── ErrorBoundary.jsx    # 에러 처리
│   │   ├── pages/
│   │   │   └── Dashboard.jsx        # 대시보드 페이지
│   │   └── services/
│   │       └── api.js               # API 클라이언트
│   └── package.json
├── backend-new/           # Express API 서버
│   ├── src/
│   │   ├── index.js       # 서버 엔트리포인트
│   │   ├── routes/
│   │   │   └── resumeRoutes.js      # 이력서 API
│   │   ├── services/
│   │   │   ├── playwrightService.js # 크롤링 + 공고 추출
│   │   │   ├── supabaseService.js   # DB CRUD
│   │   │   └── geminiService.js     # AI 검토
│   │   └── utils/
│   │       └── selectors.js         # Playwright 셀렉터
│   ├── pdfs/              # PDF 저장 폴더
│   ├── markdowns/         # Markdown 저장 폴더
│   ├── .env               # 환경 변수 (gitignore)
│   └── package.json
├── backup/                # 백업 및 문서 보관
│   ├── md/                # 문서 백업
│   ├── supabase/          # SQL 스크립트
│   └── backend/           # 구버전 백엔드
├── start_all.bat          # 서버 시작 (Windows)
├── stop_all.bat           # 서버 종료 (Windows)
├── package.json           # 루트 패키지 (concurrently)
└── README.md              # 이 파일
```

## 🔄 이력서 수집 프로세스

### 1단계: 공고 수집
1. 잡코리아 기업회원 로그인
2. 진행중인 공고 목록 페이지 접속
3. 각 공고의 제목과 ID 추출
4. **중복 체크**: 이미 DB에 있는 공고는 건너뛰기
5. 공고 상세 페이지에서 모집요강, 주요업무 등 추출
6. Markdown 형식으로 변환하여 DB 저장

### 2단계: 이력서 수집
1. 각 공고의 이력서 목록 페이지 접속 (100개씩 보기)
2. **Pass_R_No 기반 중복 체크**: Jobkorea 고유 ID로 정확한 중복 방지
3. 순차 처리로 안정적인 수집 (500ms 딜레이)
4. 이력서 링크 클릭하여 상세 페이지 접근
5. 각 이력서 상세 정보 추출:
   - 이름 (.item.name 셀렉터)
   - 010 시작 휴대폰 번호
   - mailto 링크 기반 이메일
   - 학력, 경력, 자기소개서
6. PDF 및 Markdown 자동 생성
7. Supabase DB에 저장 (jobkorea_resume_id = Pass_R_No)

### 3단계: AI 검토 (선택)
1. 대시보드에서 "검토" 버튼 클릭
2. DB에 저장된 공고 Markdown 불러오기
3. Gemini 2.0 Flash에 공고 Markdown + 이력서 Markdown 전문 전달 (md_url 기준)
4. 점수(0-100) + 상세 평가(1000자) 받기
5. DB에 저장 후 모달로 표시

## 🔧 API 엔드포인트

### 이력서 관리
- `GET /api/resumes` - 이력서 목록 조회
- `GET /api/resumes?status=접수&showDeleted=false` - 필터링
- `POST /api/resumes/collect` - 이력서 수집 실행
- `PATCH /api/resumes/:id/status` - 상태 업데이트 (접수/면접/불합격/합격)
- `DELETE /api/resumes/:id` - 휴지통 이동 (Soft Delete)
- `POST /api/resumes/:id/restore` - 휴지통에서 복원
- `DELETE /api/resumes/:id/permanent` - 영구 삭제
- `GET /api/resumes/pdf/:filename` - PDF 다운로드

### AI 검토
- `POST /api/resumes/:id/review` - AI 이력서 검토 (Gemini 2.0 Flash, 공고 Markdown + `md_url`의 이력서 Markdown 비교)

### 공고 정보
- `GET /api/resumes/job-postings` - 공고 목록 조회
- `GET /api/resumes/job-postings/:jobPostingId/markdown` - 공고 상세 정보 Markdown

### 시스템
- `GET /health` - 서버 상태 확인

## 📊 로깅 시스템

백엔드는 상세한 로깅 시스템을 제공합니다:

- **타임스탬프**: 모든 로그에 ISO 8601 형식의 타임스탬프 포함
- **이모지 표시**: 로그 유형별 이모지로 가독성 향상
  - 📥 요청 수신
  - 📤 응답 전송
  - ✅ 성공
  - ❌ 오류
  - 🔄 진행 중
  - 🔍 조회/검색
  - 💾 저장
  - 🌐 네트워크 작업
- **단계별 로그**: 크롤링 프로세스의 각 단계별 상세 로그
- **오류 진단**: 네트워크 오류 시 상세한 진단 정보 제공

### 로그 예시

```
[2025-11-16T23:45:30.854Z] 🚀 서버 시작됨
[2025-11-16T23:45:30.854Z]    포트: 4001
[2025-11-16T23:45:35.872Z] 📥 GET /api/resumes
[2025-11-16T23:45:35.873Z] 📋 이력서 목록 조회 요청 - status: all
[2025-11-16T23:45:35.873Z] 🔍 이력서 조회 시작 - 필터: { status: undefined }
[2025-11-16T23:45:35.938Z] ✅ 이력서 조회 완료 - 5개
```

## 🔍 문제 해결

### 1. 데이터베이스 스키마 설정

**처음 설정하는 경우**:
```bash
# Supabase SQL Editor에서 실행
backup/supabase/supabase-schema-v2.sql
```

**스키마 업데이트가 필요한 경우**:
```bash
# 순서대로 실행
backup/supabase/supabase-add-review-columns.sql  # AI 검토 기능
```

### 2. Supabase 연결 오류

`fetch failed` 오류가 발생하는 경우:

1. **환경 변수 확인**
   - `backend-new/.env` 파일이 있는지 확인
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` 확인

2. **네트워크 연결**
   ```bash
   # 브라우저에서 테스트
   https://ydaqccbvionvjbvefuln.supabase.co
   ```

3. **Supabase 프로젝트 상태**
   - 대시보드에서 프로젝트가 활성 상태인지 확인
   - 일시 중지되었다면 재개

### 3. 포트 충돌 (EADDRINUSE)

**증상**: `Error: listen EADDRINUSE: address already in use :::4001`

**원인**: 이전 서버 프로세스가 완전히 종료되지 않아 포트가 여전히 사용 중

**해결 방법** (권장 순서):

1. **안전한 종료** (권장)
```bash
stop_all.bat
```

2. **수동 확인 및 종료**
```bash
# 포트 사용 프로세스 확인
netstat -ano | findstr :4001
netstat -ano | findstr :5173

# 특정 PID 종료
taskkill /F /PID [프로세스ID]
```

3. **긴급 상황: 모든 Node.js 강제 종료**
```bash
kill-all-node.bat
# 또는
taskkill /F /IM node.exe
```

**예방 팁**:
- 서버 종료 시 항상 `stop_all.bat` 사용
- Ctrl+C로 종료 시 프로세스가 완전히 종료되지 않을 수 있음

### 4. 공고 정보가 추출되지 않는 경우

잡코리아 페이지 구조가 변경되었을 수 있습니다:
- `backend-new/src/services/playwrightService.js` 확인
- HTML 구조를 확인하여 셀렉터 수정

**공고번호와 이력서 접수 번호가 다른 경우**:
- 잡코리아는 공고 상세 페이지의 `Gno`와 이력서 목록의 `GI_No`가 다를 수 있습니다
- 시스템은 자동으로 공고 상세 페이지에서 실제 이력서 접수 번호를 추출하여 사용합니다
- 로그에서 `🔍 이력서 접수 번호 발견` 메시지를 확인하세요

### 5. AI 검토 오류

- Gemini API 키가 유효한지 확인
- [Google AI Studio](https://aistudio.google.com/app/apikey)에서 키 상태 확인
- 모델명이 `gemini-2.0-flash-exp`인지 확인

## 🛠 개발 도구

### v0 MCP 서버 설정

프로젝트에는 v0 MCP 서버 설정이 포함되어 있습니다 (`.cursor/mcp.json`).
Cursor IDE에서 v0의 AI 기능을 활용할 수 있습니다.

### 배치 파일

- **start_all.bat**: 백엔드(4001)와 프론트엔드(5173)를 별도 창에서 동시에 시작
- **stop_all.bat**: 포트 4001, 5173을 사용하는 프로세스만 안전하게 종료 (3단계 확인)
  - 1단계: 해당 포트를 사용하는 프로세스 종료
  - 2단계: 2초 대기 후 추가 프로세스 확인 및 정리
  - 3단계: 포트 상태 최종 확인 및 결과 출력
- **kill-all-node.bat**: 모든 Node.js 프로세스 강제 종료 (긴급 상황용)

## 📊 데이터베이스 스키마

### resumes 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| applicant_name | TEXT | 지원자 이름 |
| applicant_email | TEXT | 이메일 |
| applicant_phone | TEXT | 연락처 (010 시작) |
| job_posting_title | TEXT | 공고명 |
| job_posting_id | TEXT | 공고번호 |
| jobkorea_resume_id | TEXT | Pass_R_No (중복 체크용) |
| education / career | JSONB | 학력/경력 |
| cover_letter | TEXT | 자기소개서 |
| pdf_url / md_url | TEXT | PDF/MD 경로 |
| status | ENUM | 접수/면접/불합격/합격 |
| review_score | INTEGER | AI 검토 점수 (0-100) |
| review_text | TEXT | AI 상세 평가 |
| reviewed_at | TIMESTAMP | 검토 일시 |
| deleted_at | TIMESTAMP | 삭제 일시 (Soft Delete) |

### job_postings 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| job_posting_id | TEXT | 공고번호 (UNIQUE) |
| job_posting_title | TEXT | 공고명 |
| job_detail | JSONB | 공고 상세 (JSON) |
| job_detail_md | TEXT | 공고 상세 (Markdown) |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

## ⚠️ 주의사항

1. **법적 준수**: 잡코리아 이용약관 및 개인정보보호법 준수
2. **중복 수집 방지**: Pass_R_No 기반 자동 중복 체크
3. **보안**: `.env` 파일은 절대 공개하지 말 것
4. **Rate Limiting**: 크롤링 시 자동 딜레이 적용 (500ms)
5. **데이터 보호**: 수집된 개인정보는 안전하게 관리
6. **AI 비용**: Gemini API 사용량에 따라 과금될 수 있음
7. **순차 처리**: 안정성을 위해 이력서는 순차적으로 수집됩니다

## 🤝 기여

이슈나 개선 사항이 있다면 GitHub Issues를 통해 제보해주세요.

## 📄 라이선스

MIT License