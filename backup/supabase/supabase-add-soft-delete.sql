-- ============================================
-- 소프트 삭제 (휴지통) 기능 추가
-- ============================================
-- 이 스크립트는 deleted_at 컬럼을 추가하여 소프트 삭제 기능을 활성화합니다.

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

-- 2. deleted_at 인덱스 생성 (삭제되지 않은 항목 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at);

-- 3. 삭제되지 않은 항목만 조회하는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW resumes_active AS
SELECT * FROM resumes WHERE deleted_at IS NULL;

-- 완료 메시지
SELECT '소프트 삭제 기능이 추가되었습니다!' AS message;

