-- ============================================
-- 잡코리아 이력서 관리 시스템 - 데이터베이스 마이그레이션
-- ============================================
-- 이 스크립트는 기존 데이터베이스에 새로운 테이블과 컬럼을 추가합니다.
-- Supabase SQL Editor에서 실행하세요.

-- 1. 기존 enum 타입 확인 및 업데이트
DO $$ 
BEGIN
    -- 기존 enum이 있으면 삭제 (데이터가 있으면 실패할 수 있음)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resume_status') THEN
        -- 기존 enum 값 확인
        IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel IN ('unread', 'reviewing', 'accepted', 'rejected')) THEN
            -- 기존 데이터가 있으면 컬럼을 TEXT로 변경 후 enum 재생성
            ALTER TABLE resumes ALTER COLUMN status TYPE TEXT;
            DROP TYPE IF EXISTS resume_status CASCADE;
        ELSE
            DROP TYPE IF EXISTS resume_status CASCADE;
        END IF;
    END IF;
    
    -- 새로운 enum 타입 생성
    CREATE TYPE resume_status AS ENUM ('접수', '면접', '불합격', '합격');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Enum 타입 처리 중 오류: %', SQLERRM;
END $$;

-- 2. job_postings 테이블 생성
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id TEXT UNIQUE NOT NULL,
  job_posting_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. resumes 테이블에 job_posting_id 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' AND column_name = 'job_posting_id'
    ) THEN
        ALTER TABLE resumes ADD COLUMN job_posting_id TEXT;
        RAISE NOTICE 'job_posting_id 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'job_posting_id 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- 4. resumes 테이블에 md_url 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' AND column_name = 'md_url'
    ) THEN
        ALTER TABLE resumes ADD COLUMN md_url TEXT;
        RAISE NOTICE 'md_url 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'md_url 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- 5. resumes 테이블의 status 컬럼 추가 또는 업데이트
DO $$ 
BEGIN
    -- status 컬럼이 아예 없는 경우 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' AND column_name = 'status'
    ) THEN
        -- status 컬럼 추가
        ALTER TABLE resumes 
        ADD COLUMN status resume_status DEFAULT '접수';
        
        -- 기존 데이터가 있으면 모두 '접수'로 설정
        UPDATE resumes SET status = '접수' WHERE status IS NULL;
        
        RAISE NOTICE 'status 컬럼 추가 완료 (기본값: 접수)';
    -- status 컬럼이 TEXT 타입이면 enum으로 변경
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- 기존 값 매핑
        UPDATE resumes SET status = '접수' WHERE status IN ('unread', 'reviewing') OR status IS NULL;
        UPDATE resumes SET status = '합격' WHERE status = 'accepted';
        UPDATE resumes SET status = '불합격' WHERE status = 'rejected';
        
        -- enum으로 변경
        ALTER TABLE resumes ALTER COLUMN status TYPE resume_status 
        USING status::resume_status;
        
        -- 기본값 설정
        ALTER TABLE resumes ALTER COLUMN status SET DEFAULT '접수';
        
        RAISE NOTICE 'status 컬럼을 enum으로 변경 완료';
    -- status 컬럼이 이미 resume_status enum 타입인 경우
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' 
        AND column_name = 'status' 
        AND udt_name = 'resume_status'
    ) THEN
        RAISE NOTICE 'status 컬럼이 이미 resume_status enum 타입입니다';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'status 컬럼 업데이트 중 오류: %', SQLERRM;
END $$;

-- 6. 외래 키 제약 조건 추가 (job_postings 테이블이 있는 경우)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_job_posting' 
        AND table_name = 'resumes'
    ) THEN
        ALTER TABLE resumes 
        ADD CONSTRAINT fk_job_posting 
        FOREIGN KEY (job_posting_id) 
        REFERENCES job_postings(job_posting_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE '외래 키 제약 조건 추가 완료';
    ELSE
        RAISE NOTICE '외래 키 제약 조건이 이미 존재합니다';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '외래 키 추가 중 오류 (무시 가능): %', SQLERRM;
END $$;

-- 7. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_resumes_job_posting_id ON resumes(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_resumes_applicant_name ON resumes(applicant_name);
CREATE INDEX IF NOT EXISTS idx_job_postings_id ON job_postings(job_posting_id);

-- 8. 중복 체크를 위한 유니크 인덱스 (기존 인덱스가 있으면 삭제 후 재생성)
DROP INDEX IF EXISTS idx_resumes_unique_applicant_job;
CREATE UNIQUE INDEX idx_resumes_unique_applicant_job 
ON resumes(applicant_name, job_posting_id) 
WHERE applicant_name IS NOT NULL AND job_posting_id IS NOT NULL;

-- 9. 소프트 삭제 (휴지통) 기능을 위한 deleted_at 컬럼 추가
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

-- deleted_at 인덱스 생성 (삭제되지 않은 항목 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at);

-- 삭제되지 않은 항목만 조회하는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW resumes_active AS
SELECT * FROM resumes WHERE deleted_at IS NULL;

-- 10. 검토 점수 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' AND column_name = 'review_score'
    ) THEN
        ALTER TABLE resumes ADD COLUMN review_score INTEGER CHECK (review_score >= 0 AND review_score <= 100);
        RAISE NOTICE 'review_score 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'review_score 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- review_score 인덱스 생성 (점수별 정렬 성능 향상)
CREATE INDEX IF NOT EXISTS idx_resumes_review_score ON resumes(review_score);

-- 11. job_postings 테이블에 job_detail 컬럼 추가 (공고 상세 정보)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_postings' AND column_name = 'job_detail'
    ) THEN
        ALTER TABLE job_postings 
        ADD COLUMN job_detail JSONB;
        
        RAISE NOTICE 'job_detail 컬럼 추가 완료 (JSONB 타입)';
    ELSE
        RAISE NOTICE 'job_detail 컬럼이 이미 존재합니다';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'job_detail 컬럼 추가 중 오류: %', SQLERRM;
END $$;

-- job_detail 인덱스 생성 (JSONB 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_job_postings_job_detail ON job_postings USING GIN (job_detail);

-- job_detail_md 컬럼 추가 (Markdown 형식으로 저장)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_postings' AND column_name = 'job_detail_md'
    ) THEN
        ALTER TABLE job_postings 
        ADD COLUMN job_detail_md TEXT;
        
        RAISE NOTICE 'job_detail_md 컬럼 추가 완료 (TEXT 타입)';
    ELSE
        RAISE NOTICE 'job_detail_md 컬럼이 이미 존재합니다';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'job_detail_md 컬럼 추가 중 오류: %', SQLERRM;
END $$;

-- 12. RLS 정책 설정
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- job_postings 테이블 정책
DROP POLICY IF EXISTS "Enable all access for job_postings" ON job_postings;
CREATE POLICY "Enable all access for job_postings" 
ON job_postings FOR ALL USING (true);

-- 13. 완료 메시지
DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '마이그레이션 완료!';
    RAISE NOTICE '소프트 삭제 (휴지통) 기능이 포함되었습니다.';
    RAISE NOTICE '검토 점수 (review_score) 컬럼이 추가되었습니다.';
    RAISE NOTICE '공고 상세 정보 (job_detail) 컬럼이 추가되었습니다.';
    RAISE NOTICE '공고 상세 정보 Markdown (job_detail_md) 컬럼이 추가되었습니다.';
    RAISE NOTICE '============================================';
END $$;

