# 잡코리아 이력서 관리 시스템

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
# 백엔드 설치
cd backend-new && npm install

# 프론트엔드 설치
cd ../frontend && npm install

# Playwright 브라우저 설치
cd backend-new && npx playwright install chromium
```

### 2. 환경 설정

#### Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 가입 및 새 프로젝트 생성
2. SQL Editor에서 `supabase-schema.sql` 실행

#### 환경변수 설정
`backend-new/.env` 파일 생성:
```bash
JOBKOREA_ID=your_company_id
JOBKOREA_PW=your_password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
PORT=4001
```

### 3. 실행

```bash
# 백엔드 실행
cd backend-new && npm run dev  # http://localhost:4001

# 프론트엔드 실행 (별도 터미널)
cd frontend && npm run dev     # http://localhost:5173
```

## 📋 주요 기능

- ✅ 잡코리아 기업회원 자동 로그인
- ✅ 채용공고별 미열람 이력서 자동 수집 (최대 10개 공고)
- ✅ 이력서 상세 정보 추출 (이름, 연락처, 이메일, 학력, 경력)
- ✅ 이력서 PDF 자동 생성 및 저장
- ✅ Supabase 데이터베이스 저장
- ✅ 웹 대시보드 (필터링, 상태 관리)
- ✅ PDF 다운로드

## 🛠 기술 스택

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Automation**: Playwright
- **PDF**: Playwright PDF API

## 📁 프로젝트 구조

```
jobkorea/
├── frontend/          # React 웹앱
├── backend-new/       # Express API 서버
│   ├── src/
│   │   ├── routes/    # API 라우트
│   │   ├── services/  # 비즈니스 로직
│   │   └── utils/     # 셀렉터 정의
│   └── pdfs/          # PDF 저장 폴더
└── supabase-schema.sql # DB 스키마
```

## 🔄 이력서 수집 프로세스

1. `https://www.jobkorea.co.kr/Corp/GIMng/List` 접속
2. 기업회원 로그인
3. 채용공고 목록에서 최대 10개 공고 ID 추출
4. 각 공고의 미열람 이력서 페이지 접속
5. 이력서 2~11번째 항목 순회 (최대 10개)
6. 각 이력서 상세 정보 추출 및 PDF 생성
7. Supabase에 저장

## ⚠️ 주의사항

1. **법적 준수**: 잡코리아 이용약관 및 개인정보보호법 준수
2. **Selector 업데이트**: 웹사이트 변경 시 `backend-new/src/utils/selectors.js` 수정 필요
3. **보안**: 환경변수 파일(.env)은 절대 공개하지 말 것

## 🔧 API 엔드포인트

- `GET /api/resumes` - 이력서 목록 조회
- `GET /api/resumes?status=unread` - 상태별 필터링
- `POST /api/resumes/collect` - 이력서 수집 실행
- `PATCH /api/resumes/:id/status` - 상태 업데이트
- `GET /api/resumes/pdf/:filename` - PDF 다운로드