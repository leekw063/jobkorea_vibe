import { chromium } from 'playwright';
import { SELECTORS } from '../utils/selectors.js';
import { saveResume, saveJobPosting, getExistingResumes, getExistingJobPostings, getExistingResumeNumbers } from './supabaseService.js';
import { extractJobPostingWithGemini } from './geminiService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

console.log(`[${new Date().toISOString()}] ✅ Playwright 서비스 모듈 로드 완료`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PDF 및 Markdown 디렉토리 확인 및 생성
const pdfsDir = path.join(__dirname, '../../pdfs');
const markdownsDir = path.join(__dirname, '../../markdowns');

// 디렉토리 확인 플래그 (최초 1회만 확인)
let directoriesChecked = false;

async function ensureDirectories() {
  if (directoriesChecked) {
    return;
  }
  
  try {
    await fs.access(pdfsDir);
    console.log(`[${new Date().toISOString()}] 📁 PDF 디렉토리 확인 완료: ${pdfsDir}`);
  } catch (error) {
    await fs.mkdir(pdfsDir, { recursive: true });
    console.log(`[${new Date().toISOString()}] 📁 PDF 디렉토리 생성: ${pdfsDir}`);
  }
  
  try {
    await fs.access(markdownsDir);
    console.log(`[${new Date().toISOString()}] 📁 Markdown 디렉토리 확인 완료: ${markdownsDir}`);
  } catch (error) {
    await fs.mkdir(markdownsDir, { recursive: true });
    console.log(`[${new Date().toISOString()}] 📁 Markdown 디렉토리 생성: ${markdownsDir}`);
  }
  
  directoriesChecked = true;
}

/**
 * 이력서 수집 메인 함수
 */
export async function collectResumes() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 이력서 수집 프로세스 시작`);
  
  // 디렉토리 확인
  await ensureDirectories();
  
  console.log(`[${new Date().toISOString()}] 🌐 브라우저 시작 중...`);
  const browser = await chromium.launch({ headless: true });
  
  try {
    // Context 생성 (세션 공유를 위해)
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log(`[${new Date().toISOString()}] 📄 새 페이지 생성 완료`);
    
    // 1. 잡코리아 로그인
    await loginToJobKorea(page);
    
    // 2. 진행중인 공고 목록 수집
    const jobPostings = await collectJobPostings(page);
    console.log(`[${new Date().toISOString()}] 📋 진행중인 공고 ${jobPostings.length}개 발견`);
    
    // 3. 각 공고별 접수된 이력서 수집
    const allResumes = [];
    for (const jobPosting of jobPostings) {
      try {
        console.log(`[${new Date().toISOString()}] 🔄 공고 처리 시작 - ${jobPosting.title} (${jobPosting.id})`);
        const resumes = await collectResumesFromJobPosting(browser, page, jobPosting, context);
        allResumes.push(...resumes);
        console.log(`[${new Date().toISOString()}] ✅ 공고 처리 완료 - ${jobPosting.title}: ${resumes.length}개 이력서 수집`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ 공고 처리 중 오류 - ${jobPosting.title}:`, error.message);
        // Continue with next job posting
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] ✅ 이력서 수집 완료 - 공고: ${jobPostings.length}개, 이력서: ${allResumes.length}개 (소요시간: ${duration}초)`);
    
    return { 
      success: true, 
      jobPostingCount: jobPostings.length,
      count: allResumes.length, 
      resumes: allResumes 
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[${new Date().toISOString()}] ❌ 크롤링 오류 (소요시간: ${duration}초):`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    return { success: false, error: error.message, resumes: [] };
  } finally {
    console.log(`[${new Date().toISOString()}] 🔒 브라우저 종료 중...`);
    await browser.close();
  }
}

/**
 * 잡코리아 로그인
 */
async function loginToJobKorea(page) {
  try {
    console.log(`[${new Date().toISOString()}] 🌐 잡코리아 페이지 접속 중...`);
    await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log(`[${new Date().toISOString()}] ✅ 페이지 로드 완료`);
    
    console.log(`[${new Date().toISOString()}] 🔍 회사 탭 대기 중...`);
    await page.waitForSelector(SELECTORS.COMPANY_TAB, { timeout: 10000 });
    await page.click(SELECTORS.COMPANY_TAB);
    console.log(`[${new Date().toISOString()}] ✅ 회사 탭 클릭 완료`);
    
    console.log(`[${new Date().toISOString()}] 🔍 로그인 폼 대기 중...`);
    await page.waitForSelector(SELECTORS.ID_INPUT, { timeout: 10000 });
    
    const id = process.env.JOBKOREA_ID || 'markany';
    const password = process.env.JOBKOREA_PW || 'markany2018!';
    
    console.log(`[${new Date().toISOString()}] 🔐 로그인 정보 입력 중...`);
    await page.fill(SELECTORS.ID_INPUT, id);
    await page.fill(SELECTORS.PASSWORD_INPUT, password);
    
    console.log(`[${new Date().toISOString()}] 🔘 로그인 버튼 클릭 중...`);
    await page.click(SELECTORS.LOGIN_BUTTON);
    
    console.log(`[${new Date().toISOString()}] ⏳ 로그인 후 페이지 이동 대기 중...`);
    
    // 로그인 후 여러 가능한 URL 패턴 확인
    try {
      await page.waitForURL('**/Corp/GIMng/**', { timeout: 10000 });
      console.log(`[${new Date().toISOString()}] ✅ 로그인 완료 (URL: ${page.url()})`);
    } catch (urlError) {
      // URL 변경이 없어도 현재 URL이 올바른지 확인
      const currentUrl = page.url();
      console.log(`[${new Date().toISOString()}] ℹ️ 현재 URL: ${currentUrl}`);
      
      if (currentUrl.includes('jobkorea.co.kr') && !currentUrl.includes('Login')) {
        console.log(`[${new Date().toISOString()}] ✅ 로그인 완료 (URL 변경 없음, 이미 로그인된 상태일 수 있음)`);
      } else {
        // 로그인 페이지에 여전히 있는지 확인
        const isLoginPage = await page.locator(SELECTORS.ID_INPUT).count() > 0;
        if (isLoginPage) {
          throw new Error('로그인 실패: 로그인 페이지에 머물러 있습니다.');
        } else {
          console.log(`[${new Date().toISOString()}] ✅ 로그인 완료 (페이지 상태 확인)`);
        }
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 로그인 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw new Error(`로그인 실패: ${error.message}`);
  }
}

/**
 * 진행중인 공고 목록 수집 (XPath 기반으로 순차 클릭)
 */
async function collectJobPostings(page) {
  try {
    // 기존 공고 목록 조회 (중복 체크용)
    console.log(`[${new Date().toISOString()}] 🔍 기존 공고 목록 조회 중...`);
    const existingJobPostings = await getExistingJobPostings();
    const existingJobIds = new Set(existingJobPostings.map(jp => jp.job_posting_id));
    console.log(`[${new Date().toISOString()}]    기존 공고 ${existingJobIds.size}개 발견`);
    
    console.log(`[${new Date().toISOString()}] 🌐 진행중인 공고 목록 페이지 접속 중...`);
    await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List?PubType=1&SrchStat=1', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    console.log(`[${new Date().toISOString()}] ✅ 공고 목록 페이지 로드 완료`);
    
    console.log(`[${new Date().toISOString()}] 🔍 공고 리스트 컨테이너 대기 중...`);
    await page.waitForSelector('.rowWrap', { timeout: 5000 });
    
    // 공고 개수 확인
    const jobItems = await page.locator('.giListItem').all();
    const totalJobCount = jobItems.length;
    console.log(`[${new Date().toISOString()}] 📋 공고 항목 ${totalJobCount}개 발견`);
    
    const jobPostings = [];
    let skippedCount = 0;
    
    // 공고 항목별로 정보 추출 (CSS 셀렉터 사용)
    for (let i = 0; i < jobItems.length; i++) {
      try {
        const item = jobItems[i];
        console.log(`[${new Date().toISOString()}] 🔍 ${i + 1}/${totalJobCount}번째 공고 처리 중...`);
        
        // 공고명 추출 (여러 셀렉터 시도)
        let title = '';
        const titleSelectors = [
          '.jobTitWrap a.tit',
          '.jobTitWrap a',
          'a.tit',
          '.tit',
          'a[href*="GI_No"]'
        ];
        
        for (const selector of titleSelectors) {
          try {
            const titleEl = item.locator(selector).first();
            if (await titleEl.count() > 0) {
              const text = (await titleEl.innerText().catch(() => '')).trim();
              if (text && text !== '공고 보기' && text.length > 3) {
                title = text;
                break;
              }
            }
          } catch (e) {
            // 다음 셀렉터 시도
          }
        }
        
        if (!title) title = '제목 없음';
        
        // 공고번호 추출 (여러 방법 시도)
        let jobId = '';
        let jobIdSource = '';
        let resumeJobIdFromList = '';
        let resumeIdSource = '';
        
        // 방법 -1: 삭제 버튼의 data 속성에서 직접 추출
        try {
          const deleteBtn = await item.locator('button.devDelRecruitBtn').first();
          if (await deleteBtn.count() > 0) {
            const dataGno = (await deleteBtn.getAttribute('data-gno')) || '';
            const dataGino = (await deleteBtn.getAttribute('data-gino')) || '';
            if (dataGno && /^\d+$/.test(dataGno)) {
              jobId = dataGno.trim();
              jobIdSource = 'data-gno-button';
            }
            if (dataGino && /^\d+$/.test(dataGino)) {
              resumeJobIdFromList = dataGino.trim();
              resumeIdSource = 'data-gino-button';
            }
          }
        } catch (e) {
          console.warn(`[${new Date().toISOString()}]    ⚠️  삭제 버튼 data 속성 파싱 실패:`, e.message);
        }
        
        // 방법 0: 제공된 XPath 기반 span에서 직접 추출
        try {
          const spanXPath = `xpath=//*[@id="form"]/div/fieldset/div[2]/div[${i + 1}]/div/div[1]/span`;
          const spanLocator = page.locator(spanXPath);
          if (await spanLocator.count() > 0) {
            const spanText = (await spanLocator.innerText().catch(() => '')).trim();
            if (spanText) {
              const digitsOnly = spanText.replace(/[^\d]/g, '');
              if (digitsOnly.length >= 6) {
                jobId = digitsOnly;
                jobIdSource = 'span-xpath';
              }
            }
          }
        } catch (e) {
          console.warn(`[${new Date().toISOString()}]    ⚠️  XPath 기반 공고번호 추출 실패:`, e.message);
        }
        
        // 방법 1: item 내의 링크에서 GI_Read/GNo 우선 추출
        try {
          const allLinks = await item.locator('a').all();
          for (const link of allLinks) {
            const href = await link.getAttribute('href').catch(() => '');
            if (href) {
              // 1) /Recruit/GI_Read/{id}
              const giReadMatch = href.match(/GI_Read\/(\d+)/);
              if (giReadMatch && giReadMatch[1]) {
                jobId = giReadMatch[1];
                jobIdSource = 'GI_Read';
              }
              
              // 2) GNo 파라미터 (?GNo=123456)
              if (!jobId) {
                const gnoMatch = href.match(/[?&]GNo=(\d+)/);
                if (gnoMatch && gnoMatch[1]) {
                  jobId = gnoMatch[1];
                  jobIdSource = 'GNo';
                }
              }
              
              // 3) javascript 함수 호출 (예: GoRecruitView('48060904'))
              if (!jobId && href.includes('javascript')) {
                const jsMatch = href.match(/['"](\d{5,})['"]/);
                if (jsMatch && jsMatch[1]) {
                  jobId = jsMatch[1];
                  jobIdSource = 'javascript';
                }
              }
              
              // 4) GI_No는 이력서 번호이므로 마지막 수단으로만 사용
              if (!jobId) {
                const giNoMatch = href.match(/[?&]GI_No=(\d+)/);
                if (giNoMatch && giNoMatch[1]) {
                  jobId = giNoMatch[1];
                  jobIdSource = 'GI_No';
                }
              }
              
              if (jobId) {
                if (title === '제목 없음') {
                  const linkText = (await link.innerText().catch(() => '')).trim();
                  if (linkText && linkText !== '공고 보기' && linkText.length > 3) {
                    title = linkText;
                  }
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`[${new Date().toISOString()}]    ⚠️  링크에서 공고번호 추출 실패:`, e.message);
        }
        
        // 방법 2: 버튼의 data-gno 속성값
        if (!jobId) {
          try {
            const btnEl = item.locator("button[data-gno]").first();
            if (await btnEl.count() > 0) {
              jobId = (await btnEl.getAttribute('data-gno')) || '';
              jobIdSource = jobId ? 'data-gno' : jobIdSource;
            }
          } catch (e) {
            // 무시
          }
        }
        
        // 방법 3: DOM 내부 hidden/input 값 탐색
        if (!jobId) {
          try {
            jobId = await item.evaluate(el => {
              const selectors = [
                'input[name="gno"]',
                'input[name="Gno"]',
                'input[name="giNo"]',
                'input[name="GI_No"]',
                '[data-gno]'
              ];
              
              for (const sel of selectors) {
                const node = el.querySelector(sel);
                if (!node) continue;
                if (node.value && node.value.trim()) return node.value.trim();
                if (node.getAttribute && node.getAttribute('data-gno')) return node.getAttribute('data-gno');
              }
              
              // innerHTML에서 패턴 검색 (최후 수단)
              const html = el.innerHTML;
              const directMatch = html.match(/GI_Read\/(\d+)/);
              if (directMatch) return directMatch[1];
              const jsMatch = html.match(/Go[a-zA-Z]+\(['"](\d{5,})['"]/);
              if (jsMatch) return jsMatch[1];
              const gnoMatch = html.match(/[?&]GNo=(\d+)/);
              if (gnoMatch) return gnoMatch[1];
              return '';
            }) || '';
            if (jobId) jobIdSource = 'dom-search';
          } catch (e) {
            console.warn(`[${new Date().toISOString()}]    ⚠️  DOM 탐색으로 공고번호 추출 실패:`, e.message);
          }
        }
        
        // 방법 4: 순수 텍스트 노드에서 숫자만 있는 값 추출
        if (!jobId) {
          try {
            const textNodes = await item.evaluate(el => {
              const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                  if (!node.textContent) return NodeFilter.FILTER_REJECT;
                  const text = node.textContent.trim();
                  if (!text) return NodeFilter.FILTER_REJECT;
                  if (/^\d{6,}$/.test(text)) return NodeFilter.FILTER_ACCEPT;
                  return NodeFilter.FILTER_REJECT;
                }
              });
              const results = [];
              while (walker.nextNode()) results.push(walker.currentNode.textContent.trim());
              return results;
            });
            if (Array.isArray(textNodes) && textNodes.length > 0) {
              jobId = textNodes[0];
              jobIdSource = 'text-node';
            }
          } catch (e) {
            console.warn(`[${new Date().toISOString()}]    ⚠️  텍스트 노드에서 공고번호 추출 실패:`, e.message);
          }
        }
        
        if (jobIdSource === 'GI_No') {
          console.warn(`[${new Date().toISOString()}]    ⚠️  공고번호 추출에 실패하여 임시로 GI_No(${jobId})를 사용합니다.`);
          console.warn(`[${new Date().toISOString()}]       공고 상세 페이지에서 실제 공고번호를 다시 확인하세요.`);
        }
        
        console.log(`[${new Date().toISOString()}]    📝 공고명: ${title}`);
        console.log(`[${new Date().toISOString()}]    🔢 공고번호: ${jobId}`);
        
        if (!title || !jobId) {
          console.warn(`[${new Date().toISOString()}]    ⚠️  공고 정보 불완전 - 건너뛰기`);
          continue;
        }
        
        const trimmedJobId = jobId.trim();
        
        // 공고 상세 정보가 이미 있는지 확인
        const isExistingJob = existingJobIds.has(trimmedJobId);
        
        if (isExistingJob) {
          console.log(`[${new Date().toISOString()}]    ℹ️  공고 상세 정보 이미 있음 - 공고번호: ${trimmedJobId}`);
          console.log(`[${new Date().toISOString()}]    📝 이력서 접수 번호만 추출하여 이력서 수집 진행`);
        }
        
        // 먼저 일반 공고 상세 페이지로 이동하여 실제 이력서 접수 번호 추출
        const detailUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read/${trimmedJobId}?Oem_Code=C1`;
        console.log(`[${new Date().toISOString()}]    🌐 공고 상세 페이지로 이동 (이력서 번호 추출용): ${detailUrl}`);
        
        await page.goto(detailUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await page.waitForTimeout(1500);
        
        // 실제 이력서 접수 번호 추출 (GI_No와 다를 수 있음)
        let actualResumeJobId = trimmedJobId;
        try {
          // "접수 이력서 보기" 또는 "지원자 목록" 링크에서 실제 번호 추출
          const resumeLinks = await page.locator('a[href*="Applicant/list"]').all();
          for (const link of resumeLinks) {
            const href = await link.getAttribute('href').catch(() => '');
            if (href && href.includes('GI_No=')) {
              const match = href.match(/GI_No=(\d+)/);
              if (match && match[1]) {
                actualResumeJobId = match[1];
                if (actualResumeJobId !== trimmedJobId) {
                  console.log(`[${new Date().toISOString()}]    🔍 실제 이력서 접수 번호: ${actualResumeJobId}`);
                  console.log(`[${new Date().toISOString()}]       (공고 목록 번호: ${trimmedJobId} - 불일치 감지!)`);
                } else {
                  console.log(`[${new Date().toISOString()}]    ✅ 공고번호와 이력서 접수 번호 일치: ${actualResumeJobId}`);
                }
                break;
              }
            }
          }
        } catch (e) {
          console.log(`[${new Date().toISOString()}]    ℹ️  이력서 접수 번호 추출 실패, 공고번호 사용: ${trimmedJobId}`);
        }
        
        // 공고 상세 정보가 없으면 추출 및 저장
        if (!isExistingJob) {
          // iframe URL로 이동하여 본문 추출 (광고/메뉴 없음)
          const iframeUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Oem_Code=C1&Gno=${trimmedJobId}`;
          console.log(`[${new Date().toISOString()}]    🌐 공고 본문 페이지로 이동 (iframe): ${iframeUrl}`);
          
          await page.goto(iframeUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          await page.waitForTimeout(1500);
          
          // 현재 페이지에서 공고 상세 정보 추출
          const result = await extractJobPostingDetailFromCurrentPage(page, trimmedJobId, title);
          
          // HTML 전체 가져오기
          const htmlContent = await page.content();
          
          // PDF에서 추출한 정보를 JSON으로 구조화
          const jobDetail = extractJobDetailFromMarkdown(result.markdown, title);
          
          // DB에 저장
          const dbData = {
            job_posting_id: trimmedJobId,
            job_posting_title: title,
            job_detail: jobDetail, // JSON 구조화된 데이터
            job_detail_md: result.markdown || null,
            job_detail_html: htmlContent || null
          };
          
          await saveJobPosting(dbData);
          
          if (result.success) {
            console.log(`[${new Date().toISOString()}]    ✅ 공고 상세 정보 저장 완료 - ${trimmedJobId}`);
          } else {
            console.log(`[${new Date().toISOString()}]    ⚠️  공고 기본 정보만 저장 - ${trimmedJobId}`);
          }
        } else {
          skippedCount++;
        }
        
        // 이력서 수집을 위해 공고 정보를 jobPostings 배열에 추가
        jobPostings.push({
          title,
          id: trimmedJobId,
          actualResumeJobId: resumeJobIdFromList || actualResumeJobId // 우선순위: 리스트에서 추출한 값
        });
        
        // 다음 공고를 위해 목록 페이지로 돌아가기 (마지막 공고가 아닌 경우 항상)
        if (i < jobItems.length - 1) {
          console.log(`[${new Date().toISOString()}]    🔙 공고 목록으로 돌아가는 중...`);
          await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List?PubType=1&SrchStat=1', {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          });
          await page.waitForSelector('.rowWrap', { timeout: 5000 });
          await page.waitForTimeout(500);
          
          // jobItems 갱신
          const updatedItems = await page.locator('.giListItem').all();
          if (updatedItems.length > 0) {
            jobItems.splice(0, jobItems.length, ...updatedItems);
          }
        }
        
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ 공고 추출 중 오류:`, error.message);
      }
    }
    
    const newJobCount = jobPostings.length - skippedCount;
    console.log(`[${new Date().toISOString()}] ✅ 공고 목록 수집 완료 - 전체: ${jobPostings.length}개 (신규: ${newJobCount}개, 기존: ${skippedCount}개)`);
    return jobPostings;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 공고 목록 수집 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    return [];
  }
}

/**
 * 현재 페이지(공고 상세 페이지)에서 공고 상세 정보를 추출
 * Gemini AI를 사용하여 HTML에서 정보 추출
 */
async function extractJobPostingDetailFromCurrentPage(page, jobId, title) {
  try {
    console.log(`[${new Date().toISOString()}]    🔍 공고 상세 정보 추출 중 (iframe 본문 페이지) - ${jobId}`);
    
    // 페이지 로드 대기
    await page.waitForTimeout(1000);
    
    // iframe URL은 이미 본문만 포함하므로 전체 HTML을 가져와도 됨
    const jobPostingHtml = await page.content();
    console.log(`[${new Date().toISOString()}]    📄 iframe HTML 크기: ${jobPostingHtml.length} bytes`);
    
    // 2. 정제된 HTML 구성 (다운로드 방식 참고)
    const cleanHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; 
      padding: 20px; 
      line-height: 1.8;
      max-width: 1000px;
      margin: 0 auto;
    }
    h1, h2, h3 { 
      border-bottom: 2px solid #333; 
      padding-bottom: 10px; 
      margin-top: 30px;
    }
    ul, ol { padding-left: 20px; }
    li { margin: 8px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f4f4f4; font-weight: bold; }
    
    /* 불필요한 요소 숨기기 */
    nav, header, footer, aside,
    .gnb, .lnb, .snb, .header, .footer,
    .banner, .ad, .advertisement,
    .sidebar, .related, .recommend,
    button, .btn, .button,
    .login, .register, .share,
    .social, .kakao, .facebook,
    script, style, iframe
    { display: none !important; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p><strong>공고번호:</strong> ${jobId}</p>
  <hr>
  ${jobPostingHtml}
</body>
</html>
    `.trim();
    
    console.log(`[${new Date().toISOString()}]    📄 정제된 HTML 크기: ${cleanHtml.length} bytes`);
    
    // 3. Cheerio로 Markdown 변환
    const cheerioMarkdown = extractJobPostingWithCheerio(cleanHtml, jobId, title);
    
    if (cheerioMarkdown && cheerioMarkdown.length > 200) {
      console.log(`[${new Date().toISOString()}]    ✅ Cheerio 추출 완료 - Markdown 크기: ${cheerioMarkdown.length} bytes`);
      
      // 4. HTML 파일로 저장 (백업용)
      try {
        const htmlPath = path.join(pdfsDir, `job_${jobId}.html`);
        await fs.writeFile(htmlPath, cleanHtml, 'utf-8');
        console.log(`[${new Date().toISOString()}]    ✅ HTML 백업 저장: ${htmlPath}`);
      } catch (htmlErr) {
        console.log(`[${new Date().toISOString()}]    ⚠️  HTML 백업 실패 (무시): ${htmlErr.message}`);
      }
      
      return {
        success: true,
        markdown: cheerioMarkdown
      };
    }
    
    // 5. Cheerio 실패 시 Gemini 시도
    console.log(`[${new Date().toISOString()}]    ⚠️  Cheerio 추출 부족, Gemini 시도 - ${jobId}`);
    const geminiResult = await extractJobPostingWithGemini(cleanHtml, jobId);
    
    if (geminiResult.success && geminiResult.markdown && geminiResult.markdown.length > 200) {
      console.log(`[${new Date().toISOString()}]    ✅ Gemini 추출 완료 - Markdown 크기: ${geminiResult.markdown.length} bytes`);
      
      return {
        success: true,
        markdown: geminiResult.markdown
      };
    }
    
    // 6. 최종 Fallback: 간단한 텍스트 추출
    console.warn(`[${new Date().toISOString()}]    ⚠️  모든 추출 실패, 기본 텍스트 사용 - ${jobId}`);
    const $ = cheerio.load(cleanHtml);
    $('script, style, nav, header, footer, aside, button').remove();
    const bodyText = $('body').text().trim();
    const fallbackMarkdown = `# ${title}\n\n**공고번호:** ${jobId}\n\n## 공고 내용\n\n${bodyText.substring(0, 2000)}`;
    
    return {
      success: false,
      markdown: fallbackMarkdown,
      error: 'All extraction methods failed',
      usedFallback: true
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}]    ❌ 공고 상세 정보 추출 오류 - ${jobId}:`, error.message);
    return {
      success: false,
      markdown: null,
      error: error.message
    };
  }
}

/**
 * PDF에서 추출한 텍스트를 구조화된 Markdown으로 변환
 */
function convertPdfTextToMarkdown(pdfText, jobId, title) {
  try {
    // 텍스트 정제
    let cleanText = pdfText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // 불필요한 텍스트 제거
    const linesToRemove = [
      'JOBKOREA',
      '잡코리아',
      '로그인',
      '회원가입',
      '즉시지원',
      '고객센터',
      '알바몬',
      '게임잡',
      '나인하이어',
      '클릭',
      '메뉴',
      '검색'
    ];
    
    const lines = cleanText.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !linesToRemove.some(remove => trimmed.includes(remove));
    });
    
    // 섹션 키워드
    const sectionKeywords = [
      '모집요강',
      '모집분야',
      '모집인원',
      '고용형태',
      '급여',
      '근무시간',
      '근무지',
      '지원자격',
      '경력',
      '학력',
      '주요업무',
      '담당업무',
      '우대사항',
      '우대조건',
      '혜택',
      '복지',
      '채용 프로세스',
      '채용프로세스',
      '근무환경',
      '기업정보',
      '기업 정보'
    ];
    
    // Markdown 생성
    let markdown = `# ${title}\n\n**공고번호:** ${jobId}\n\n`;
    let currentSection = null;
    let sectionContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 섹션 헤더 확인
      let foundSection = null;
      for (const keyword of sectionKeywords) {
        if (line === keyword || (line.includes(keyword) && line.length < keyword.length + 10)) {
          foundSection = keyword;
          break;
        }
      }
      
      if (foundSection) {
        // 이전 섹션 저장
        if (currentSection && sectionContent.length > 0) {
          markdown += `## ${currentSection}\n\n`;
          sectionContent.forEach(content => {
            markdown += `- ${content}\n`;
          });
          markdown += '\n';
        }
        
        // 새 섹션 시작
        currentSection = foundSection;
        sectionContent = [];
      } else if (currentSection && line.length >= 5 && line.length < 500) {
        // 현재 섹션에 내용 추가
        const cleanLine = line
          .replace(/^[•·◦▪▫-]\s*/, '')
          .replace(/ㆍ/g, '')
          .trim();
        
        if (cleanLine && !sectionContent.includes(cleanLine)) {
          sectionContent.push(cleanLine);
        }
      }
    }
    
    // 마지막 섹션 저장
    if (currentSection && sectionContent.length > 0) {
      markdown += `## ${currentSection}\n\n`;
      sectionContent.forEach(content => {
        markdown += `- ${content}\n`;
      });
      markdown += '\n';
    }
    
    // 섹션이 없으면 전체 텍스트를 그대로 사용
    if (markdown.split('\n').length < 10) {
      markdown = `# ${title}\n\n**공고번호:** ${jobId}\n\n## 공고 내용\n\n`;
      lines.slice(0, 100).forEach(line => {
        if (line.trim().length > 5) {
          markdown += `${line.trim()}\n\n`;
        }
      });
    }
    
    return markdown.trim();
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}]    ❌ Markdown 변환 오류:`, error.message);
    return `# ${title}\n\n**공고번호:** ${jobId}\n\n## 공고 내용\n\n${pdfText.substring(0, 2000)}`;
  }
}

/**
 * Markdown에서 구조화된 JSON 데이터 추출
 */
function extractJobDetailFromMarkdown(markdown, title) {
  try {
    if (!markdown) {
      return {
        title: title || "제목 없음",
        sections: {}
      };
    }
    
    const jobDetail = {
      title: title || "제목 없음",
      sections: {}
    };
    
    // Markdown을 줄 단위로 분리
    const lines = markdown.split('\n');
    let currentSection = null;
    let currentContent = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 섹션 헤더 (## 으로 시작)
      if (trimmed.startsWith('## ')) {
        // 이전 섹션 저장
        if (currentSection && currentContent.length > 0) {
          jobDetail.sections[currentSection] = currentContent;
        }
        
        // 새 섹션 시작
        currentSection = trimmed.replace('## ', '').trim();
        currentContent = [];
      }
      // 불릿 포인트 (- 로 시작)
      else if (trimmed.startsWith('- ') && currentSection) {
        const content = trimmed.replace('- ', '').trim();
        if (content && content !== '**공고번호:**') {
          currentContent.push(content);
        }
      }
      // 키-값 쌍 (**키:** 값)
      else if (trimmed.includes('**') && trimmed.includes(':**') && currentSection) {
        const content = trimmed.replace(/\*\*/g, '').trim();
        currentContent.push(content);
      }
    }
    
    // 마지막 섹션 저장
    if (currentSection && currentContent.length > 0) {
      jobDetail.sections[currentSection] = currentContent;
    }
    
    return jobDetail;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ JSON 추출 오류:`, error.message);
    return {
      title: title || "제목 없음",
      sections: {},
      error: error.message
    };
  }
}

/**
 * Cheerio를 사용한 Beautiful Soup 스타일 추출
 * (채용공고 본문만 정확하게 추출)
 */
function extractJobPostingWithCheerio(htmlContent, jobId, fallbackTitle) {
  try {
    const $ = cheerio.load(htmlContent);
    
    // 1. 채용공고 본문 영역만 선택 (.detailed-summary-header 또는 유사 영역)
    const mainSelectors = [
      '.detailed-summary-header',
      '.wrap-recruit-view',
      '.section-recruit',
      '.detail-info',
      '.job-detail',
      '#content',
      'main'
    ];
    
    let $main = null;
    for (const selector of mainSelectors) {
      const elem = $(selector);
      if (elem.length > 0) {
        $main = elem;
        console.log(`[${new Date().toISOString()}]    📍 본문 영역 발견: ${selector}`);
        break;
      }
    }
    
    // 본문 영역을 찾지 못하면 body 사용 (하지만 필터링 강화)
    if (!$main || $main.length === 0) {
      $main = $('body');
      console.log(`[${new Date().toISOString()}]    ⚠️  본문 영역 미발견, body 사용`);
    }
    
    // 불필요한 요소 완전 제거
    $main.find('script, style, nav, header, footer, aside, iframe').remove();
    $main.find('.gnb, .lnb, .header, .footer, .sidebar').remove();
    $main.find('.banner, .ad, .advertisement, .recommend').remove();
    $main.find('button, .btn, .button, .share, .social').remove();
    
    // 2. 제목 추출
    let title = fallbackTitle || "제목 없음";
    
    // 제목 우선순위: span(18pt) > h1 > h2 > .tit
    $main.find('span').each((i, elem) => {
      const style = $(elem).attr('style');
      if (style && (style.includes('18pt') || style.includes('20pt') || style.includes('22pt'))) {
        const text = $(elem).text().trim();
        if (text && text.length > 5 && !text.includes('잡코리아')) {
          title = text;
          return false;
        }
      }
    });
    
    if (title === fallbackTitle || title === "제목 없음") {
      const h1 = $main.find('h1').first().text().trim();
      const h2 = $main.find('h2').first().text().trim();
      const titClass = $main.find('.tit, .title, .job-title').first().text().trim();
      
      if (h1 && h1.length > 5) title = h1;
      else if (h2 && h2.length > 5) title = h2;
      else if (titClass && titClass.length > 5) title = titClass;
    }
    
    // 3. 섹션별 키워드 정의
    const sections = {
      "모집요강": [],
      "모집분야": [],
      "주요업무": [],
      "담당업무": [],
      "지원자격": [],
      "자격요건": [],
      "우대사항": [],
      "우대조건": [],
      "채용 프로세스": [],
      "혜택 및 복지": [],
      "근무환경": [],
      "기업정보": []
    };
    
    let currentSection = null;
    const processedTexts = new Set();
    
    // 4. 텍스트 순회 및 추출 (본문 영역 내에서만)
    $main.find('p, li, h2, h3, h4, dt, dd, span, div').each((i, elem) => {
      const $elem = $(elem);
      
      // 너무 깊은 중첩은 건너뛰기 (광고 등)
      if ($elem.parents().length > 20) return;
      
      const text = $elem.text().trim();
      
      // 빈 줄 건너뛰기
      if (!text || text.length < 3) return;
      
      // 강화된 블랙리스트
      const blacklist = [
        '즉시지원', '로그인', '회원가입', '잡코리아', 'JOBKOREA',
        '마감일', '채용정보', '추천공고', '지원자', '합격축하금',
        '톡톡상담', 'FAX', 'Email', 'helpdesk', '고객센터',
        '알바몬', '게임잡', '나인하이어', '클릭', '메뉴', '검색',
        '평균연봉', '만원 이상', '신입 적극', '대기업 계열사',
        '인기 급상승', '커리어의 시작', '안정적인', '첨단산업',
        '코스닥', '슈퍼 기업', 'NEW JOB', '취업캠프', '국비무료',
        '설문조사', '브랜드파워', '고용서비스', '사업자등록번호',
        '통신판매업', '직업정보제공', '유료직업소개업'
      ];
      
      const hasBlacklist = blacklist.some(word => text.includes(word));
      if (hasBlacklist) return;
      
      // 너무 긴 텍스트는 광고일 가능성 (단, dt/dd는 예외)
      const tagName = elem.tagName.toLowerCase();
      if (text.length > 300 && tagName !== 'dt' && tagName !== 'dd') return;
      
      // 섹션 헤더인지 확인
      let isHeader = false;
      for (const key of Object.keys(sections)) {
        if (text === key || (text.includes(key) && text.length < key.length + 15)) {
          currentSection = key;
          isHeader = true;
          break;
        }
      }
      
      if (isHeader) return;
      
      // 현재 섹션에 내용 추가
      if (currentSection && text.length >= 5 && text.length < 500) {
        const cleanText = text
          .replace(/ㆍ/g, '')
          .replace(/•/g, '')
          .replace(/·/g, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // 중복 체크 및 유효성 검증
        if (cleanText && 
            cleanText.length >= 5 &&
            !processedTexts.has(cleanText) &&
            !cleanText.match(/^\d+$/) && // 숫자만 있는 것 제외
            !cleanText.match(/^[\W]+$/)  // 특수문자만 있는 것 제외
        ) {
          processedTexts.add(cleanText);
          sections[currentSection].push(cleanText);
        }
      }
    });
    
    // 5. Markdown 생성
    let markdown = `# ${title}\n\n**공고번호:** ${jobId}\n\n`;
    
    // 섹션 추가
    let hasContent = false;
    for (const [sectionName, items] of Object.entries(sections)) {
      if (items.length > 0) {
        hasContent = true;
        markdown += `## ${sectionName}\n\n`;
        items.slice(0, 20).forEach(item => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }
    }
    
    if (!hasContent) {
      console.log(`[${new Date().toISOString()}]    ⚠️  Cheerio: 섹션 내용 없음 - ${jobId}`);
      return null;
    }
    
    const sectionCount = Object.keys(sections).filter(k => sections[k].length > 0).length;
    console.log(`[${new Date().toISOString()}]    ✅ Cheerio 추출 성공 - ${sectionCount}개 섹션, ${processedTexts.size}개 항목`);
    return markdown.trim();
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}]    ❌ Cheerio 추출 오류:`, error.message);
    return null;
  }
}

/**
 * 공고 상세 정보를 Markdown 형식으로 추출하여 저장 (Python 코드 참고)
 * (이력서 검토 시 공고 정보가 없을 때 사용 - 새 탭에서 추출)
 */
async function extractJobPostingMarkdownForStorage(page, jobId, title) {
  try {
    // 공고 상세 페이지 URL (Oem_Code 추가)
    const detailUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read/${jobId}?Oem_Code=C1`;
    
    // 새 탭에서 공고 상세 페이지 열기
    const context = page.context();
    const detailPage = await context.newPage();
    
    try {
      await detailPage.goto(detailUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      // 페이지 로드 대기
      await detailPage.waitForTimeout(1500);
      
      // HTML 내용 가져오기
      const htmlContent = await detailPage.content();
      const $ = cheerio.load(htmlContent);
      
      // ===== 1. 제목 추출 (개선) =====
      let extractedTitle = title || "제목 없음";
      
      // 방법 1: 큰 폰트의 span 태그
      $('span').each((i, elem) => {
        const style = $(elem).attr('style');
        if (style && (style.includes('18pt') || style.includes('20pt'))) {
          const text = $(elem).text().trim();
          if (text && text.length > 5) {
            extractedTitle = text;
            return false;
          }
        }
      });
      
      // 방법 2: h1, h2 태그
      if (extractedTitle === title || extractedTitle === "제목 없음") {
        const h1Text = $('h1').first().text().trim();
        const h2Text = $('h2').first().text().trim();
        if (h1Text && h1Text.length > 5) extractedTitle = h1Text;
        else if (h2Text && h2Text.length > 5) extractedTitle = h2Text;
      }
      
      // ===== 2. 모집요강 정보 추출 =====
      const recruitInfo = {};
      
      $('dt').each((i, elem) => {
        const label = $(elem).text().trim();
        const value = $(elem).next('dd').text().trim();
        
        if (label && value) {
          recruitInfo[label] = value;
        }
      });
      
      // ===== 3. 주요 섹션 정보 추출 (개선) =====
      const sections = {
        "주요업무": [],
        "담당업무": [],
        "지원자격": [],
        "자격요건": [],
        "우대사항": [],
        "우대조건": [],
        "이런 분이라면 잘 맞아요": [],
        "채용 프로세스": [],
        "혜택 및 복지": [],
        "근무환경": []
      };
      
      let currentSection = null;
      const processedTexts = new Set();
      
      // 모집요강 영역만 선택적으로 추출
      const recruitArea = $('.wrap-recruit-view, .section-recruit, .detail-info, .job-detail').html();
      
      if (recruitArea) {
        const $recruit = cheerio.load(recruitArea);
        
        // 모든 텍스트 요소를 순회
        $recruit('p, li, h2, h3, h4').each((i, elem) => {
          const text = $recruit(elem).text().trim();
          
          if (!text || text.length < 5) return;
          
          // 불필요한 텍스트 필터링
          const blacklist = [
            '즉시지원', '로그인', '회원가입', '잡코리아', 'JOBKOREA', 
            '마감일', '채용정보', '추천공고', '지원자', '합격축하금',
            '톡톡상담', 'FAX', 'Email', 'helpdesk', '고객센터'
          ];
          
          const hasBlacklist = blacklist.some(word => text.includes(word));
          if (hasBlacklist) return;
          
          // 섹션 헤더 확인
          let isHeader = false;
          for (const key of Object.keys(sections)) {
            if (text === key || (text.includes(key) && text.length < key.length + 10)) {
              currentSection = key;
              isHeader = true;
              break;
            }
          }
          
          if (isHeader) return;
          
          // 현재 섹션에 내용 추가
          if (currentSection && text.length >= 10 && text.length < 300) {
            const cleanText = text
              .replace(/ㆍ/g, '')
              .replace(/•/g, '')
              .replace(/\n+/g, ' ')
              .trim();
            
            if (cleanText && !processedTexts.has(cleanText)) {
              processedTexts.add(cleanText);
              sections[currentSection].push(cleanText);
            }
          }
        });
      }
      
      // ===== 4. Markdown 생성 =====
      let markdown = `# ${extractedTitle}\n\n**공고번호:** ${jobId}\n\n`;
      
      // 모집요강 추가
      if (Object.keys(recruitInfo).length > 0) {
        markdown += `## 모집요강\n\n`;
        for (const [key, value] of Object.entries(recruitInfo)) {
          markdown += `**${key}:** ${value}\n\n`;
        }
      }
      
      // 주요 섹션 추가
      let hasContent = false;
      for (const [sectionName, items] of Object.entries(sections)) {
        if (items.length > 0) {
          hasContent = true;
          markdown += `## ${sectionName}\n\n`;
          const uniqueItems = [...new Set(items)];
          for (const item of uniqueItems.slice(0, 15)) {
            markdown += `- ${item}\n`;
          }
          markdown += `\n`;
        }
      }
      
      // 섹션이 비어있으면 전체 내용 추출
      if (!hasContent) {
        const selectors = [
          '.wrap-recruit-view .view-content',
          '.recruit-content',
          '.job-description',
          '.content-wrap',
          'article',
          '.description'
        ];
        
        for (const selector of selectors) {
          const content = $(selector).text().trim();
          if (content && content.length > 100) {
            markdown += `## 공고 내용\n\n${content.substring(0, 1500)}...\n`;
            break;
          }
        }
      }
      
      return {
        success: true,
        markdown: markdown.trim()
      };
    } finally {
      // 상세 페이지 닫기
      await detailPage.close();
    }
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] ⚠️ 공고 상세 정보 추출 오류 (공고번호: ${jobId}):`, error.message);
    return {
      success: false,
      markdown: null
    };
  }
}

/**
 * 공고 상세 정보 추출 (Python 코드 참고) - 기존 함수 (사용 안 함)
 */
async function extractJobPostingDetail(page, jobId) {
  try {
    // 공고 상세 페이지 URL (잡코리아 공고 상세 페이지)
    const detailUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read/${jobId}`;
    
    // 새 탭에서 공고 상세 페이지 열기 (현재 페이지 컨텍스트 유지)
    const context = page.context();
    const detailPage = await context.newPage();
    
    try {
      await detailPage.goto(detailUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      // HTML 내용 가져오기
      const htmlContent = await detailPage.content();
      
      // HTML을 파싱하여 정보 추출
      const sections = {
        "주요업무": [],
        "지원자격": [],
        "우대사항": [],
        "이런 분이라면 잘 맞아요": [],
        "채용 프로세스": []
      };
      
      let currentSection = null;
      
      // 제목 추출: span 태그에서 style에 '18pt'가 포함된 것
      let title = "제목 없음";
      try {
        const titleElement = await detailPage.locator('span[style*="18pt"]').first();
        if (await titleElement.count() > 0) {
          title = (await titleElement.innerText()).trim();
        }
      } catch (e) {
        // 제목 추출 실패 시 무시
      }
      
      // p, li, h2 태그를 순회하면서 섹션별 내용 추출
      const elements = await detailPage.locator('p, li, h2').all();
      
      for (const element of elements) {
        try {
          const text = (await element.innerText()).trim();
          
          // 빈 줄 건너뛰기
          if (!text) continue;
          
          // 섹션 헤더인지 확인
          let isHeader = false;
          for (const key of Object.keys(sections)) {
            if (text.includes(key)) {
              currentSection = key;
              isHeader = true;
              break;
            }
          }
          
          if (isHeader) continue;
          
          // 현재 섹션에 내용 추가 (불렛 기호 등 특수문자 제거)
          if (currentSection) {
            const cleanText = text.replace(/ㆍ/g, '').trim();
            if (cleanText) {
              sections[currentSection].push(cleanText);
            }
          }
        } catch (e) {
          // 개별 요소 처리 실패 시 무시하고 계속
          continue;
        }
      }
      
      // 결과 반환
      return {
        title,
        sections
      };
    } finally {
      // 상세 페이지 닫기
      await detailPage.close();
    }
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] ⚠️ 공고 상세 정보 추출 오류 (공고번호: ${jobId}):`, error.message);
    return null;
  }
}

/**
 * 각 공고별 접수된 이력서 수집 (중복 제외)
 */
async function collectResumesFromJobPosting(browser, page, jobPosting, context) {
  try {
    // Pass_R_No 기반 중복 체크
    console.log(`[${new Date().toISOString()}] 🔍 중복 체크를 위한 기존 이력서 번호 조회 중...`);
    const existingResumeNumbers = await getExistingResumeNumbers(jobPosting.id);
    console.log(`[${new Date().toISOString()}]    기존 이력서 번호 ${existingResumeNumbers.size}개 발견`);
    
    // 이력서 목록 페이지로 이동 (실제 이력서 접수 번호 사용)
    const jobId = jobPosting.actualResumeJobId || jobPosting.id;
    const applicantListUrl = `https://www.jobkorea.co.kr/Corp/Applicant/list?GI_No=${jobId}&PageCode=YA`;
    console.log(`[${new Date().toISOString()}] 🌐 이력서 목록 페이지 접속 중`);
    console.log(`[${new Date().toISOString()}]    공고 제목: ${jobPosting.title}`);
    console.log(`[${new Date().toISOString()}]    공고 목록 번호: ${jobPosting.id}`);
    if (jobPosting.actualResumeJobId && jobPosting.actualResumeJobId !== jobPosting.id) {
      console.log(`[${new Date().toISOString()}]    📌 실제 이력서 접수 번호: ${jobPosting.actualResumeJobId} (사용됨)`);
    } else {
      console.log(`[${new Date().toISOString()}]    📌 이력서 접수 번호: ${jobId}`);
    }
    console.log(`[${new Date().toISOString()}]    URL: ${applicantListUrl}`);
    
    await page.goto(applicantListUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const actualUrl = page.url();
    console.log(`[${new Date().toISOString()}] ✅ 이력서 목록 페이지 로드 완료 - 현재 URL: ${actualUrl}`);
    
    // URL에서 실제 공고번호 추출 및 검증
    const urlGiNoMatch = actualUrl.match(/[?&]GI_No=(\d+)/);
    let actualJobId = jobId; // 이미 actualResumeJobId를 사용 중
    
    if (urlGiNoMatch && urlGiNoMatch[1]) {
      actualJobId = urlGiNoMatch[1];
      if (actualJobId !== jobId) {
        console.warn(`[${new Date().toISOString()}] ⚠️ URL 리다이렉션 감지!`);
        console.warn(`[${new Date().toISOString()}]    요청한 번호: ${jobId}`);
        console.warn(`[${new Date().toISOString()}]    실제 URL의 번호: ${actualJobId}`);
      } else {
        console.log(`[${new Date().toISOString()}] ✅ 이력서 접수 번호 확인: ${actualJobId}`);
      }
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ URL에서 공고번호를 추출할 수 없습니다. 요청 번호 사용: ${jobId}`);
    }
    
    // 페이지 구조 확인을 위한 대기
    await page.waitForTimeout(2000);
    
    // "100개씩 보기" 버튼 클릭
    try {
      console.log(`[${new Date().toISOString()}] 🔍 "100개씩 보기" 버튼 찾는 중...`);
      
      // "10개씩 보기" 버튼 클릭 (드롭다운 열기)
      const sortButton = page.locator('button.sort-button.sort3');
      const sortButtonCount = await sortButton.count();
      
      if (sortButtonCount > 0) {
        console.log(`[${new Date().toISOString()}] 🖱️ "10개씩 보기" 버튼 클릭...`);
        await sortButton.click();
        await page.waitForTimeout(1000);
        
        // "100개" 옵션 클릭
        const listTopCountBtn = page.locator('button.ListTopCountBtn[value="100"]');
        const btnCount = await listTopCountBtn.count();
        
        if (btnCount > 0) {
          console.log(`[${new Date().toISOString()}] 🖱️ "100개" 버튼 클릭...`);
          await listTopCountBtn.click();
          
          // 페이지 리로드 대기
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          await page.waitForTimeout(2000);
          
          console.log(`[${new Date().toISOString()}] ✅ 100개씩 보기 설정 완료`);
        } else {
          console.log(`[${new Date().toISOString()}] ⚠️ "100개" 버튼을 찾을 수 없습니다.`);
        }
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ "10개씩 보기" 버튼을 찾을 수 없습니다.`);
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ "100개씩 보기" 버튼 클릭 실패:`, error.message);
      console.log(`[${new Date().toISOString()}]    계속 진행합니다...`);
    }
    
    // 이력서 테이블이 있는지 확인
    const tableSelector = 'table, .applicant-list-section, .list-table, tbody';
    const tableExists = await page.locator(tableSelector).first().count().catch(() => 0);
    console.log(`[${new Date().toISOString()}] 🔍 테이블 요소 확인: ${tableExists > 0 ? '발견' : '없음'}`);
    
    // 테이블의 전체 행 수 확인 (헤더 제외)
    const allRows = await page.locator('table tbody tr').all();
    const totalRows = allRows.length;
    console.log(`[${new Date().toISOString()}] 📊 테이블 전체 행 수: ${totalRows}개`);
    
    // 여러 선택자 패턴 시도 (이력서 링크만 선택)
    const possibleSelectors = [
      `#container > div.applicant-list-section > div > div > table > tbody > tr:nth-child({i}) > td:nth-child(3) > a[href*="View"]:not([href^="mailto:"])`,
      `table tbody tr:nth-child({i}) td:nth-child(3) a[href*="View"]:not([href^="mailto:"])`,
      `.applicant-list-section table tbody tr:nth-child({i}) td a[href*="View"]:not([href^="mailto:"])`,
      `table tbody tr:nth-child({i}) a[href*="View"]:not([href^="mailto:"])`,
      `table tbody tr:nth-child({i}) a[href*="view"]:not([href^="mailto:"])`,
      `table tbody tr:nth-child({i}) a[href*="Resume"]:not([href^="mailto:"])`,
      `table tbody tr:nth-child({i}) a[href*="resume"]:not([href^="mailto:"])`,
      `tbody tr:nth-child({i}) td a[href*="View"]:not([href^="mailto:"])`,
      `tbody tr:nth-child({i}) td a[href*="view"]:not([href^="mailto:"])`
    ];
    
    // 1단계: 모든 이력서 정보 수집 (빠른 스캔)
    console.log(`[${new Date().toISOString()}] 🔄 이력서 정보 수집 시작 (최대 ${totalRows}개 행 확인)`);
    const resumeInfos = [];
    
    const maxRows = Math.max(totalRows + 1, 50); // 최소 50개까지는 시도
    for (let i = 2; i <= maxRows; i++) {
      try {
        // 먼저 행에서 Pass_R_No 추출 (여러 선택자 시도)
        const rowSelectors = [
          `table tbody tr:nth-child(${i})`,
          `tbody tr:nth-child(${i})`,
          `.applicant-list-table tbody tr:nth-child(${i})`,
          `table.applicant-list-table tbody tr:nth-child(${i})`
        ];
        
        let row = null;
        let rowCount = 0;
        
        for (const selector of rowSelectors) {
          const testRow = page.locator(selector);
          rowCount = await testRow.count();
          if (rowCount > 0) {
            row = testRow;
            break;
          }
        }
        
        if (!row || rowCount === 0) {
          if (i > totalRows && (i - resumeInfos.length) > 5) {
            console.log(`[${new Date().toISOString()}] 📊 더 이상 이력서가 없는 것으로 판단하여 종료합니다.`);
            break;
          }
          continue;
        }
        
        // Pass_R_No 추출 (여러 방법 시도)
        let passRNo = null;
        
        // 방법 1: data-passrno 속성
        passRNo = await row.getAttribute('data-passrno').catch(() => null);
        
        // 방법 2: data-rcopassno에서 추출 (형식: "0|417192697")
        if (!passRNo) {
          const rcoPassNo = await row.getAttribute('data-rcopassno').catch(() => null);
          if (rcoPassNo && rcoPassNo.includes('|')) {
            const parts = rcoPassNo.split('|');
            if (parts.length > 1) {
              passRNo = parts[1]; // 두 번째 부분 사용
            }
          }
        }
        
        // 방법 3: data-pssno 속성
        if (!passRNo) {
          passRNo = await row.getAttribute('data-pssno').catch(() => null);
        }
        
        // 방법 4: JavaScript로 직접 추출
        if (!passRNo) {
          passRNo = await row.evaluate(el => {
            return el.getAttribute('data-passrno') || 
                   el.getAttribute('data-pssno') ||
                   (el.getAttribute('data-rcopassno')?.split('|')[1]);
          }).catch(() => null);
        }
        
        // 방법 5: 링크에서 Pass_R_No 추출
        if (!passRNo) {
          const linkElement = row.locator('a[href*="Pass_R_No"]').first();
          const linkCount = await linkElement.count();
          if (linkCount > 0) {
            const href = await linkElement.getAttribute('href').catch(() => null);
            if (href) {
              const match = href.match(/[?&]Pass_R_No=(\d+)/);
              if (match && match[1]) {
                passRNo = match[1];
              }
            }
          }
        }
        
        if (!passRNo) {
          if (i <= 10) {
            console.log(`[${new Date().toISOString()}] ℹ️ ${i}번째 행: Pass_R_No 없음 (모든 방법 시도 완료)`);
          }
          continue;
        }
        
        console.log(`[${new Date().toISOString()}] ✅ ${i}번째 행 - Pass_R_No: ${passRNo} 발견`);
        
        // 중복 체크 (Pass_R_No 기반)
        if (existingResumeNumbers.has(passRNo)) {
          console.log(`[${new Date().toISOString()}] ⏭️ 중복 이력서 제외 - Pass_R_No: ${passRNo}`);
          continue;
        }
        
        // 이력서 링크 찾기
        let element = null;
        let href = null;
        
        // 여러 선택자 패턴 시도
        for (const selectorPattern of possibleSelectors) {
          const selector = selectorPattern.replace('{i}', i);
          try {
            const elements = await page.locator(selector).all();
            for (const el of elements) {
              const elHref = await el.getAttribute('href').catch(() => '');
              if (elHref && !elHref.startsWith('mailto:') && (elHref.includes('View') || elHref.includes('view') || elHref.includes('Resume') || elHref.includes('resume'))) {
                element = el;
                href = elHref;
                break;
              }
            }
            if (element) break;
          } catch (e) {
            continue;
          }
        }
        
        // 선택자를 찾지 못했으면 더 일반적인 선택자로 시도
        if (!element) {
          const generalSelectors = [
            `tbody tr:nth-child(${i}) td a`,
            `table tbody tr:nth-child(${i}) td a`,
            `table tbody tr:nth-child(${i}) a`
          ];
          
          for (const selector of generalSelectors) {
            try {
              const elements = await page.locator(selector).all();
              for (const el of elements) {
                const elHref = await el.getAttribute('href').catch(() => '');
                if (elHref && !elHref.startsWith('mailto:') && !elHref.startsWith('tel:') && 
                    (elHref.includes('View') || elHref.includes('view') || elHref.includes('Resume') || elHref.includes('resume') || elHref.includes('/Corp/Applicant/'))) {
                  element = el;
                  href = elHref;
                  break;
                }
              }
              if (element) break;
            } catch (e) {
              continue;
            }
          }
        }
        
        if (!element) {
          if (i <= 5) {
            console.log(`[${new Date().toISOString()}] ℹ️ ${i}번째 행: 이력서 링크 없음`);
          }
          if (i > totalRows && (i - resumeInfos.length) > 5) {
            console.log(`[${new Date().toISOString()}] 📊 더 이상 이력서가 없는 것으로 판단하여 종료합니다.`);
            break;
          }
          continue;
        }
        
        // 클릭 가능한 요소를 저장 (URL 대신)
        resumeInfos.push({
          passRNo,
          clickElement: element,
          rowIndex: i
        });
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ ${i}번째 행 처리 중 오류:`, error.message);
        continue;
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 정보 수집 완료: ${resumeInfos.length}개`);
    
    if (resumeInfos.length === 0) {
      console.log(`[${new Date().toISOString()}] 📊 신규 이력서가 없습니다.`);
      return [];
    }
    
    // 2단계: 순차 처리
    const resumes = [];
    let processedCount = 0;
    
    for (const resumeInfo of resumeInfos) {
      processedCount++;
      console.log(`[${new Date().toISOString()}] 🔄 이력서 처리 중 (${processedCount}/${resumeInfos.length})`);
      
      try {
        const result = await processResumeSequentially(context, resumeInfo, jobPosting, existingResumeNumbers);
        if (result) {
          resumes.push(result);
          console.log(`[${new Date().toISOString()}] ✅ ${result.applicant_name} 저장 완료 (${processedCount}/${resumeInfos.length})`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ 이력서 처리 실패 (${processedCount}/${resumeInfos.length}):`, error.message);
      }
      
      // 각 이력서 처리 후 짧은 딜레이
      if (processedCount < resumeInfos.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 공고별 이력서 수집 완료`);
    console.log(`[${new Date().toISOString()}]    공고번호: ${jobPosting.id}`);
    console.log(`[${new Date().toISOString()}]    처리한 이력서: ${processedCount}개`);
    console.log(`[${new Date().toISOString()}]    새로 저장된 이력서: ${resumes.length}개`);
    console.log(`[${new Date().toISOString()}]    중복으로 건너뛴 이력서: ${processedCount - resumes.length}개`);
    return resumes;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 공고별 이력서 수집 오류 - ${jobPosting.title}:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    return [];
  }
}

/**
 * 개별 이력서를 순차적으로 처리하는 함수
 */
async function processResumeSequentially(context, resumeInfo, jobPosting, existingResumeNumbers) {
  const { passRNo, clickElement, rowIndex } = resumeInfo;
  const newPage = await context.newPage();
  
  try {
    console.log(`[${new Date().toISOString()}] 🖱️ ${rowIndex}번째 이력서 클릭 중... (Pass_R_No: ${passRNo})`);
    
    // Promise.race를 사용하여 클릭과 새 페이지 대기를 동시에 처리
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      clickElement.click({ timeout: 5000 })
    ]);
    
    // 팝업이 열렸으면 그것을 사용, 아니면 현재 페이지 사용
    const targetPage = popup || newPage;
    await targetPage.waitForLoadState('domcontentloaded', { timeout: 60000 });
    await targetPage.waitForTimeout(2000);
    
    const resumePageUrl = targetPage.url();
    console.log(`[${new Date().toISOString()}] ✅ 이력서 페이지 로드 완료`);
    
    // 로그인 페이지로 리다이렉트된 경우 처리
    if (resumePageUrl.includes('Login') || resumePageUrl.includes('login')) {
      console.warn(`[${new Date().toISOString()}] ⚠️ 로그인 페이지로 리다이렉트됨. 세션 만료 - Pass_R_No: ${passRNo}`);
      await targetPage.close();
      if (popup) await newPage.close();
      return null;
    }
    
    // URL에서 Pass_R_No 추출 및 중복 재확인
    const urlPassRNoMatch = resumePageUrl.match(/[?&]Pass_R_No=(\d+)/);
    let urlPassRNo = passRNo; // 기본값은 목록에서 추출한 값
    
    if (urlPassRNoMatch && urlPassRNoMatch[1]) {
      urlPassRNo = urlPassRNoMatch[1];
      console.log(`[${new Date().toISOString()}] 🔍 URL에서 Pass_R_No 추출: ${urlPassRNo}`);
      
      if (urlPassRNo !== passRNo) {
        console.log(`[${new Date().toISOString()}] ⚠️ Pass_R_No 불일치 - 목록: ${passRNo}, URL: ${urlPassRNo} (URL 값 사용)`);
      }
    }
    
    // newPage를 targetPage로 교체하여 계속 사용
    const finalPage = targetPage;
    
    // URL의 Pass_R_No로 중복 재확인
    if (existingResumeNumbers.has(urlPassRNo)) {
      console.log(`[${new Date().toISOString()}] ⏭️ 중복 이력서 제외 - Pass_R_No: ${urlPassRNo}`);
      await finalPage.close();
      if (popup && popup !== finalPage) await newPage.close();
      return null;
    }
    
    // 이력서 데이터 추출
    const resumeData = await extractResumeData(finalPage, jobPosting, {
      resumeNumber: urlPassRNo
    });
    
    // jobkorea_resume_id에 Pass_R_No 저장
    resumeData.jobkorea_resume_id = urlPassRNo;
    
    // DB에 저장
    const saveResult = await Promise.race([
      saveResume(resumeData),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase 저장 타임아웃 (30초)')), 30000))
    ]);
    
    if (!saveResult) {
      console.log(`[${new Date().toISOString()}] ⚠️ Supabase에서 중복으로 판단하여 저장하지 않았습니다. (Pass_R_No: ${urlPassRNo})`);
      await finalPage.close();
      if (popup && popup !== finalPage) await newPage.close();
      return null;
    }
    
    // 메모리에도 추가하여 같은 세션 내 중복 방지
    existingResumeNumbers.add(urlPassRNo);
    
    await finalPage.close();
    if (popup && popup !== finalPage) await newPage.close();
    console.log(`[${new Date().toISOString()}] ✅ ${saveResult.applicant_name} 저장 완료 (Pass_R_No: ${saveResult.jobkorea_resume_id || urlPassRNo})`);
    return saveResult;
    
  } catch (error) {
    await newPage.close().catch(() => {});
    console.error(`[${new Date().toISOString()}] ❌ 이력서 처리 오류 (Pass_R_No: ${passRNo}):`, error.message);
    return null;
  }
}

/**
 * 이력서 데이터 추출 및 PDF/Markdown 생성
 */
async function extractResumeData(page, jobPosting, options = {}) {
  try {
    await ensureDirectories();
    
    // 이력서 데이터 추출 (PDF 생성 전에 이름 추출)
    console.log(`[${new Date().toISOString()}] 🔍 이력서 데이터 추출 중...`);
    
    // 이름 추출
    let applicant_name = '이름 없음';
    
    try {
      // 1순위: .item.name 클래스로 이름 추출
      const nameElement = page.locator('.item.name').first();
      if (await nameElement.count() > 0) {
        applicant_name = await nameElement.textContent().catch(() => '');
        applicant_name = applicant_name.trim();
        if (applicant_name) {
          console.log(`[${new Date().toISOString()}] ✅ 이름 추출 완료 (.item.name): ${applicant_name}`);
        }
      }
      
      // 2순위: 폴백 - XPath 방식
      if (!applicant_name || applicant_name === '이름 없음') {
        const photoXPath = '/html/body/div[1]/div[2]/div[4]/div[1]/div[1]/img';
        const photoElement = page.locator(`xpath=${photoXPath}`);
        const hasPhoto = await photoElement.count() > 0;
        
        if (hasPhoto) {
          const nameXPath = '/html/body/div[1]/div[2]/div[4]/div[1]/div[2]/div[1]/div[1]';
          const nameElement = page.locator(`xpath=${nameXPath}`);
          applicant_name = (await nameElement.textContent().catch(() => '')).trim() || '이름 없음';
        } else {
          const nameXPath = '/html/body/div[1]/div[2]/div[5]/div[1]/div/div[1]/div[1]';
          const nameElement = page.locator(`xpath=${nameXPath}`);
          applicant_name = (await nameElement.textContent().catch(() => '')).trim() || '이름 없음';
        }
      }
      
      console.log(`[${new Date().toISOString()}] ✅ 이름 추출 완료: ${applicant_name}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ⚠️ 이름 추출 오류:`, error.message);
      applicant_name = '이름 없음';
    }
    
    // 휴대전화 추출: .value 클래스에서 010으로 시작하는 번호만
    let applicant_phone = '';
    try {
      const valueElements = await page.locator('.value').all();
      for (const element of valueElements) {
        const text = await element.textContent().catch(() => '');
        const cleaned = text.trim().replace(/\s+/g, '');
        if (cleaned.startsWith('010') && /^010[\d-]+$/.test(cleaned)) {
          applicant_phone = cleaned;
          console.log(`[${new Date().toISOString()}] 📱 휴대전화 추출: ${applicant_phone}`);
          break;
        }
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] ⚠️ 휴대전화 추출 실패`);
    }
    
    // 이메일 추출: mailto: 링크에서
    let applicant_email = '';
    try {
      const mailtoLink = await page.locator('a[href^="mailto:"]').first();
      if (await mailtoLink.count() > 0) {
        const href = await mailtoLink.getAttribute('href').catch(() => '');
        if (href && href.startsWith('mailto:')) {
          applicant_email = href.replace('mailto:', '').trim();
          console.log(`[${new Date().toISOString()}] 📧 이메일 추출: ${applicant_email}`);
        }
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] ⚠️ 이메일 추출 실패`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ 이력서 데이터 추출 완료 - 이름: ${applicant_name}`);
    
    const timestamp = Date.now();
    const pdfFilename = `resume_${timestamp}.pdf`;
    const mdFilename = `resume_${timestamp}.md`;
    const pdfPath = path.join(__dirname, '../../pdfs', pdfFilename);
    const mdPath = path.join(__dirname, '../../markdowns', mdFilename);
    
    // PDF 생성
    console.log(`[${new Date().toISOString()}] 📄 PDF 생성 중: ${pdfFilename}`);
    await page.pdf({ path: pdfPath, format: 'A4' });
    
    // PDF 파일 생성 확인
    try {
      await fs.access(pdfPath);
      console.log(`[${new Date().toISOString()}] ✅ PDF 생성 완료: ${pdfFilename}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ PDF 파일 생성 실패: ${pdfFilename}`, error.message);
      throw new Error(`PDF 생성 실패: ${error.message}`);
    }
    
    // PDF를 Markdown으로 변환
    try {
      console.log(`[${new Date().toISOString()}] 📝 Markdown 변환 중: ${mdFilename}`);
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);
      
      // PDF 텍스트를 Markdown 형식으로 변환
      const mdContent = `# ${applicant_name || '이력서'}\n\n**공고명:** ${jobPosting.title}\n**공고번호:** ${jobPosting.id}\n\n---\n\n${pdfData.text}`;
      await fs.writeFile(mdPath, mdContent, 'utf-8');
      console.log(`[${new Date().toISOString()}] ✅ Markdown 변환 완료: ${mdFilename}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ⚠️ Markdown 변환 실패: ${error.message}`);
      // Markdown 변환 실패해도 계속 진행
    }
    
    return {
      applicant_name,
      applicant_phone,
      applicant_email,
      job_posting_title: jobPosting.title,
      job_posting_id: jobPosting.id,
      application_date: new Date().toISOString(),
      education: JSON.stringify({
        school: (await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.content > div.content-header > div.name').catch(() => '')).trim(),
        major: (await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.content > div.content-header > div.line').catch(() => '')).trim(),
        status: (await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.date > div.state').catch(() => '')).trim()
      }),
      career: JSON.stringify({
        company: (await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.career > div.list.list-career > div:nth-child(1) > div.content > div.content-header > a > div').catch(() => '')).trim(),
        position: (await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.career > div.list.list-career > div:nth-child(1) > div.content > div.content-header > div.position').catch(() => '')).trim()
      }),
      pdf_url: `http://localhost:4001/api/resumes/pdf/${pdfFilename}`,
      md_url: `http://localhost:4001/api/resumes/markdown/${mdFilename}`
      // status는 DB 기본값('접수')을 사용하므로 포함하지 않음
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 이력서 데이터 추출 오류:`, error.message);
    console.error(`[${new Date().toISOString()}]    Stack:`, error.stack);
    throw error;
  }
}

/**
 * 공고 정보를 Markdown 형식으로 추출 (cheerio 사용 - BeautifulSoup과 유사)
 */
export async function extractJobPostingMarkdown(jobPostingId) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    
    console.log(`[${new Date().toISOString()}] 🔐 이력서 검토를 위한 공고 정보 추출 시작 - 공고번호: ${jobPostingId}`);
    console.log(`[${new Date().toISOString()}]    프로세스: 로그인 → 공고 리스트 → 공고 클릭`);
    
    // 1. 로그인
    try {
      await loginToJobKorea(page);
      console.log(`[${new Date().toISOString()}] ✅ 로그인 완료`);
    } catch (loginError) {
      console.error(`[${new Date().toISOString()}] ❌ 로그인 실패:`, loginError.message);
      throw new Error(`로그인 실패: ${loginError.message}`);
    }
    
    // 2. 공고 목록 페이지로 이동
    console.log(`[${new Date().toISOString()}] 🌐 공고 목록 페이지 접속 중...`);
    await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List?PubType=1&SrchStat=1', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    await page.waitForSelector('.rowWrap', { timeout: 5000 });
    console.log(`[${new Date().toISOString()}] ✅ 공고 목록 페이지 로드 완료`);
    
    // 3. 공고 리스트에서 해당 공고 찾기 및 클릭
    const jobItems = await page.locator('.giListItem').all();
    let found = false;
    let clickIndex = -1;
    
    console.log(`[${new Date().toISOString()}] 🔍 공고 리스트에서 공고번호 ${jobPostingId} 검색 중... (총 ${jobItems.length}개)`);
    
    for (let i = 0; i < jobItems.length; i++) {
      try {
        const item = jobItems[i];
        const titleLink = item.locator('.jobTitWrap a.tit');
        const href = await titleLink.getAttribute('href').catch(() => '');
        
        if (href) {
          const giNoMatch = href.match(/[?&]GI_No=(\d+)/);
          if (giNoMatch && giNoMatch[1] === jobPostingId) {
            clickIndex = i + 1; // XPath는 1부터 시작
            found = true;
            console.log(`[${new Date().toISOString()}] ✅ 공고 발견 - 리스트 ${clickIndex}번째 위치`);
            break;
          }
        }
      } catch (e) {
        // 다음 항목 시도
        continue;
      }
    }
    
    if (!found) {
      console.error(`[${new Date().toISOString()}] ❌ 공고를 리스트에서 찾을 수 없음 - 공고번호: ${jobPostingId}`);
      throw new Error(`공고를 리스트에서 찾을 수 없습니다: ${jobPostingId}`);
    }
    
    // 4. XPath를 사용하여 공고 클릭
    const jobLinkXPath = `//*[@id="form"]/div/fieldset/div[2]/div[${clickIndex}]/div/div[1]/span/a[1]`;
    const linkElement = page.locator(`xpath=${jobLinkXPath}`);
    
    if (await linkElement.count() === 0) {
      console.error(`[${new Date().toISOString()}] ❌ XPath로 공고 링크를 찾을 수 없음`);
      throw new Error(`공고 링크를 찾을 수 없습니다: ${jobPostingId}`);
    }
    
    console.log(`[${new Date().toISOString()}] 🖱️  공고 클릭 중...`);
    await linkElement.click();
    
    // 페이지 로드 대기
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await page.waitForTimeout(1500);
    
    // HTML 내용 가져오기
    const htmlContent = await page.content();
    console.log(`[${new Date().toISOString()}]    📄 HTML 크기: ${htmlContent.length} bytes`);
    
    // Gemini를 사용하여 HTML에서 공고 정보 추출
    console.log(`[${new Date().toISOString()}]    🤖 Gemini로 공고 분석 시작...`);
    const result = await extractJobPostingWithGemini(htmlContent, jobPostingId);
    
    if (result.success) {
      console.log(`[${new Date().toISOString()}] ✅ 공고 정보 추출 완료 - 공고번호: ${jobPostingId} (${result.markdown.length}자)`);
      
      return {
        success: true,
        markdown: result.markdown.trim()
      };
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Gemini 추출 실패 - ${jobPostingId}: ${result.error}`);
      
      // Fallback: 간단한 텍스트 추출
      const $ = cheerio.load(htmlContent);
      const fallbackText = $('body').text().trim().substring(0, 1500);
      const fallbackMarkdown = `# 공고 제목\n\n**공고번호:** ${jobPostingId}\n\n## 공고 내용\n\n${fallbackText}\n`;
      
      return {
        success: false,
        markdown: fallbackMarkdown,
        error: result.error
      };
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ 공고 정보 추출 오류:`, error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}
