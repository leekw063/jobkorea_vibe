# 📘 PRD: 잡코리아 이력서 관리 시스템 (JobKorea Resume Manager)

## 1. 개요 (Overview)

### 제품명
**잡코리아 이력서 관리 시스템 (JobKorea Resume Manager)**

### 목적
잡코리아 기업 회원 계정으로 접근 가능한 **진행중인 공고의 접수된 이력서를 자동 수집·정리·보관**하여  
채용 담당자의 반복 업무를 자동화하고, 데이터 기반 인사 의사결정을 지원하는 웹 애플리케이션 구축.

### 주요 가치
- 이력서 관리 자동화로 **채용 효율성 향상**
- 진행중인 공고의 접수된 이력서 **누락 방지 및 장기 보관**
- PDF 및 Markdown 변환으로 **검색 가능한 인재 DB 구축**
- 중복 수집 방지로 **데이터 정합성 보장**
- **보안 및 개인정보 보호 준수** 기반의 인사 업무 혁신

## 2. 목표 (Objectives & KPIs)

| 목표 | 세부 내용 | 측정 지표 |
|------|------------|------------|
| 이력서 수집 자동화 | 잡코리아 로그인 후 진행중인 공고의 접수된 이력서 자동 수집 | 100% 자동화 (수동 개입 無) |
| 중복 수집 방지 | 이미 수집된 이력서는 자동으로 제외 | 중복률 0% |
| 데이터 구조화 | 지원자·공고·이력 정보 DB화 | JSON Schema 준수 |
| 문서 관리 효율화 | PDF 및 Markdown 자동 저장 및 다운로드 | 변환 성공률 98% 이상 |
| 채용 담당자 UX 향상 | React 기반 필터링 대시보드 제공 | 페이지 로딩 < 3초 |
| 보안 및 개인정보 보호 | Supabase RLS, 암호화 저장 적용 | 보안 정책 준수 100% |

## 3. 주요 사용자 시나리오 (User Scenarios)

### 🧑‍💼 인사 담당자
1. **로그인 후 '이력서 수집' 버튼 클릭**
2. 자동으로 잡코리아 로그인 → 진행중인 공고 목록 수집 → 각 공고별 접수된 이력서 수집
3. 수집 결과를 **대시보드**에서 확인
4. 각 지원자의 PDF/Markdown 열람 및 상태 업데이트 (접수/면접/불합격/합격)
5. 필요한 경우 이력서 PDF 또는 Markdown 다운로드
6. 공고명 및 공고번호로 필터링 및 검색

### 🧠 시스템 관리자
1. Playwright 자동화 로그 검토
2. Supabase Storage 및 DB 상태 모니터링
3. Selector 업데이트 또는 스케줄러 유지보수

## 4. 기능 요구사항 (Functional Requirements)

### 4.1. 크롤링 및 자동화
| 기능 | 설명 | 기술 |
|------|------|------|
| 기업 로그인 자동화 | Playwright로 기업 회원 로그인 수행 | Playwright |
| 진행중인 공고 목록 수집 | 공고명 및 공고번호 추출 | Playwright |
| 접수된 이력서 탐색 | 각 공고별 접수된 이력서 목록 순회 | Playwright |
| 중복 이력서 체크 | 이미 수집된 이력서는 제외 (이름+공고번호 기준) | Node.js |
| 상세 페이지 파싱 | 이름, 연락처, 학력, 경력, 자기소개서 등 추출 | Node.js |
| PDF 생성 | HTML → PDF 변환 후 로컬 저장 | Playwright PDF API |
| Markdown 변환 | PDF → Markdown 변환 (markitdown 라이브러리) | markitdown |

### 4.2. 데이터 관리
| 기능 | 설명 | 기술 |
|------|------|------|
| Supabase 연동 | PostgreSQL 기반 데이터 저장 | Supabase SDK |
| Schema 구조화 | applicant, job_posting, education, career 등 JSON 필드 | Supabase |
| 상태 관리 | 접수 / 면접 / 불합격 / 합격 | Enum 필드 |
| 공고 정보 저장 | 공고명, 공고번호 저장 및 관리 | Supabase |
| 중복 방지 로직 | 지원자 이름 + 공고번호 조합으로 중복 체크 | Node.js |

### 4.3. 대시보드
| 기능 | 설명 |
|------|------|
| 이력서 목록 표시 | 지원자별 카드형 UI |
| 필터/검색 기능 | 공고명, 공고번호, 상태, 지원일자 기준 필터 |
| 상태 변경 | 접수 / 면접 / 불합격 / 합격 (드롭다운) |
| PDF 다운로드 | 로컬 저장된 PDF 파일 다운로드 |
| Markdown 열람/다운로드 | PDF에서 변환된 Markdown 파일 열람 및 다운로드 |
| 공고 정보 표시 | 각 이력서에 공고명 및 공고번호 표시 |

### 4.4. 보안 및 인증
| 항목 | 요구사항 |
|------|------------|
| 로그인 정보 암호화 | 환경변수 또는 암호화 저장소 사용 |
| RLS 적용 | Supabase Row Level Security 정책 |
| 개인정보 보호 | PIPA 및 회사 내규 준수 |
| API 접근 제어 | JWT 기반 관리자 인증 |

## 5. 비기능 요구사항 (Non-functional Requirements)

| 항목 | 목표 |
|------|------|
| 성능 | 50개 이력서 수집 시 5분 이내 |
| 가용성 | 99.9% uptime (Supabase SLA) |
| 확장성 | 사람인·인크루트 등 타 플랫폼 연동 고려 |
| 유지보수성 | selector.js 분리, 크롤링 로직 모듈화 |
| 보안성 | HTTPS 통신, 민감정보 암호화 |

## 6. 시스템 아키텍처

```mermaid
graph TD
A[사용자 (HR Manager)] --> B[React Web App]
B --> C[Express API Server]
C --> D[Playwright Automation]
C --> E[Supabase DB & Storage]
D -->|수집 데이터| E
E -->|PDF/데이터 조회| B
```

## 7. 데이터 구조 설계 (Database Schema)

### resumes 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| applicant_name | TEXT | 지원자 이름 |
| applicant_email | TEXT | 이메일 |
| applicant_phone | TEXT | 연락처 |
| job_posting_title | TEXT | 지원 공고명 |
| job_posting_id | TEXT | 공고번호 (중복 체크용) |
| education / career | JSONB | 구조화된 학력/경력 정보 |
| cover_letter | TEXT | 자기소개서 |
| portfolio_url | TEXT | 포트폴리오 링크 |
| pdf_url | TEXT | PDF 저장 경로 |
| md_url | TEXT | Markdown 저장 경로 |
| status | ENUM | 접수 / 면접 / 불합격 / 합격 |
| created_at / updated_at | TIMESTAMP | 생성·수정일 |

### job_postings 테이블 (신규)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| job_posting_id | TEXT | 공고번호 (고유) |
| job_posting_title | TEXT | 공고명 |
| created_at / updated_at | TIMESTAMP | 생성·수정일 |

## 8. 구현 완료 사항

| 기능 | 상태 | 설명 |
|------|------|------|
| 인프라 구축 | ✅ 완료 | React + Supabase + Express |
| 잡코리아 로그인 | ✅ 완료 | Playwright 기반 자동 로그인 |
| 진행중인 공고 수집 | 🟡 진행중 | 공고명 및 공고번호 추출 로직 구현 필요 |
| 이력서 수집 | 🟡 진행중 | 각 공고별 접수된 이력서 수집 |
| 중복 체크 | 🟡 진행중 | 이미 수집된 이력서 제외 로직 구현 필요 |
| PDF 생성 | ✅ 완료 | Playwright PDF API |
| Markdown 변환 | 🟡 진행중 | markitdown 라이브러리 연동 필요 |
| DB 연동 | ✅ 완료 | Supabase 연동 |
| 대시보드 UI | ✅ 완료 | React + Tailwind CSS |
| 상태 관리 | 🟡 수정 필요 | 접수/면접/불합격/합격 드롭다운으로 변경 |
| 필터링 | 🟡 수정 필요 | 공고명, 공고번호 필터 추가 필요 |

### 실행 환경
- Backend: http://localhost:4001
- Frontend: http://localhost:5173
- 더미 데이터로 UI 테스트 가능

## 9. 리스크 및 대응 전략

| 리스크 | 대응 방안 |
|--------|------------|
| 잡코리아 UI 변경 | selector.js 외부 관리 및 주기적 검증 |
| 세션 만료 | 자동 재로그인 처리 |
| 과도한 요청 | rate-limiting 적용 |
| 개인정보 노출 | 암호화 + 접근 권한 제한 |
| PDF 깨짐 | puppeteer fallback 제공 |



## 10. 시스템 사양

| 항목 | 내용 |
|------|------|
| 수집 범위 | 진행중인 모든 공고, 공고당 접수된 모든 이력서 (중복 제외) |
| PDF 저장 위치 | backend-new/pdfs/ |
| Markdown 저장 위치 | backend-new/markdowns/ |
| 데이터베이스 | Supabase PostgreSQL |
| 브라우저 모드 | Headless 설정 가능 |
| API 포트 | 4001 |
| 프론트엔드 포트 | 5173 |
| 잡코리아 계정 | 환경변수로 관리 |
| Supabase URL | 환경변수로 관리 |
| Markdown 변환 라이브러리 | markitdown |
