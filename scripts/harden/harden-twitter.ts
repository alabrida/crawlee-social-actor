import { chromium } from 'playwright';
import twitterHandler from '../../src/handlers/twitter.js';
import { log } from '../../src/utils/logger.js';
import { injectCookies } from '../../src/utils/auth.js';
import fs from 'fs';
import path from 'path';


async function runHardenSweep() {
    console.log('--- STARTING TWITTER/X HARDEN SWEEP ---');
    
    const urlsPath = path.join(process.cwd(), 'Documentation', 'test-urls', 'twitter.txt');
    const urls = fs.readFileSync(urlsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http') && !line.includes('#'));

    console.log(`Found ${urls.length} Twitter URLs to test.`);

    const browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const resultsSummary = [];
    const startTime = Date.now();

    for (const url of urls) {
        console.log(`\nTesting URL: ${url}`);
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();
        
        const tokenString = process.env.AUTH_TOKENS_X;
        if (tokenString) {
            await injectCookies(page, 'twitter', tokenString, url);
        }

        const crawlingContext: any = {
            page,
            request: { url, userData: { platform: 'twitter' } },
            log
        };

        const handlerContext: any = {
            input: {
                platforms: ['twitter'],
                proxy: { useApifyProxy: false, apifyProxyGroups: [] }
            }
        };

        const resultEntry: any = { url, success: false, blocked: false, errors: [], links: 0, markers: 0 };

        try {
            const results = await twitterHandler.handle(crawlingContext, handlerContext);
            const data = results[0].data as any;
            const isValid = twitterHandler.validate(data);
            const isBlocked = twitterHandler.detectBlock(data.profileHtml);
            
            resultEntry.success = isValid && !isBlocked;
            resultEntry.blocked = isBlocked;
            resultEntry.links = data.revenueIndicators.links.length;
            resultEntry.markers = data.revenueIndicators.conversionMarkers.length;
            
            console.log(`  - Valid Schema: ${isValid}`);
            console.log(`  - Blocked (Login Wall): ${resultEntry.blocked}`);
            console.log(`  - Links: ${resultEntry.links}`);
            console.log(`  - Markers: ${resultEntry.markers}`);

            if (isBlocked) {
                const screenshotPath = `results/debug-twitter-block-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath });
                console.log(`  - [DEBUG] Block screenshot saved to ${screenshotPath}`);
            }

        } catch (e: any) {
            console.error(`  - FAILED: ${e.message}`);
            resultEntry.errors.push(e.message);
        } finally {
            await context.close();
            resultsSummary.push(resultEntry);
        }
    }

    const endTime = Date.now();
    const durationSec = (endTime - startTime) / 1000;
    const blockDetectionRate = (resultsSummary.filter(r => r.blocked).length / urls.length) * 100;

    console.log('\n--- HARDEN SWEEP SUMMARY ---');
    console.log(`Total URLs: ${urls.length}`);
    console.log(`Block Detection Rate: ${blockDetectionRate.toFixed(2)}%`);
    console.log(`Failures (Exceptions): ${resultsSummary.filter(r => r.errors.length > 0).length}`);
    console.log(`Total Duration: ${durationSec.toFixed(2)}s`);
    console.log(`Avg Duration/URL: ${(durationSec / urls.length).toFixed(2)}s`);
    
    const estimatedCU = (durationSec / 30) * 0.1;
    console.log(`Estimated CU Consumption: ${estimatedCU.toFixed(4)} CU`);

    await browser.close();
    
    fs.writeFileSync('results/harden-results-twitter.json', JSON.stringify(resultsSummary, null, 2));
    console.log('\nResults saved to results/harden-results-twitter.json');
}

runHardenSweep().catch(err => {
    console.error('Fatal error during sweep:', err);
    process.exit(1);
});
