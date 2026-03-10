import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    deviceScaleFactor: 3,
  });
  await page.setViewportSize({ width: 1200, height: 628 });
  await page.goto(`file://${path.resolve('social/card.html')}`);
  await page.waitForLoadState('networkidle');
  await page.locator('.card').screenshot({ path: 'social/card.png' });
  await browser.close();
  console.log('Saved social/card.png (3600x1884 @3x)');
})();
