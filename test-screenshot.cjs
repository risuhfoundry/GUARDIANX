const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/risha/.gemini/antigravity/brain/f036709b-b880-4b02-b482-55028f081c55/screenshot.png' });
  await browser.close();
})();
