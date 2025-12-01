import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드 (모듈 로드 시점에)
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log(`[${new Date().toISOString()}] ✅ Gemini 서비스 모듈 로드 완료`);

// 환경 변수에서 API 키 가져오기
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.warn(`[${new Date().toISOString()}] ⚠️ GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.`);
  console.warn(`[${new Date().toISOString()}]    현재 환경 변수: GEMINI_API_KEY=${process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET'}`);
} else {
  console.log(`[${new Date().toISOString()}] ✅ Gemini API 키 확인 완료 (${apiKey.substring(0, 10)}...)`);
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * 이력서를 검토하고 점수를 반환
 */
export async function reviewResume(resumeData, jobPostingMarkdown, resumeMarkdown = '') {
  if (!genAI) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. GEMINI_API_KEY 환경 변수를 설정하세요.');
  }

  try {
    console.log(`[${new Date().toISOString()}] 🤖 Gemini API를 사용한 이력서 검토 시작`);
    
    // Gemini 2.0 Flash 모델 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // 이력서 정보 구성
    let educationInfo = '없음';
    let careerInfo = '없음';
    try {
      if (resumeData.education) {
        const education = JSON.parse(resumeData.education);
        educationInfo = `${education.school || ''} ${education.major ? `(${education.major})` : ''} ${education.status || ''}`.trim() || '없음';
      }
      if (resumeData.career) {
        const career = JSON.parse(resumeData.career);
        careerInfo = `${career.company || ''} ${career.position ? `(${career.position})` : ''}`.trim() || '없음';
      }
    } catch (parseError) {
      console.warn(`[${new Date().toISOString()}] ⚠️ 이력서 JSON 파싱 실패 (무시): ${parseError.message}`);
    }
    
    const resumeMeta = `
이름: ${resumeData.applicant_name || '없음'}
이메일: ${resumeData.applicant_email || '없음'}
전화번호: ${resumeData.applicant_phone || '없음'}
학력요약: ${educationInfo}
경력요약: ${careerInfo}
지원일: ${resumeData.application_date || '없음'}
`;

    const MAX_RESUME_MD_LENGTH = 120000;
    const trimmedResumeMarkdown = (resumeMarkdown || '').slice(0, MAX_RESUME_MD_LENGTH);
    
    if (resumeMarkdown) {
      console.log(`[${new Date().toISOString()}] 📄 이력서 Markdown 제공 - 길이: ${resumeMarkdown.length}, 사용 길이: ${trimmedResumeMarkdown.length}`);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ 이력서 Markdown이 없어 기본 요약 정보만 전달`);
    }

    // 프롬프트 구성 (점수와 평가 결과 모두 요청)
    const prompt = `
다음은 채용 공고와 지원자 이력서(마크다운 전문)입니다. 두 문서를 정밀 비교하여 지원자의 적합도를 평가하세요.
특히 공고에서 요구하는 주요 업무, 기술 스택, 경력/학력 요건과 이력서 내용이 실제로 일치하는지 확인하고 일치/불일치 사항을 구체적으로 지적해주세요.

## 채용 공고 (Markdown)
${jobPostingMarkdown || '공고 정보 없음'}

## 지원자 기본 정보 (요약)
${resumeMeta}

## 지원자 이력서 전문 (Markdown)
${trimmedResumeMarkdown || '이력서 Markdown 전문을 사용할 수 없습니다. 위 기본 정보만 참고하세요.'}

위 정보를 바탕으로 지원자의 적합도를 평가하고 다음 형식으로 답변해주세요:

**평가 점수:** [0-100점 사이의 숫자]

**평가 결과:**
[1000자 정도의 상세한 평가 내용]

평가 기준:
1. 공고 요구사항과의 적합도
2. 경력 및 학력 수준
3. 전반적인 자격 요건 충족도
4. 강점 및 약점
5. 채용 추천 여부

추가 지시사항:
- 공고와 이력서의 특정 구절을 인용하여 일치 여부를 설명하세요.
- 이력서에 없는 정보를 추측하지 말고, 없으면 "확인 불가"라고 명시하세요.
- Markdown 형식을 유지하고, 불릿 포인트를 활용해 가독성을 높여주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // 점수 추출
    let score = null;
    const scoreMatch = text.match(/\*\*평가 점수:\*\*\s*(\d+)/i) || text.match(/평가 점수:\s*(\d+)/i) || text.match(/점수:\s*(\d+)/i) || text.match(/(\d+)점/);
    
    if (scoreMatch && scoreMatch[1]) {
      score = parseInt(scoreMatch[1], 10);
      // 0-100 범위로 제한
      if (score < 0) score = 0;
      if (score > 100) score = 100;
    } else {
      // 점수를 찾을 수 없으면 텍스트에서 첫 번째 숫자 추출
      const firstNumber = text.match(/\d+/);
      score = firstNumber ? parseInt(firstNumber[0], 10) : 50;
      if (score < 0) score = 0;
      if (score > 100) score = 100;
    }
    
    // 평가 결과 추출
    let reviewText = '';
    const reviewMatch = text.match(/\*\*평가 결과:\*\*\s*([\s\S]+)/i) || text.match(/평가 결과:\s*([\s\S]+)/i);
    
    if (reviewMatch && reviewMatch[1]) {
      reviewText = reviewMatch[1].trim();
    } else {
      // 평가 결과를 찾을 수 없으면 전체 텍스트 사용
      reviewText = text;
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 검토 완료 - 점수: ${score}점, 평가 결과 길이: ${reviewText.length}자`);
    
    return {
      success: true,
      score,
      review: reviewText,
      rawResponse: text
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Gemini API 검토 오류:`, error.message);
    throw error;
  }
}

/**
 * Gemini를 사용하여 채용공고 HTML에서 정보 추출 (정제된 HTML 전달)
 */
export async function extractJobPostingWithGemini(htmlContent, jobId) {
  if (!genAI) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. GEMINI_API_KEY 환경 변수를 설정하세요.');
  }

  try {
    console.log(`[${new Date().toISOString()}] 🤖 Gemini로 채용공고 분석 시작 - 공고번호: ${jobId}`);
    console.log(`[${new Date().toISOString()}]    원본 HTML 크기: ${htmlContent.length} bytes`);
    
    // Gemini 2.0 Flash 모델 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // HTML에서 채용공고 본문만 추출 (정규식 사용)
    let cleanedHtml = htmlContent;
    
    // 1. <script>, <style>, <nav>, <header>, <footer> 태그 제거
    cleanedHtml = cleanedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
    
    // 2. 광고 및 불필요한 요소 제거
    cleanedHtml = cleanedHtml.replace(/<div[^>]*class="[^"]*banner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<aside[\s\S]*?<\/aside>/gi, '');
    
    // 3. HTML을 적절한 크기로 제한 (Gemini 토큰 제한 고려)
    const maxHtmlLength = 100000; // 100KB
    const truncatedHtml = cleanedHtml.length > maxHtmlLength 
      ? cleanedHtml.substring(0, maxHtmlLength)
      : cleanedHtml;
    
    console.log(`[${new Date().toISOString()}]    정제된 HTML 크기: ${truncatedHtml.length} bytes`);
    
    const prompt = `
다음은 잡코리아 채용공고 페이지의 HTML입니다.
이 HTML에서 채용공고의 핵심 정보만 추출하여 깔끔한 Markdown 형식으로 정리해주세요.

HTML:
${truncatedHtml}

다음 형식으로 정리해주세요:

# [공고 제목]

**공고번호:** ${jobId}

## 모집요강
- **모집분야:** [분야명]
- **모집인원:** [인원]
- **고용형태:** [정규직/계약직 등]
- **급여:** [급여 정보]
- **근무시간:** [근무시간]
- **근무지:** [근무지 주소]

## 지원자격
- **경력:** [경력 요건]
- **학력:** [학력 요건]
- **기타 자격:** [기타 자격 요건]

## 주요업무
- [업무 내용 1]
- [업무 내용 2]
- [업무 내용 3]

## 우대사항
- [우대 사항 1]
- [우대 사항 2]

## 혜택 및 복지
- [복지 항목 1]
- [복지 항목 2]

## 채용 프로세스
- [프로세스 1]
- [프로세스 2]

## 기업 정보
- **기업명:** [회사명]
- **사원수:** [사원 수]
- **업종:** [업종]
- **기업 특징:** [특징]

중요 지시사항:
1. HTML에서 실제 채용공고 내용만 추출하세요.
2. 메뉴, 버튼, 광고, 링크 등의 UI 요소는 모두 제외하세요.
3. "로그인", "회원가입", "즉시지원", "공고등록" 같은 버튼 텍스트는 제외하세요.
4. "JOBKOREA", "잡코리아", "알바몬" 같은 사이트 관련 텍스트는 제외하세요.
5. 없는 섹션은 생략하세요.
6. 가능한 한 구체적이고 상세하게 작성하세요.
7. 모든 정보를 한글로 작성하세요.
8. 불릿 포인트로 깔끔하게 정리하세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdown = response.text().trim();
    
    console.log(`[${new Date().toISOString()}] ✅ Gemini 분석 완료 - Markdown 크기: ${markdown.length} bytes`);
    
    return {
      success: true,
      markdown,
      rawResponse: markdown
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Gemini 공고 분석 오류:`, error.message);
    return {
      success: false,
      markdown: null,
      error: error.message
    };
  }
}


