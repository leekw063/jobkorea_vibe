import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://www.jobkorea.co.kr/Login/Login_Tot.asp?rDBName=GG&re_url=/');
  
  // 여기서 브라우저가 열리면 수동으로 조작하면서 콘솔에서 셀렉터 확인
  await page.pause();
})();
