-- ============================================
-- job_postings 테이블에 job_detail 컬럼 추가
-- ============================================
-- 공고 상세 정보(주요업무, 지원자격, 우대사항 등)를 JSONB 형식으로 저장

-- job_detail 컬럼 추가 (JSONB 타입)
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

-- 완료 메시지
DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'job_detail 컬럼 추가 마이그레이션 완료!';
    RAISE NOTICE '공고 상세 정보를 JSONB 형식으로 저장할 수 있습니다.';
    RAISE NOTICE '============================================';
END $$;


