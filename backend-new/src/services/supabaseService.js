import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인 (SUPABASE_ANON_KEY 우선, SUPABASE_KEY 지원)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ydaqccbvionvjbvefuln.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkYXFjY2J2aW9udmpidmVmdWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDQwNjQsImV4cCI6MjA3NjY4MDA2NH0.QKGWUtLpXa0sk6cj0Z4DAi7F45D_Zr48SD4oewvdDsA';

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

const supabase = createClient(supabaseUrl, supabaseKey, {
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

// 연결 테스트 (비동기로 실행되므로 서버 시작을 막지 않음)
(async () => {
  try {
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
  return supabase;
}

export async function saveResume(resumeData) {
  try {
    console.log(`[${new Date().toISOString()}] 💾 이력서 저장 시도 - 이름: ${resumeData.applicant_name}`);
    const { data, error } = await getSupabase()
      .from('resumes')
      .insert([resumeData])
      .select();
    
    if (error) {
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
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    console.log(`[${new Date().toISOString()}]    쿼리 실행 중...`);
    const { data, error } = await query;
    
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
