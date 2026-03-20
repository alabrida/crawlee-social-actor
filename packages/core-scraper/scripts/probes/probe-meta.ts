import { chromium } from 'playwright';
import { getRandomUserAgent } from '../src/utils/ua-rotation.js';

async function probeMeta() {
    console.log('--- PROBING META (FB/IG) ---');
    
    const browser = await chromium.launch({ headless: true });
    const urls = [
        'https://www.facebook.com/Nike/',
        'https://www.instagram.com/nike/'
    ];

    for (const url of urls) {
        console.log(`\nProbing: ${url}`);
        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        try {
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`Status: ${response?.status()}`);
            
            await page.waitForTimeout(3000); // Wait for potential redirects/overlays
            const content = await page.content();
            const lowerContent = content.toLowerCase();

            if (lowerContent.includes('log in') || lowerContent.includes('login')) {
                console.log('DETECTED: Login Wall');
            }
            if (lowerContent.includes('captcha') || lowerContent.includes('unusual traffic')) {
                console.log('DETECTED: Anti-Bot/CAPTCHA');
            }

            const screenshotPath = `probe-${url.includes('facebook') ? 'facebook' : 'instagram'}.png`;
            await page.screenshot({ path: screenshotPath });
            console.log(`Screenshot saved: ${screenshotPath}`);

        } catch (e: any) {
            console.error(`Probe failed: ${e.message}`);
        } finally {
            await context.close();
        }
    }

    await browser.close();
}

probeMeta().catch(console.error);
