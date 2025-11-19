-- 기존 enum 타입 삭제 (있는 경우)
DROP TYPE IF EXISTS resume_status CASCADE;

-- 새로운 이력서 상태 enum 타입 생성
CREATE TYPE resume_status AS ENUM ('접수', '면접', '불합격', '합격');

-- job_postings 테이블 생성
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id TEXT UNIQUE NOT NULL,
  job_posting_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이력서 테이블 생성 (업데이트)
CREATE TABLE IF NOT EXISTS resumes (
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

-- 크롤링 로그 테이블 생성
CREATE TABLE IF NOT EXISTS crawl_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_resumes INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_messages JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(status);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_job_posting_title ON resumes(job_posting_title);
CREATE INDEX IF NOT EXISTS idx_resumes_job_posting_id ON resumes(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_resumes_applicant_name ON resumes(applicant_name);
CREATE INDEX IF NOT EXISTS idx_job_postings_id ON job_postings(job_posting_id);

-- 중복 체크를 위한 유니크 인덱스 (지원자명 + 공고번호)
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_unique_applicant_job 
ON resumes(applicant_name, job_posting_id) 
WHERE applicant_name IS NOT NULL AND job_posting_id IS NOT NULL;

-- RLS (Row Level Security) 활성화
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (모든 사용자가 읽기/쓰기 가능 - 실제 운영 시 수정 필요)
DROP POLICY IF EXISTS "Enable all access for resumes" ON resumes;
CREATE POLICY "Enable all access for resumes" ON resumes FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for job_postings" ON job_postings;
CREATE POLICY "Enable all access for job_postings" ON job_postings FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for crawl_logs" ON crawl_logs;
CREATE POLICY "Enable all access for crawl_logs" ON crawl_logs FOR ALL USING (true);

