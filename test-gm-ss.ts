import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const targetUrl = "https://www.google.com/maps/search/?api=1&query=Jack%27s+Family+Restaurants+Birmingham+AL";
    console.log("Navigating to:", targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    const firstResult = page.locator('a[aria-label]').filter({ hasText: 'Jack' }).first();
    if (await firstResult.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Found search results, clicking the first one to open the profile.");
        await firstResult.click();
        await page.waitForTimeout(5000); // Wait for the profile pane to slide in
    }
    const consentButton = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
    if (await consentButton.isVisible()) {
        await consentButton.click();
        await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: 'gm-test-screenshot.png', fullPage: true });
    console.log('Screenshot saved to gm-test-screenshot.png');
    await browser.close();
})();
