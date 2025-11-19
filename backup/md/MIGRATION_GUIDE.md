# 데이터베이스 마이그레이션 가이드

## 문제 상황
다음 오류가 발생하는 경우:
- `Could not find the table 'public.job_postings' in the schema cache`
- `column resumes.job_posting_id does not exist`

## 해결 방법

### 1. Supabase 대시보드 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2. 마이그레이션 스크립트 실행
1. `supabase-migration.sql` 파일의 내용을 복사
2. SQL Editor에 붙여넣기
3. **Run** 버튼 클릭

### 3. 실행 결과 확인
스크립트가 성공적으로 실행되면:
- `job_postings` 테이블 생성
- `resumes` 테이블에 `job_posting_id` 컬럼 추가
- `resumes` 테이블에 `md_url` 컬럼 추가
- `status` enum 타입 업데이트 (접수/면접/불합격/합격)
- 필요한 인덱스 및 제약 조건 생성

### 4. 확인 방법
SQL Editor에서 다음 쿼리로 확인:

```sql
-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('job_postings', 'resumes');

-- 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'resumes' 
AND column_name IN ('job_posting_id', 'md_url', 'status');
```

## 주의사항
- 기존 데이터가 있는 경우, `status` 값이 자동으로 매핑됩니다:
  - `unread`, `reviewing` → `접수`
  - `accepted` → `합격`
  - `rejected` → `불합격`
- 마이그레이션 스크립트는 안전하게 여러 번 실행할 수 있습니다 (IF NOT EXISTS 사용)

