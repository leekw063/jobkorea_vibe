-- job_postings 테이블에 HTML 및 Markdown 관련 컬럼 추가

-- job_detail (JSONB): 구조화된 공고 정보
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS job_detail JSONB;

-- job_detail_md (TEXT): Markdown 형식의 공고 내용
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS job_detail_md TEXT;

-- job_detail_html (TEXT): 원본 HTML 내용
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS job_detail_html TEXT;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_job_postings_detail ON job_postings USING GIN (job_detail);

COMMENT ON COLUMN job_postings.job_detail IS '구조화된 공고 정보 (JSON 형식)';
COMMENT ON COLUMN job_postings.job_detail_md IS 'Markdown 형식의 공고 내용';
COMMENT ON COLUMN job_postings.job_detail_html IS '원본 HTML 내용';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ job_postings 테이블에 job_detail, job_detail_md, job_detail_html 컬럼이 추가되었습니다.';
END $$;

