import { chromium } from 'playwright';
import generalHandler from '../../src/handlers/general.js';
import { log } from '../../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

async function runHardenSweep() {
    console.log('--- STARTING GENERAL (WAF) HARDEN SWEEP ---');
    
    const urlsPath = path.join(process.cwd(), 'Documentation', 'test-urls', 'general.txt');
    
    const urls = fs.readFileSync(urlsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http') && !line.includes('#')); // simple filter for lines with just urls

    console.log(`Found ${urls.length} General URLs to test.`);

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
        
        const crawlingContext: any = {
            page,
            request: { url, userData: { platform: 'general' } },
            log
        };

        const handlerContext: any = {
            input: {
                platforms: ['general'],
                proxy: { useApifyProxy: false, apifyProxyGroups: [] }
            }
        };

        const resultEntry: any = { url, success: false, blocked: false, errors: [], ctas: 0, htmlLength: 0 };

        try {
            const results = await generalHandler.handle(crawlingContext, handlerContext);
            const data = results[0].data;
            const isValid = generalHandler.validate(data);
            const isBlocked = generalHandler.detectBlock(data.profileHtml);
            
            resultEntry.success = isValid && !isBlocked;
            resultEntry.blocked = isBlocked;
            resultEntry.ctas = data.revenueIndicators.ctas.length;
            resultEntry.htmlLength = data.profileHtml.length;
            
            console.log(`  - Success (Unblocked): ${resultEntry.success}`);
            console.log(`  - Blocked: ${resultEntry.blocked}`);
            console.log(`  - CTAs Found: ${resultEntry.ctas}`);
            console.log(`  - HTML Length: ${resultEntry.htmlLength} chars`);

            if (isBlocked) {
                console.log('  - [DEBUG] Block detected in content.');
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
    const unblockedCount = resultsSummary.filter(r => r.success).length;
    const blockedCount = resultsSummary.filter(r => r.blocked).length;

    console.log('\n--- HARDEN SWEEP SUMMARY ---');
    console.log(`Total URLs: ${urls.length}`);
    console.log(`Unblocked Successes: ${unblockedCount}`);
    console.log(`Blocked Detections: ${blockedCount}`);
    console.log(`Failures (Exceptions): ${resultsSummary.filter(r => r.errors.length > 0).length}`);
    console.log(`Total Duration: ${durationSec.toFixed(2)}s`);
    console.log(`Avg Duration/URL: ${(durationSec / urls.length).toFixed(2)}s`);
    
    // Simple CU Estimate for Playwright on Apify (0.1 CU per 15-30s approx)
    const estimatedCU = (durationSec / 30) * 0.1;
    console.log(`Estimated CU Consumption: ${estimatedCU.toFixed(4)} CU`);

    await browser.close();
    
    fs.writeFileSync('harden-results-general.json', JSON.stringify(resultsSummary, null, 2));
    console.log('\nResults saved to harden-results-general.json');
}

runHardenSweep().catch(err => {
    console.error('Fatal error during sweep:', err);
    process.exit(1);
});
