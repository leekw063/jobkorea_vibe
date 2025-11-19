-- 이력서 상태 enum 타입 생성
CREATE TYPE resume_status AS ENUM ('unread', 'reviewing', 'accepted', 'rejected');

-- 이력서 테이블 생성
CREATE TABLE resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  job_posting_title TEXT,
  application_date TIMESTAMP WITH TIME ZONE,
  education JSONB,
  career JSONB,
  cover_letter TEXT,
  portfolio_url TEXT,
  pdf_url TEXT,
  status resume_status DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 크롤링 로그 테이블 생성
CREATE TABLE crawl_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_resumes INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_messages JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resumes_created_at ON resumes(created_at);
CREATE INDEX idx_resumes_job_posting ON resumes(job_posting_title);

-- RLS (Row Level Security) 활성화
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (모든 사용자가 읽기/쓰기 가능 - 실제 운영 시 수정 필요)
CREATE POLICY "Enable all access for resumes" ON resumes FOR ALL USING (true);
CREATE POLICY "Enable all access for crawl_logs" ON crawl_logs FOR ALL USING (true);

-- Storage 버킷 생성 (Supabase 대시보드에서 수동 생성 필요)
-- 버킷명: 'resumes'
-- Public: false