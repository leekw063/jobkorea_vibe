# 잡코리아 이력서 관리 시스템

## 프로젝트 개요

잡코리아 기업 회원의 미열람 이력서를 자동으로 수집하고, 체계적으로 관리하며, PDF로 저장할 수 있는 웹 애플리케이션입니다.

## 목적

- 채용 담당자의 이력서 검토 프로세스 자동화
- 미열람 이력서의 체계적인 정리 및 관리
- 이력서 데이터의 영구 보관 및 검색 기능 제공
- 채용 업무 효율성 향상

## 주요 기능

### 1. 잡코리아 자동 로그인
- Playwright를 활용한 기업 회원 자동 로그인
- 세션 관리 및 재인증 처리

### 2. 미열람 이력서 수집
- 미열람 이력서 목록 자동 크롤링
- 이력서 상세 정보 추출
  - 지원자 기본 정보 (이름, 연락처, 이메일)
  - 학력 사항
  - 경력 사항
  - 자기소개서
  - 포트폴리오 링크
  - 지원 공고 정보

### 3. 데이터 정리 및 저장
- 수집된 이력서 정보의 구조화
- Supabase 데이터베이스 저장
- 이력서 메타데이터 관리

### 4. PDF 생성 및 보관
- 이력서 HTML을 PDF로 변환
- Supabase Storage에 PDF 파일 업로드
- 파일명 규칙: `{날짜}_{지원자명}_{공고명}.pdf`

### 5. 웹 대시보드
- 수집된 이력서 목록 조회
- 필터링 및 검색 기능
- PDF 다운로드
- 이력서 상태 관리 (미열람/검토중/합격/불합격)

## 기술 스택

### Frontend
- **React**: 사용자 인터페이스 구축
- **React Router**: 페이지 라우팅
- **Tailwind CSS**: 스타일링
- **Lucide React**: 아이콘

### Backend & Automation
- **Playwright**: 웹 자동화 및 크롤링
- **Node.js**: 백엔드 서버
- **Express**: API 서버

### Database & Storage
- **Supabase**: 
  - PostgreSQL 데이터베이스
  - Storage (PDF 파일 저장)
  - Authentication (관리자 인증)

### Additional Libraries
- **pdf-lib** 또는 **puppeteer**: PDF 생성
- **date-fns**: 날짜 처리

## 시스템 아키텍처

```
┌─────────────────┐
│   React Web     │ ← 사용자 인터페이스
│   Application   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Express API   │ ← REST API 서버
│     Server      │
└────────┬────────┘
         │
         ├─────────────────┐
         ↓                 ↓
┌─────────────────┐  ┌──────────────┐
│   Playwright    │  │   Supabase   │
│   Automation    │  │   - Database │
│   - 로그인       │  │   - Storage  │
│   - 크롤링       │  │   - Auth     │
└─────────────────┘  └──────────────┘
```

## 데이터 모델 (예상)

### resumes 테이블
- id (UUID)
- applicant_name (TEXT)
- applicant_email (TEXT)
- applicant_phone (TEXT)
- job_posting_title (TEXT)
- application_date (TIMESTAMP)
- education (JSONB)
- career (JSONB)
- cover_letter (TEXT)
- portfolio_url (TEXT)
- pdf_url (TEXT)
- status (ENUM: unread, reviewing, accepted, rejected)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### crawl_logs 테이블
- id (UUID)
- crawl_date (TIMESTAMP)
- total_resumes (INTEGER)
- successful_count (INTEGER)
- failed_count (INTEGER)
- error_messages (JSONB)

## 주요 워크플로우

### 1. 이력서 수집 프로세스
```
1. 관리자가 수집 버튼 클릭
2. Playwright가 잡코리아 로그인
3. 미열람 이력서 페이지 접근
4. 각 이력서 상세 페이지 크롤링
5. 데이터 파싱 및 구조화
6. Supabase 데이터베이스에 저장
7. PDF 생성 및 Storage 업로드
8. 수집 결과 리포트 생성
```

### 2. 대시보드 조회 프로세스
```
1. 사용자가 대시보드 접근
2. Supabase에서 이력서 목록 조회
3. 필터/검색 조건 적용
4. 이력서 카드 형태로 표시
5. PDF 다운로드 또는 상세보기
```

## 보안 고려사항

- 잡코리아 로그인 정보 암호화 저장
- Supabase RLS(Row Level Security) 정책 적용
- API 엔드포인트 인증/인가 구현
- 개인정보 처리방침 준수 (PIPA)
- 수집된 개인정보의 안전한 관리

## 개발 단계

### Phase 1: 기본 인프라 구축
- React 프로젝트 초기 설정
- Supabase 프로젝트 생성 및 스키마 설계
- Express API 서버 구축
- 기본 UI 레이아웃 구성

### Phase 2: 크롤링 엔진 개발
- Playwright 로그인 자동화
- 미열람 이력서 목록 크롤링
- 이력서 상세 정보 추출 로직 구현
- PDF 변환 기능 구현

### Phase 3: 데이터 관리 기능
- 이력서 목록 조회 API
- 필터링 및 검색 기능
- 이력서 상태 업데이트 기능
- PDF 다운로드 기능

### Phase 4: 고도화
- 자동 수집 스케줄러
- 대량 다운로드 기능
- 통계 및 분석 대시보드
- 알림 기능 (신규 이력서 알림)

## 크롤링 프로세스 플로우

### 6단계 자동화 프로세스

#### Step 1: 로그인
1. 로그인 페이지 접속: `https://www.jobkorea.co.kr/Login/Login_Tot.asp?rDBName=GG&re_url=/`
2. 기업회원 탭 클릭
3. 아이디/비밀번호 입력
4. 로그인 버튼 클릭
5. 로그인 성공 여부 확인

#### Step 2: 미열람 이력서 메뉴 접근
1. 대시보드에서 미열람 이력서 메뉴 클릭
2. 미열람 이력서 목록 페이지 로딩 대기

#### Step 3: 이력서 목록 수집
각 이력서 항목에서 다음 정보 추출:
- **포지션** (지원 공고명)
- **이름**
- **최종학력**
- **최종경력**
- **희망연봉**
- **지원일자**

페이지네이션이 있는 경우 모든 페이지 순회

#### Step 4: 이력서 상세 조회
1. 각 이력서 항목 클릭하여 상세 페이지 진입
2. 지원자 상세 정보 수집:
   - 기본 정보 (이메일, 전화번호)
   - 학력 상세 (학교명, 전공, 학위, 졸업년도)
   - 경력 상세 (회사명, 직급, 재직기간, 업무내용)
   - 자기소개서
   - 포트폴리오 링크
3. PDF 생성 및 저장
4. 목록으로 복귀

#### Step 5: 공고 전환
현재 공고의 모든 미열람 이력서 처리 완료 시:
1. 공고 선택 드롭다운 열기
2. 다음 공고로 전환
3. Step 2로 돌아가서 반복

#### Step 6: 전체 순회 완료
- 모든 공고의 미열람 이력서 수집 완료
- 수집 결과 리포트 생성
- 로그아웃

### 핵심 Selector (구현 시작점)

개발 초기에 필요한 최소한의 selector 정보입니다. 나머지 selector는 구현 과정에서 Chrome DevTools를 통해 실시간으로 확인하며 추가합니다.

```javascript
// selectors.js
export const SELECTORS = {
  // 로그인
  LOGIN_URL: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp?rDBName=GG&re_url=/',
  COMPANY_TAB: '#devMemTab > li.on > a',
  ID_INPUT: '#M_ID',
  PASSWORD_INPUT: '#M_PWD',
  LOGIN_BUTTON: '#login-form > fieldset > section.login-input > button',
  
  // 네비게이션
  UNREAD_RESUMES_MENU: '#dev-cont-Cntnt_CorpLounge > section > article.box.profile > ul > li:nth-child(3) > a > span.txt',
  
  // 공고 전환
  JOB_POSTING_DROPDOWN: '#container > div.top-title-section > div > div > div.content-box > div.title-box > button > div',
  NEXT_POSTING: '#container > div.top-title-section > div > div > div.content-box > div.title-box > div > div > div:nth-child(1) > ul > li:nth-child(2) > button > div.text',
  
  // 이력서 목록 및 상세 - 구현 단계에서 확인
  // RESUME_LIST_ITEM: '구현 시 확인',
  // RESUME_DETAIL: '구현 시 확인',
};
```

### Selector 확인 방법

구현 중 필요한 selector 찾기:
1. Chrome에서 잡코리아 기업 사이트 접속
2. `F12` 키로 개발자 도구 열기
3. Elements 탭에서 원하는 요소 찾기
4. 우클릭 > Copy > Copy selector
5. Playwright 코드에서 테스트 후 적용

**장점**: 
- 문서와 코드 불일치 방지
- 웹사이트 변경에 빠르게 대응
- 실제로 작동하는 selector만 사용

## 예상 도전 과제

1. **웹사이트 구조 변경 대응**: 잡코리아 웹사이트 구조 변경 시 크롤링 로직 수정 필요
   - Selector 설정 파일 분리로 유지보수성 확보
   - 정기적인 selector 유효성 검증 필요
2. **속도 제한**: 과도한 요청으로 인한 차단 방지 (Rate Limiting)
3. **세션 관리**: 로그인 세션 유지 및 재인증 처리
4. **PDF 품질**: 원본 이력서와 유사한 품질의 PDF 생성
5. **개인정보 보호**: 민감한 개인정보 처리 및 보안
6. **동적 콘텐츠 로딩**: JavaScript로 렌더링되는 콘텐츠 대기 처리

## 라이선스 및 법적 고려사항

- 잡코리아 서비스 이용약관 확인 필수
- 크롤링에 대한 법적 검토 필요
- 개인정보 수집 및 이용 동의 절차 확인
- 기업의 정당한 채용 목적으로만 사용

## 향후 확장 가능성

- 다른 채용 플랫폼 연동 (사람인, 인크루트 등)
- AI 기반 이력서 자동 스크리닝
- 지원자 평가 및 점수 시스템
- 팀원 간 이력서 공유 및 협업 기능
- 면접 일정 관리 통합


---

**참고**: 본 프로젝트는 합법적인 채용 업무 목적으로만 사용되어야 하며, 개인정보 보호법 및 관련 법규를 준수해야 합니다.