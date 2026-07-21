import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  console.log("Navigating to http://localhost:4173 ...");
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });

  // Click Start Drawing
  try {
    console.log("Clicking Start Drawing...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('Start Drawing'));
      if (startBtn) startBtn.click();
    });
    
    // wait for 2 seconds to see if it crashes
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log("Error clicking:", e);
  }

  await browser.close();
})();
