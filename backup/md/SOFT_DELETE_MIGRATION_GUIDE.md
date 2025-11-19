# 소프트 삭제 (휴지통) 기능 마이그레이션 가이드

## 개요
이 가이드는 `deleted_at` 컬럼을 추가하여 소프트 삭제 기능을 활성화하는 방법을 설명합니다.

## 마이그레이션 스크립트 실행 방법

### 1. Supabase Dashboard 접속
1. [Supabase Dashboard](https://app.supabase.com)에 로그인합니다.
2. 프로젝트를 선택합니다.

### 2. SQL Editor 열기
1. 왼쪽 사이드바에서 **SQL Editor**를 클릭합니다.
2. **New query** 버튼을 클릭하여 새 쿼리를 생성합니다.

### 3. 마이그레이션 스크립트 실행
1. `supabase-add-soft-delete.sql` 파일의 내용을 복사합니다.
2. SQL Editor에 붙여넣습니다.
3. **Run** 버튼을 클릭하여 실행합니다.

### 4. 실행 결과 확인
스크립트가 성공적으로 실행되면 다음과 같은 메시지가 표시됩니다:
- `deleted_at 컬럼 추가 완료` 또는 `deleted_at 컬럼이 이미 존재합니다`
- `소프트 삭제 기능이 추가되었습니다!`

## 마이그레이션 스크립트 내용

```sql
-- 1. resumes 테이블에 deleted_at 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE resumes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'deleted_at 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'deleted_at 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- 2. deleted_at 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at);

-- 3. 삭제되지 않은 항목만 조회하는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW resumes_active AS
SELECT * FROM resumes WHERE deleted_at IS NULL;

-- 완료 메시지
SELECT '소프트 삭제 기능이 추가되었습니다!' AS message;
```

## 기능 설명

### 소프트 삭제란?
- 데이터를 실제로 삭제하지 않고 `deleted_at` 컬럼에 삭제 시간을 기록합니다.
- 삭제된 데이터는 휴지통에서 확인할 수 있으며, 필요시 복원할 수 있습니다.
- 영구 삭제를 원하는 경우에만 실제로 데이터를 삭제합니다.

### 주요 기능
1. **삭제**: 이력서를 휴지통으로 이동 (소프트 삭제)
2. **복원**: 휴지통에서 이력서를 복원
3. **영구 삭제**: 휴지통에서 이력서를 완전히 삭제

## 주의사항
- 마이그레이션 스크립트는 기존 데이터를 보존합니다.
- `deleted_at` 컬럼이 없어도 웹앱은 작동하지만, 삭제 기능은 사용할 수 없습니다.
- 마이그레이션 후에는 삭제된 항목과 삭제되지 않은 항목을 구분할 수 있습니다.

## 문제 해결

### 오류: "column resumes.deleted_at does not exist"
- **원인**: 마이그레이션 스크립트가 아직 실행되지 않았습니다.
- **해결**: 위의 마이그레이션 가이드를 따라 스크립트를 실행하세요.

### 마이그레이션 후에도 오류가 발생하는 경우
1. Supabase Dashboard에서 테이블 구조를 확인하세요.
2. `resumes` 테이블에 `deleted_at` 컬럼이 있는지 확인하세요.
3. 컬럼이 없다면 마이그레이션 스크립트를 다시 실행하세요.

