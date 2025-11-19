-- ============================================
-- job_postings 테이블에 job_detail_md 컬럼 추가
-- ============================================
-- 공고 상세 정보를 Markdown 형식으로 저장 (이력서 검토 시 사용)

-- job_detail_md 컬럼 추가 (TEXT 타입)
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

-- 완료 메시지
DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'job_detail_md 컬럼 추가 마이그레이션 완료!';
    RAISE NOTICE '공고 상세 정보를 Markdown 형식으로 저장할 수 있습니다.';
    RAISE NOTICE '============================================';
END $$;


