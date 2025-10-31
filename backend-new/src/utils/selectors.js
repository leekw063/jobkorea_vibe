export const SELECTORS = {
  // 로그인
  LOGIN_URL: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp?rDBName=GG&re_url=/',
  COMPANY_TAB: '#devMemTab > li:nth-child(2) > a',
  ID_INPUT: '#M_ID',
  PASSWORD_INPUT: '#M_PWD',
  LOGIN_BUTTON: '#login-form > fieldset > section.login-input > button',
  
  // 네비게이션
  UNREAD_RESUMES_MENU: '#dev-cont-Cntnt_CorpLounge > section > article.box.profile > ul > li:nth-child(3) > a > span.txt',
  
  // 공고 전환
  JOB_POSTING_DROPDOWN: '#container > div.top-title-section > div > div > div.content-box > div.title-box > button > div',
  NEXT_POSTING: '#container > div.top-title-section > div > div > div.content-box > div.title-box > div > div > div:nth-child(1) > ul > li:nth-child(2) > button > div.text',
  
  // 이력서 목록 (실제 구현 시 확인 필요)
  RESUME_LIST_ITEM: '.resume-item',
  RESUME_NAME: '.name',
  RESUME_POSITION: '.position'
};