const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  const content = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'NO MAIN ELEMENT';
    
    const rect = main.getBoundingClientRect();
    const hero = document.querySelector('.lp-hero');
    const heroRect = hero ? hero.getBoundingClientRect() : null;
    const computedHero = hero ? window.getComputedStyle(hero) : null;
    
    const copy = document.querySelector('.lp-hero__copy');
    const copyRect = copy ? copy.getBoundingClientRect() : null;
    const computedCopy = copy ? window.getComputedStyle(copy) : null;
    
    const root = document.querySelector('.lp-root');
    const rootRect = root ? root.getBoundingClientRect() : null;
    
    return {
      main: { rect },
      root: { rect: rootRect },
      hero: { rect: heroRect, opacity: computedHero?.opacity, display: computedHero?.display, visibility: computedHero?.visibility },
      copy: { rect: copyRect, opacity: computedCopy?.opacity, display: computedCopy?.display, visibility: computedCopy?.visibility },
      htmlLength: document.body.innerHTML.length
    };
  });
  
  console.log(JSON.stringify(content, null, 2));
  await browser.close();
})();
