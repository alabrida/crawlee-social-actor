import { chromium } from 'playwright';
import { getRandomUserAgent } from '../../src/utils/ua-rotation.js';

async function probeSERP() {
    console.log('--- PROBING GOOGLE SERP ---');
    
    const browser = await chromium.launch({ headless: true });
    const urls = [
        'https://www.google.com/search?q=Apify',
        'https://www.google.com/search?q=Crawlee',
        'https://www.google.com/search?q=Supabase'
    ];

    for (const url of urls) {
        console.log(`\nProbing: ${url}`);
        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        try {
            // Using networkidle to wait for search results to render
            const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            console.log(`Status: ${response?.status()}`);
            
            const content = await page.content();
            const lowerContent = content.toLowerCase();

            if (lowerContent.includes('captcha') || lowerContent.includes('unusual traffic') || lowerContent.includes('/sorry/')) {
                console.log('DETECTED: Anti-Bot Challenge (Sorry/CAPTCHA)');
            } else if (lowerContent.includes('search') && lowerContent.includes('results')) {
                console.log('SUCCESS: Search results visible');
            } else {
                console.log('UNKNOWN STATE: Check screenshot');
            }

            const slug = new URL(url).searchParams.get('q');
            const screenshotPath = `debug/probe-serp-${slug}.png`;
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

probeSERP().catch(console.error);
