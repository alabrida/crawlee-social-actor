import { chromium } from 'playwright';
import * as fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const targetUrl = "https://www.google.com/maps/place/Jack's/@33.5206608,-86.80249,15z/data=!4m2!3m1!1s0x0:0xbf2c8d20fe7f2025?sa=X";
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const consentButton = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
    if (await consentButton.isVisible()) { await consentButton.click(); await page.waitForTimeout(3000); }
    
    const title = await page.locator('h1').first().textContent().catch(() => 'no h1');
    const buttons = await page.locator('button[aria-label]').evaluateAll(els => els.map(el => el.getAttribute('aria-label') || (el as HTMLElement).innerText));
    const links = await page.locator('a[aria-label]').evaluateAll(els => els.map(el => ({ label: el.getAttribute('aria-label'), href: el.getAttribute('href') })));
    const allDivs = await page.locator('div[aria-label]').evaluateAll(els => els.map(el => el.getAttribute('aria-label') || (el as HTMLElement).innerText).filter(x => x && x.trim().length > 0));
    const rawHtml = await page.locator('div[role="main"]').first().innerHTML().catch(() => 'no main role');

    fs.writeFileSync('gm-dump.json', JSON.stringify({ title, buttons, links, allDivs, htmlPreview: rawHtml.substring(0, 500) }, null, 2));

    await browser.close();
})();
