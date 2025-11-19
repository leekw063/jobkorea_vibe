-- ============================================
-- 잡코리아 이력서 관리 시스템 - 기존 데이터 삭제
-- ============================================
-- ⚠️ 주의: 이 스크립트는 모든 데이터를 삭제합니다!
-- ⚠️ 테이블 구조(Schema)는 유지되며, 데이터만 삭제됩니다.
-- Supabase SQL Editor에서 실행하세요.

-- 시작 메시지
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '데이터 삭제를 시작합니다...';
  RAISE NOTICE '============================================';
END $$;

-- 1. 이력서 데이터 삭제 (외래 키로 참조되므로 먼저 삭제)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM resumes;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ resumes 테이블: %개의 레코드가 삭제되었습니다.', deleted_count;
END $$;

-- 2. 공고 정보 데이터 삭제
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM job_postings;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ job_postings 테이블: %개의 레코드가 삭제되었습니다.', deleted_count;
END $$;

-- 3. 크롤링 로그 데이터 삭제
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM crawl_logs;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ crawl_logs 테이블: %개의 레코드가 삭제되었습니다.', deleted_count;
END $$;

-- 4. 시퀀스 리셋 (ID를 1부터 다시 시작하려는 경우 - 선택사항)
-- 주의: UUID를 사용하는 경우 시퀀스 리셋이 필요 없습니다
-- ALTER SEQUENCE resumes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE job_postings_id_seq RESTART WITH 1;
-- ALTER SEQUENCE crawl_logs_id_seq RESTART WITH 1;

-- 5. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ 모든 데이터 삭제 완료!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 현재 상태:';
END $$;

-- 6. 각 테이블의 레코드 수 확인
SELECT 
  'resumes' AS table_name,
  COUNT(*) AS record_count
FROM resumes
UNION ALL
SELECT 
  'job_postings' AS table_name,
  COUNT(*) AS record_count
FROM job_postings
UNION ALL
SELECT 
  'crawl_logs' AS table_name,
  COUNT(*) AS record_count
FROM crawl_logs
ORDER BY table_name;

