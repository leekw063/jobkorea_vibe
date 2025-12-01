import { createClient } from '@supabase/supabase-js';

console.log(`[${new Date().toISOString()}] ✅ @supabase/supabase-js 모듈 로드 완료`);

// 환경 변수 확인 (SUPABASE_ANON_KEY 우선, SUPABASE_KEY 지원)
console.log(`[${new Date().toISOString()}] 🔍 환경 변수 확인 중...`);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ydaqccbvionvjbvefuln.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkYXFjY2J2aW9udmpidmVmdWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDQwNjQsImV4cCI6MjA3NjY4MDA2NH0.QKGWUtLpXa0sk6cj0Z4DAi7F45D_Zr48SD4oewvdDsA';

console.log(`[${new Date().toISOString()}]    SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET (기본값 사용)'}`);
console.log(`[${new Date().toISOString()}]    SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET (기본값 사용)'}`);
console.log(`[${new Date().toISOString()}]    SUPABASE_KEY: ${process.env.SUPABASE_KEY ? 'SET' : 'NOT SET'}`);
console.log(`[${new Date().toISOString()}]    VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`[${new Date().toISOString()}]    VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);

// Supabase 클라이언트 초기화 로그
console.log(`[${new Date().toISOString()}] 🔧 Supabase 클라이언트 초기화 중...`);
console.log(`[${new Date().toISOString()}]    URL: ${supabaseUrl}`);
console.log(`[${new Date().toISOString()}]    Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'}`);

// 커스텀 fetch 옵션 (타임아웃 및 재시도 로직)
const customFetch = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Supabase 서버 응답 시간 초과');
    }
    throw error;
  }
};

console.log(`[${new Date().toISOString()}] 🏗️ Supabase 클라이언트 생성 중...`);
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'apikey': supabaseKey
      },
      fetch: customFetch
    }
  });
  console.log(`[${new Date().toISOString()}] ✅ Supabase 클라이언트 생성 완료`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ Supabase 클라이언트 생성 실패:`, error.message);
  console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
  // 클라이언트 생성 실패해도 서버는 계속 실행되도록 함
  console.warn(`[${new Date().toISOString()}] ⚠️ Supabase 클라이언트 없이 계속 진행합니다.`);
}

// 연결 테스트 (비동기로 실행되므로 서버 시작을 막지 않음)
(async () => {
  try {
    if (!supabase) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Supabase 클라이언트가 없어 연결 테스트를 건너뜁니다.`);
      return;
    }
    console.log(`[${new Date().toISOString()}] 🔍 Supabase 연결 테스트 중...`);
    // 간단한 쿼리로 연결 테스트
    const { data, error, count } = await supabase
      .from('resumes')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ⚠️ Supabase 연결 테스트 실패:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error code:`, error.code);
      console.error(`[${new Date().toISOString()}]    Error details:`, error.details || error.hint || 'N/A');
      
      // 네트워크 오류인 경우
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        console.error(`[${new Date().toISOString()}]    💡 네트워크 문제 가능성:`);
        console.error(`[${new Date().toISOString()}]       - 인터넷 연결 확인`);
        console.error(`[${new Date().toISOString()}]       - Supabase 프로젝트 상태 확인`);
        console.error(`[${new Date().toISOString()}]       - 방화벽/프록시 설정 확인`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] ✅ Supabase 연결 성공 (테이블 레코드 수: ${count ?? 'N/A'})`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Supabase 연결 테스트 오류:`, err.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, err.stack);
    console.error(`[${new Date().toISOString()}]    네트워크 연결을 확인하거나 Supabase URL/키를 확인하세요.`);
  }
})();

export function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다. 환경 변수를 확인하세요.');
  }
  return supabase;
}

export async function saveResume(resumeData) {
  try {
    console.log(`[${new Date().toISOString()}] 💾 이력서 저장 시도 - 이름: ${resumeData.applicant_name}`);
    
    // 컬럼이 없을 수 있으므로 안전하게 데이터 준비
    const dataToInsert = { ...resumeData };
    
    // job_posting_id나 md_url이 없어도 저장 가능하도록 처리
    const { data, error } = await getSupabase()
      .from('resumes')
      .insert([dataToInsert])
      .select();
    
    if (error) {
      // 컬럼이 없는 경우 해당 필드 제거 후 재시도
      if ((error.message.includes('column') && error.message.includes('does not exist')) ||
          (error.message.includes('Could not find') && error.message.includes('column')) ||
          error.code === 'PGRST204') {
        console.warn(`[${new Date().toISOString()}] ⚠️ 일부 컬럼이 없습니다. 필드를 제거하고 재시도합니다.`);
        console.warn(`[${new Date().toISOString()}]    오류 메시지: ${error.message}`);
        console.warn(`[${new Date().toISOString()}]    오류 코드: ${error.code}`);
        
        // 문제가 될 수 있는 필드 제거
        const safeData = { ...dataToInsert };
        if (error.message.includes('job_posting_id')) {
          delete safeData.job_posting_id;
          console.warn(`[${new Date().toISOString()}]    job_posting_id 필드 제거`);
        }
        if (error.message.includes('md_url')) {
          delete safeData.md_url;
          console.warn(`[${new Date().toISOString()}]    md_url 필드 제거`);
        }
        if (error.message.includes('status')) {
          delete safeData.status;
          console.warn(`[${new Date().toISOString()}]    status 필드 제거`);
        }
        if (error.message.includes('deleted_at')) {
          delete safeData.deleted_at;
          console.warn(`[${new Date().toISOString()}]    deleted_at 필드 제거`);
        }
        
        // 재시도
        const retryResult = await getSupabase()
          .from('resumes')
          .insert([safeData])
          .select();
        
        if (retryResult.error) {
          console.error(`[${new Date().toISOString()}] ❌ 이력서 저장 오류 (재시도 실패):`, retryResult.error.message);
          console.error(`[${new Date().toISOString()}]    Error code:`, retryResult.error.code);
          throw new Error(`Failed to save resume: ${retryResult.error.message}`);
        }
        
        console.log(`[${new Date().toISOString()}] ✅ 이력서 저장 완료 (일부 필드 제외) - ID: ${retryResult.data[0].id}, 이름: ${retryResult.data[0].applicant_name}`);
        return retryResult.data[0];
      }
      
      console.error(`[${new Date().toISOString()}] ❌ 이력서 저장 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to save resume: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 저장 실패: 데이터 없음`);
      throw new Error('No data returned from insert operation');
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 저장 완료 - ID: ${data[0].id}, 이름: ${data[0].applicant_name}`);
    return data[0];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ saveResume 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw error;
  }
}

export async function saveJobPosting(jobPostingData) {
  try {
    console.log(`[${new Date().toISOString()}] 💾 공고 정보 저장 시도 - 공고번호: ${jobPostingData.job_posting_id}`);
    
    // UPSERT: 이미 있으면 업데이트, 없으면 삽입
    const { data, error } = await getSupabase()
      .from('job_postings')
      .upsert([jobPostingData], { onConflict: 'job_posting_id' })
      .select();
    
    if (error) {
      // 테이블이 없는 경우 경고만 출력하고 계속 진행
      if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
        console.warn(`[${new Date().toISOString()}] ⚠️ job_postings 테이블이 없습니다. 마이그레이션 스크립트를 실행하세요.`);
        console.warn(`[${new Date().toISOString()}]    공고 정보는 건너뜁니다: ${jobPostingData.job_posting_title}`);
        return null;
      }
      
      console.error(`[${new Date().toISOString()}] ❌ 공고 정보 저장 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to save job posting: ${error.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 공고 정보 저장 완료 - 공고번호: ${jobPostingData.job_posting_id}`);
    return data?.[0] || null;
  } catch (error) {
    // 테이블이 없는 경우는 에러를 던지지 않고 null 반환
    if (error.message.includes('Could not find the table') || error.message.includes('PGRST205')) {
      console.warn(`[${new Date().toISOString()}] ⚠️ job_postings 테이블이 없습니다. 마이그레이션 스크립트를 실행하세요.`);
      return null;
    }
    console.error(`[${new Date().toISOString()}] ❌ saveJobPosting 오류:`, error.message);
    throw error;
  }
}

/**
 * 기존 공고 목록 조회 (중복 체크용)
 */
export async function getExistingJobPostings() {
  try {
    const { data, error } = await getSupabase()
      .from('job_postings')
      .select('job_posting_id');
    
    if (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ 기존 공고 조회 오류:`, error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] ⚠️ 기존 공고 조회 오류:`, error.message);
    return [];
  }
}

/**
 * 공고 Markdown 조회 (이력서 검토 시 사용)
 */
export async function getJobPostingMarkdown(jobPostingId) {
  try {
    const { data, error } = await getSupabase()
      .from('job_postings')
      .select('job_detail_md')
      .eq('job_posting_id', jobPostingId)
      .single();
    
    if (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ 공고 Markdown 조회 오류:`, error.message);
      return null;
    }
    
    return data?.job_detail_md || null;
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] ⚠️ 공고 Markdown 조회 오류:`, error.message);
    return null;
  }
}

export async function getExistingResumes(jobPostingId) {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 기존 이력서 조회 중 - 공고번호: ${jobPostingId || '전체'}`);
    
    // job_posting_id 컬럼이 있는지 확인하기 위해 먼저 간단한 쿼리 시도
    let query = getSupabase()
      .from('resumes')
      .select('applicant_name, applicant_email, job_posting_id');
    
    // jobPostingId가 제공된 경우 해당 공고의 이력서만 조회
    if (jobPostingId) {
      query = query.eq('job_posting_id', jobPostingId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // job_posting_id 컬럼이 없는 경우
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn(`[${new Date().toISOString()}] ⚠️ job_posting_id 컬럼이 없습니다. 마이그레이션 스크립트를 실행하세요.`);
        console.warn(`[${new Date().toISOString()}]    중복 체크를 건너뜁니다.`);
        return [];
      }
      
      console.error(`[${new Date().toISOString()}] ❌ 기존 이력서 조회 오류:`, error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    // 컬럼이 없는 경우는 빈 배열 반환
    if (error.message && (error.message.includes('column') || error.message.includes('does not exist'))) {
      console.warn(`[${new Date().toISOString()}] ⚠️ job_posting_id 컬럼이 없습니다. 마이그레이션 스크립트를 실행하세요.`);
      return [];
    }
    console.error(`[${new Date().toISOString()}] ❌ getExistingResumes 오류:`, error.message);
    return [];
  }
}

export async function getResumeById(id) {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 이력서 조회 - ID: ${id}`);
    
    const supabaseClient = getSupabase();
    const { data, error } = await supabaseClient
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 조회 오류:`, error.message);
      return null;
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 조회 완료 - ID: ${id}`);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ getResumeById 오류:`, error.message);
    return null;
  }
}

export async function getResumes(filters = {}) {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 이력서 조회 시작 - 필터:`, filters);
    
    const supabaseClient = getSupabase();
    console.log(`[${new Date().toISOString()}]    Supabase URL: ${supabaseUrl}`);
    
    // 네트워크 연결 테스트
    try {
      console.log(`[${new Date().toISOString()}]    네트워크 연결 테스트 중...`);
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });
      console.log(`[${new Date().toISOString()}]    네트워크 연결 테스트 결과: ${testResponse.status}`);
    } catch (networkError) {
      console.error(`[${new Date().toISOString()}]    ⚠️ 네트워크 연결 테스트 실패:`, networkError.message);
      console.error(`[${new Date().toISOString()}]    원인:`, networkError.cause?.message || networkError.code || 'Unknown');
      throw new Error(`네트워크 연결 실패: ${networkError.message}. Supabase 서버에 연결할 수 없습니다.`);
    }
    
    let query = supabaseClient
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false });
    
    // deleted_at 필터링 (컬럼이 있을 때만)
    // 먼저 deleted_at 컬럼 존재 여부를 확인하기 위해 쿼리를 실행하고, 오류가 발생하면 컬럼이 없는 것으로 간주
    let hasDeletedAtColumn = true;
    try {
      if (filters.include_deleted === true) {
        // 삭제된 항목 포함 (모든 항목 조회)
        console.log(`[${new Date().toISOString()}]    삭제된 항목 포함 조회 (모든 항목)`);
        // 필터링 없이 모든 항목 조회
      } else if (filters.deleted_only === true) {
        // 삭제된 항목만 조회
        query = query.not('deleted_at', 'is', null);
        console.log(`[${new Date().toISOString()}]    삭제된 항목만 조회 (deleted_at IS NOT NULL)`);
      } else {
        // 기본: 삭제되지 않은 항목만 조회
        query = query.is('deleted_at', null);
        console.log(`[${new Date().toISOString()}]    삭제되지 않은 항목만 조회 (deleted_at IS NULL)`);
      }
    } catch (e) {
      // deleted_at 컬럼이 없으면 필터링 건너뜀
      hasDeletedAtColumn = false;
      console.warn(`[${new Date().toISOString()}] ⚠️ deleted_at 컬럼이 없습니다. 모든 항목을 조회합니다.`);
      console.warn(`[${new Date().toISOString()}]    오류:`, e.message);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.job_posting_title) {
      query = query.ilike('job_posting_title', `%${filters.job_posting_title}%`);
    }
    
    // job_posting_id 필터링 (컬럼이 있을 때만)
    if (filters.job_posting_id) {
      try {
        query = query.eq('job_posting_id', filters.job_posting_id);
      } catch (e) {
        // 컬럼이 없으면 필터링 건너뜀
        console.warn(`[${new Date().toISOString()}] ⚠️ job_posting_id 필터링 건너뜀 (컬럼 없음)`);
      }
    }
    
    // applicant_name 필터링
    if (filters.applicant_name) {
      query = query.ilike('applicant_name', `%${filters.applicant_name}%`);
    }
    
    console.log(`[${new Date().toISOString()}]    쿼리 실행 중...`);
    let { data, error } = await query;
    
    // deleted_at 컬럼이 없는 경우 오류 처리
    if (error && (error.message.includes('deleted_at') || error.code === 'PGRST204')) {
      console.warn(`[${new Date().toISOString()}] ⚠️ deleted_at 컬럼이 없습니다. 마이그레이션 스크립트를 실행하세요.`);
      console.warn(`[${new Date().toISOString()}]    오류 코드: ${error.code}, 메시지: ${error.message}`);
      
      // deleted_at 필터링 없이 다시 쿼리
      query = supabaseClient
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });
      
      // 다른 필터는 다시 적용
      
      // 다른 필터는 유지
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.job_posting_title) {
        query = query.ilike('job_posting_title', `%${filters.job_posting_title}%`);
      }
      
      if (filters.job_posting_id) {
        try {
          query = query.eq('job_posting_id', filters.job_posting_id);
        } catch (e) {
          console.warn(`[${new Date().toISOString()}] ⚠️ job_posting_id 필터링 건너뜀 (컬럼 없음)`);
        }
      }
      
      const retryResult = await query;
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 조회 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error code:`, error.code);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      console.error(`[${new Date().toISOString()}]    Error hint:`, error.hint);
      
      // 네트워크 오류인 경우 추가 정보 제공
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        console.error(`[${new Date().toISOString()}]    💡 네트워크 오류 가능성:`);
        console.error(`[${new Date().toISOString()}]       - 인터넷 연결 확인`);
        console.error(`[${new Date().toISOString()}]       - Supabase URL 확인: ${supabaseUrl}`);
        console.error(`[${new Date().toISOString()}]       - 방화벽/프록시 설정 확인`);
        console.error(`[${new Date().toISOString()}]       - Supabase 프로젝트가 활성화되어 있는지 확인`);
        console.error(`[${new Date().toISOString()}]       - Node.js 버전 확인 (Node 18+ 권장)`);
      }
      
      throw new Error(`Failed to fetch resumes: ${error.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 조회 완료 - ${data?.length || 0}개`);
    return data || [];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ getResumes 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    
    // 원본 오류가 fetch failed인 경우 더 자세한 정보 제공
    if (error.message.includes('fetch failed') || error.cause) {
      console.error(`[${new Date().toISOString()}]    원본 오류:`, error.cause || error);
      if (error.cause) {
        console.error(`[${new Date().toISOString()}]    Cause message:`, error.cause.message);
        console.error(`[${new Date().toISOString()}]    Cause code:`, error.cause.code);
        console.error(`[${new Date().toISOString()}]    Cause errno:`, error.cause.errno);
        console.error(`[${new Date().toISOString()}]    Cause syscall:`, error.cause.syscall);
      }
    }
    
    throw error;
  }
}

export async function updateResumeReviewScore(id, score, reviewText = null) {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 이력서 검토 정보 업데이트 - ID: ${id}, Score: ${score}`);
    
    const updateData = { 
      review_score: score,
      reviewed_at: new Date().toISOString()
    };
    
    // 검토 텍스트가 있으면 함께 저장
    if (reviewText) {
      updateData.review_text = reviewText;
      console.log(`[${new Date().toISOString()}]    검토 텍스트 길이: ${reviewText.length}자`);
    }
    
    const supabaseClient = getSupabase();
    const { data, error } = await supabaseClient
      .from('resumes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 검토 정보 업데이트 오류:`, error.message);
      throw new Error(`Failed to update review info: ${error.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 검토 정보 업데이트 완료 - ID: ${id}`);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ updateResumeReviewScore 오류:`, error.message);
    throw error;
  }
}

export async function updateResumeStatus(id, status) {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 이력서 상태 업데이트 시도 - ID: ${id}, Status: ${status}`);
    const { data, error } = await getSupabase()
      .from('resumes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 상태 업데이트 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to update resume status: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 없음 - ID: ${id}`);
      throw new Error('Resume not found');
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 상태 업데이트 완료 - ID: ${id}, 이름: ${data[0].applicant_name}`);
    return data[0];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ updateResumeStatus 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw error;
  }
}

/**
 * 이력서 소프트 삭제 (휴지통으로 이동)
 */
export async function softDeleteResume(id) {
  try {
    console.log(`[${new Date().toISOString()}] 🗑️ 이력서 소프트 삭제 시도 - ID: ${id}`);
    const { data, error } = await getSupabase()
      .from('resumes')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) {
      // deleted_at 컬럼이 없는 경우 처리
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn(`[${new Date().toISOString()}] ⚠️ deleted_at 컬럼이 없습니다. 마이그레이션 스크립트를 실행하세요.`);
        throw new Error('deleted_at 컬럼이 없습니다. 마이그레이션 스크립트를 실행하세요.');
      }
      
      console.error(`[${new Date().toISOString()}] ❌ 이력서 소프트 삭제 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to soft delete resume: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 없음 - ID: ${id}`);
      throw new Error('Resume not found');
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 소프트 삭제 완료 - ID: ${id}, 이름: ${data[0].applicant_name}`);
    return data[0];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ softDeleteResume 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw error;
  }
}

/**
 * 이력서 복원 (휴지통에서 복원)
 */
export async function restoreResume(id) {
  try {
    console.log(`[${new Date().toISOString()}] ♻️ 이력서 복원 시도 - ID: ${id}`);
    const { data, error } = await getSupabase()
      .from('resumes')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 복원 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to restore resume: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 없음 - ID: ${id}`);
      throw new Error('Resume not found');
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 복원 완료 - ID: ${id}, 이름: ${data[0].applicant_name}`);
    return data[0];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ restoreResume 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw error;
  }
}

/**
 * 이력서 영구 삭제 (휴지통에서 완전 삭제)
 */
export async function permanentDeleteResume(id) {
  try {
    console.log(`[${new Date().toISOString()}] 🗑️ 이력서 영구 삭제 시도 - ID: ${id}`);
    const { data, error } = await getSupabase()
      .from('resumes')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 영구 삭제 오류:`, error.message);
      console.error(`[${new Date().toISOString()}]    Error details:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to permanently delete resume: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error(`[${new Date().toISOString()}] ❌ 이력서 없음 - ID: ${id}`);
      throw new Error('Resume not found');
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 영구 삭제 완료 - ID: ${id}, 이름: ${data[0].applicant_name}`);
    return data[0];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ permanentDeleteResume 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw error;
  }
}

/**
 * 특정 공고의 기존 이력서 번호(Pass_R_No) 목록 조회
 */
export async function getExistingResumeNumbers(jobPostingId) {
  try {
    const { data, error } = await getSupabase()
      .from('resumes')
      .select('jobkorea_resume_id')
      .eq('job_posting_id', jobPostingId)
      .not('jobkorea_resume_id', 'is', null);
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ 기존 이력서 번호 조회 오류:`, error.message);
      return new Set();
    }
    
    const numbers = new Set(data.map(r => String(r.jobkorea_resume_id)).filter(Boolean));
    return numbers;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ getExistingResumeNumbers 오류:`, error.message);
    return new Set();
  }
}
