import { chromium } from 'playwright';
import { getRandomUserAgent } from '../src/utils/ua-rotation.js';

async function probeGeneral() {
    console.log('--- PROBING GENERAL (WAF) SITES ---');
    
    const browser = await chromium.launch({ headless: true });
    const urls = [
        'https://www.upwork.com/',
        'https://www.tripadvisor.com/',
        'https://www.yellowpages.com/'
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
            
            await page.waitForTimeout(5000); // Wait for potential WAF challenges
            const content = await page.content();
            const lowerContent = content.toLowerCase();

            const isBlocked = lowerContent.includes('checking your browser') || 
                             lowerContent.includes('just a moment') || 
                             lowerContent.includes('verifying you are human') ||
                             lowerContent.includes('access denied') ||
                             lowerContent.includes('datadome') ||
                             lowerContent.includes('cloudflare');

            if (isBlocked) {
                console.log('DETECTED: WAF Block / Challenge');
            } else {
                console.log('SUCCESS: Content reached');
            }

            const slug = new URL(url).hostname.split('.')[1];
            const screenshotPath = `probe-general-${slug}.png`;
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

probeGeneral().catch(console.error);
