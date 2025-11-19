-- ============================================
-- 잡코리아 이력서 관리 시스템 - 데이터베이스 초기화
-- ============================================
-- ⚠️ 주의: 이 스크립트는 모든 데이터를 삭제하고 테이블을 재생성합니다!
-- Supabase SQL Editor에서 실행하세요.

-- 1. 기존 데이터 삭제
DELETE FROM resumes;
DELETE FROM job_postings;
DELETE FROM crawl_logs;

-- 2. 테이블 삭제 (CASCADE로 제약 조건도 함께 삭제)
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS job_postings CASCADE;
DROP TABLE IF EXISTS crawl_logs CASCADE;

-- 3. Enum 타입 삭제
DROP TYPE IF EXISTS resume_status CASCADE;

-- 4. 새로운 enum 타입 생성
CREATE TYPE resume_status AS ENUM ('접수', '면접', '불합격', '합격');

-- 5. job_postings 테이블 생성
CREATE TABLE job_postings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id TEXT UNIQUE NOT NULL,
  job_posting_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. resumes 테이블 생성
CREATE TABLE resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  job_posting_title TEXT,
  job_posting_id TEXT,
  application_date TIMESTAMP WITH TIME ZONE,
  education JSONB,
  career JSONB,
  cover_letter TEXT,
  portfolio_url TEXT,
  pdf_url TEXT,
  md_url TEXT,
  status resume_status DEFAULT '접수',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_job_posting FOREIGN KEY (job_posting_id) REFERENCES job_postings(job_posting_id) ON DELETE SET NULL
);

-- 7. crawl_logs 테이블 생성
CREATE TABLE crawl_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_resumes INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_messages JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 인덱스 생성
CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resumes_created_at ON resumes(created_at);
CREATE INDEX idx_resumes_job_posting_title ON resumes(job_posting_title);
CREATE INDEX idx_resumes_job_posting_id ON resumes(job_posting_id);
CREATE INDEX idx_resumes_applicant_name ON resumes(applicant_name);
CREATE INDEX idx_job_postings_id ON job_postings(job_posting_id);

-- 9. 중복 체크를 위한 유니크 인덱스
CREATE UNIQUE INDEX idx_resumes_unique_applicant_job 
ON resumes(applicant_name, job_posting_id) 
WHERE applicant_name IS NOT NULL AND job_posting_id IS NOT NULL;

-- 10. RLS (Row Level Security) 활성화
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- 11. 기본 정책 설정
CREATE POLICY "Enable all access for resumes" ON resumes FOR ALL USING (true);
CREATE POLICY "Enable all access for job_postings" ON job_postings FOR ALL USING (true);
CREATE POLICY "Enable all access for crawl_logs" ON crawl_logs FOR ALL USING (true);

-- 12. 완료 메시지
SELECT '============================================' AS message;
SELECT '데이터베이스 초기화 완료!' AS message;
SELECT '============================================' AS message;

