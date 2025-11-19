-- resumes 테이블에 검토 관련 컬럼 추가

-- 검토 점수 컬럼 추가 (0-100점)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS review_score INTEGER;

-- 검토 결과 텍스트 컬럼 추가
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS review_text TEXT;

-- 검토 일시 컬럼 추가
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- job_postings 테이블에 상세 정보 컬럼 추가
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS job_detail_md TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_resumes_review_score ON resumes(review_score);
CREATE INDEX IF NOT EXISTS idx_resumes_reviewed_at ON resumes(reviewed_at);

-- 기존 데이터 확인을 위한 코멘트
COMMENT ON COLUMN resumes.review_score IS '이력서 검토 점수 (0-100)';
COMMENT ON COLUMN resumes.review_text IS 'AI 검토 결과 상세 텍스트';
COMMENT ON COLUMN resumes.reviewed_at IS '검토 완료 일시';
COMMENT ON COLUMN job_postings.job_detail_md IS '공고 상세 정보 (Markdown 형식)';

