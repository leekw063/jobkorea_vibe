# 잡코리아 이력서 관리 시스템

잡코리아 기업회원 계정을 이용해 미열람 이력서를 자동 수집, 정리, PDF 변환 및 보관하는 시스템입니다.

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
# JobKorea Credentials
JOBKOREA_ID=your_company_id
JOBKOREA_PW=your_password

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# App Configuration
NODE_ENV=development
PORT=4001
```

**참고**: 환경 변수는 다음 순서로 읽습니다:
- `SUPABASE_ANON_KEY` (우선)
- `SUPABASE_KEY`
- `VITE_SUPABASE_ANON_KEY`

### 3. 실행

#### 방법 1: 배치 파일 사용 (Windows 권장)

```bash
# 모든 서버 시작
start_all.bat

# 모든 서버 종료
stop_all.bat
```

#### 방법 2: 수동 실행

```bash
# 백엔드 실행 (터미널 1)
cd backend-new && npm run dev  # http://localhost:4001

# 프론트엔드 실행 (터미널 2)
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
- ✅ 상세한 로깅 시스템 (타임스탬프, 이모지, 단계별 로그)
- ✅ 네트워크 연결 테스트 및 오류 진단
- ✅ Windows 배치 파일로 서버 관리

## 🛠 기술 스택

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Automation**: Playwright
- **PDF**: Playwright PDF API

## 📁 프로젝트 구조

```
jobkorea/
├── frontend/              # React 웹앱
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   └── services/      # API 클라이언트
│   └── package.json
├── backend-new/           # Express API 서버
│   ├── src/
│   │   ├── routes/        # API 라우트
│   │   ├── services/      # 비즈니스 로직
│   │   │   ├── playwrightService.js  # 크롤링 서비스
│   │   │   └── supabaseService.js    # DB 서비스
│   │   └── utils/         # 셀렉터 정의
│   ├── pdfs/              # PDF 저장 폴더
│   ├── .env               # 환경 변수 (gitignore)
│   └── package.json
├── .cursor/               # Cursor IDE 설정
│   └── mcp.json           # MCP 서버 설정 (v0)
├── start_all.bat          # 서버 시작 스크립트 (Windows)
├── stop_all.bat           # 서버 종료 스크립트 (Windows)
└── supabase-schema.sql    # DB 스키마
```

## 🔄 이력서 수집 프로세스

1. `https://www.jobkorea.co.kr/Corp/GIMng/List` 접속
2. 기업회원 로그인
3. 채용공고 목록에서 최대 10개 공고 ID 추출
4. 각 공고의 미열람 이력서 페이지 접속
5. 이력서 2~11번째 항목 순회 (최대 10개)
6. 각 이력서 상세 정보 추출 및 PDF 생성
7. Supabase에 저장

## 🔧 API 엔드포인트

- `GET /api/resumes` - 이력서 목록 조회
- `GET /api/resumes?status=unread` - 상태별 필터링
- `POST /api/resumes/collect` - 이력서 수집 실행
- `PATCH /api/resumes/:id/status` - 상태 업데이트
- `GET /api/resumes/pdf/:filename` - PDF 다운로드
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

### Supabase 연결 오류

`fetch failed` 오류가 발생하는 경우:

1. **네트워크 연결 확인**
   ```bash
   # 브라우저에서 Supabase URL 접근 테스트
   https://your-project.supabase.co
   ```

2. **환경 변수 확인**
   - `backend-new/.env` 파일이 올바른 위치에 있는지 확인
   - `SUPABASE_URL`과 `SUPABASE_ANON_KEY`가 올바른지 확인

3. **방화벽/프록시 설정**
   - 회사/학교 네트워크의 경우 프록시 설정 확인
   - Windows 방화벽에서 Node.js 허용 확인

4. **Supabase 프로젝트 상태**
   - Supabase 대시보드에서 프로젝트가 활성 상태인지 확인
   - 프로젝트가 일시 중지되었는지 확인

5. **로그 확인**
   - 서버 로그에서 상세한 오류 정보 확인
   - 네트워크 연결 테스트 결과 확인

### 서버 시작 오류

- **포트 충돌**: 다른 애플리케이션이 4001 또는 5173 포트를 사용 중인지 확인
- **의존성 오류**: `npm install`을 다시 실행
- **Node.js 버전**: Node.js 18 이상 권장

## 🛠 개발 도구

### v0 MCP 서버 설정

프로젝트에는 v0 MCP 서버 설정이 포함되어 있습니다 (`.cursor/mcp.json`).
Cursor IDE에서 v0의 AI 기능을 활용할 수 있습니다.

### 배치 파일

- **start_all.bat**: 백엔드와 프론트엔드를 별도 창에서 동시에 시작
- **stop_all.bat**: 실행 중인 모든 서버를 종료

## ⚠️ 주의사항

1. **법적 준수**: 잡코리아 이용약관 및 개인정보보호법 준수
2. **Selector 업데이트**: 웹사이트 변경 시 `backend-new/src/utils/selectors.js` 수정 필요
3. **보안**: 환경변수 파일(.env)은 절대 공개하지 말 것
4. **Rate Limiting**: 크롤링 시 적절한 딜레이를 두어 서버 부하 방지
5. **데이터 보호**: 수집된 개인정보는 안전하게 관리하고 법적 보관 기간 준수