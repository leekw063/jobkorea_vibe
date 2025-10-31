import { chromium } from 'playwright';
import { SELECTORS } from '../utils/selectors.js';
import { saveResume } from './supabaseService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PDF 디렉토리 확인 및 생성
const pdfsDir = path.join(__dirname, '../../pdfs');
async function ensurePdfsDirectory() {
  try {
    await fs.access(pdfsDir);
  } catch (error) {
    await fs.mkdir(pdfsDir, { recursive: true });
    console.log('📁 PDF 디렉토리 생성:', pdfsDir);
  }
}

export async function collectUnreadResumes() {
  // PDF 디렉토리 확인
  await ensurePdfsDirectory();
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    await loginToJobKorea(page);
    const resumes = await scrapeUnreadResumes(page);
    
    return { success: true, count: resumes.length, resumes };
  } catch (error) {
    console.error('크롤링 오류:', error);
    return { success: false, error: error.message, resumes: [] };
  } finally {
    await browser.close();
  }
}

async function loginToJobKorea(page) {
  try {
    await page.goto('https://www.jobkorea.co.kr/Corp/GIMng/List', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for the company tab to be visible
    await page.waitForSelector(SELECTORS.COMPANY_TAB, { timeout: 10000 });
    await page.click(SELECTORS.COMPANY_TAB);
    
    // Wait for login form to be ready
    await page.waitForSelector(SELECTORS.ID_INPUT, { timeout: 10000 });
    
    const id = process.env.JOBKOREA_ID || 'markany';
    const password = process.env.JOBKOREA_PW || 'markany2018!';
    
    await page.fill(SELECTORS.ID_INPUT, id);
    await page.fill(SELECTORS.PASSWORD_INPUT, password);
    
    await page.click(SELECTORS.LOGIN_BUTTON);
    
    // Wait for navigation after login
    await page.waitForURL('**/Corp/GIMng/**', { timeout: 15000 });
    
    console.log('✅ 로그인 완료');
  } catch (error) {
    console.error('로그인 오류:', error);
    throw new Error(`로그인 실패: ${error.message}`);
  }
}

async function scrapeUnreadResumes(page) {
  const jobIds = await extractJobIds(page);
  console.log(`📋 채용공고 ${jobIds.length}개 발견`);
  
  const allResumes = [];
  
  for (const jobId of jobIds) {
    try {
      const resumes = await processJobPosting(page, jobId);
      allResumes.push(...resumes);
    } catch (error) {
      console.error(`공고 ${jobId} 처리 중 오류:`, error.message);
      // Continue with next job posting
    }
  }
  
  return allResumes;
}

async function extractJobIds(page) {
  try {
    // Wait for job posting links to be available
    await page.waitForSelector('a.tit.devLinkExpire', { timeout: 10000 });
    
    const links = await page.$$('a.tit.devLinkExpire');
    const jobIds = [];
    
    for (const link of links.slice(0, 10)) {
      try {
        const href = await link.getAttribute('href');
        const match = href?.match(/GI_No=(\d+)/);
        if (match) jobIds.push(match[1]);
      } catch (error) {
        console.warn('링크 처리 중 오류:', error.message);
      }
    }
    
    return jobIds;
  } catch (error) {
    console.error('공고 ID 추출 오류:', error);
    return [];
  }
}

async function processJobPosting(page, jobId) {
  try {
    await page.goto(`https://www.jobkorea.co.kr/Corp/Applicant/list?GI_No=${jobId}&PageCode=YN`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const resumes = [];
    
    for (let i = 2; i <= 11; i++) {
      try {
        const selector = `#container > div.applicant-list-section > div > div > table > tbody > tr:nth-child(${i}) > td:nth-child(3) > a`;
        
        // Wait for selector with shorter timeout
        const element = await page.waitForSelector(selector, { timeout: 3000 }).catch(() => null);
        
        if (!element) {
          console.log(`ℹ️ ${i}번째 이력서 없음`);
          break;
        }
        
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 10000 }),
          page.click(selector)
        ]);
        
        // Wait for page to load
        await newPage.waitForLoadState('networkidle', { timeout: 15000 });
        
        const resumeData = await extractResumeData(newPage, jobId);
        resumes.push(resumeData);
        
        await saveResume(resumeData);
        console.log(`✅ ${resumeData.applicant_name} 저장 완료`);
        
        await newPage.close();
        
        // Small delay between resumes
        await page.waitForTimeout(500);
      } catch (error) {
        console.log(`ℹ️ ${i}번째 이력서 처리 중 오류: ${error.message}`);
        break;
      }
    }
    
    return resumes;
  } catch (error) {
    console.error(`공고 ${jobId} 처리 중 오류:`, error);
    return [];
  }
}

async function extractResumeData(page, jobId) {
  try {
    // PDF 디렉토리 확인
    await ensurePdfsDirectory();
    
    const pdfFilename = `resume_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, '../../pdfs', pdfFilename);
    
    // Generate PDF
    console.log(`📄 PDF 생성 중: ${pdfFilename}`);
    await page.pdf({ path: pdfPath, format: 'A4' });
    
    // 파일 생성 확인
    try {
      await fs.access(pdfPath);
      console.log(`✅ PDF 생성 완료: ${pdfFilename}`);
    } catch (error) {
      console.error(`❌ PDF 파일 생성 실패: ${pdfFilename}`, error);
      throw new Error(`PDF 생성 실패: ${error.message}`);
    }
    
    // Extract resume data with error handling
    const nameSelector = 'body > div.resume-view-page > div.resume-view-container > div.base.profile.image > div.container > div.info-container > div.info-general > div.item.name';
    const phoneSelector = 'body > div.resume-view-page > div.resume-view-container > div.base.profile.image > div.container > div.info-container > div.info-detail > div:nth-child(1) > div.value';
    const emailSelector = 'body > div.resume-view-page > div.resume-view-container > div.base.profile.image > div.container > div.info-container > div.info-detail > div:nth-child(2) > div.value > a';
    
    const applicant_name = await page.textContent(nameSelector).catch(() => '');
    const applicant_phone = await page.textContent(phoneSelector).catch(() => '');
    const applicant_email = await page.textContent(emailSelector).catch(() => '');
    
    return {
      applicant_name: applicant_name.trim() || '이름 없음',
      applicant_phone: applicant_phone.trim() || '',
      applicant_email: applicant_email.trim() || '',
      job_posting_title: `채용공고_${jobId}`,
      application_date: new Date().toISOString(),
      education: JSON.stringify({
        school: await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.content > div.content-header > div.name').catch(() => ''),
        major: await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.content > div.content-header > div.line').catch(() => ''),
        status: await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.date > div.state').catch(() => '')
      }),
      career: JSON.stringify({
        company: await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.career > div.list.list-career > div:nth-child(1) > div.content > div.content-header > a > div').catch(() => ''),
        position: await page.textContent('body > div.resume-view-page > div.resume-view-container > div.base.career > div.list.list-career > div:nth-child(1) > div.content > div.content-header > div.position').catch(() => '')
      }),
      pdf_url: `http://localhost:4001/api/resumes/pdf/${pdfFilename}`,
      status: 'unread'
    };
  } catch (error) {
    console.error('이력서 데이터 추출 오류:', error);
    throw error;
  }
}
