-- ============================================
-- status 컬럼 추가 마이그레이션
-- ============================================
-- resumes 테이블에 status 컬럼이 없는 경우 추가합니다.

-- 1. resume_status enum 타입 생성 (없는 경우)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resume_status') THEN
        CREATE TYPE resume_status AS ENUM ('접수', '면접', '불합격', '합격');
        RAISE NOTICE 'resume_status enum 타입 생성 완료';
    ELSE
        RAISE NOTICE 'resume_status enum 타입이 이미 존재합니다';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Enum 타입 생성 중 오류: %', SQLERRM;
END $$;

-- 2. resumes 테이블에 status 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
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
    ELSE
        RAISE NOTICE 'status 컬럼이 이미 존재합니다';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'status 컬럼 추가 중 오류: %', SQLERRM;
END $$;

-- 3. status 인덱스 생성 (없는 경우)
CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(status);

-- 4. 완료 메시지
DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'status 컬럼 추가 마이그레이션 완료!';
    RAISE NOTICE '============================================';
END $$;

