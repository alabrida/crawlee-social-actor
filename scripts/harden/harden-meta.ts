import { chromium } from 'playwright';
import metaHandler from '../src/handlers/meta.js';
import { log } from '../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

async function runHardenSweep() {
    console.log('--- STARTING META (FB/IG) HARDEN SWEEP ---');
    
    const fbUrlsPath = path.join(process.cwd(), 'Documentation', 'test-urls', 'facebook.txt');
    const igUrlsPath = path.join(process.cwd(), 'Documentation', 'test-urls', 'instagram.txt');
    
    const fbUrls = fs.readFileSync(fbUrlsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http'));

    const igUrls = fs.readFileSync(igUrlsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http'));

    const urls = [...fbUrls, ...igUrls];
    console.log(`Found ${urls.length} Meta URLs to test (${fbUrls.length} FB, ${igUrls.length} IG).`);

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
            request: { url, userData: { platform: url.includes('facebook') ? 'facebook' : 'instagram' } },
            log
        };

        const handlerContext: any = {
            input: {
                platforms: ['facebook', 'instagram'],
                proxy: { useApifyProxy: false, apifyProxyGroups: [] }
            }
        };

        const resultEntry: any = { url, success: false, blocked: false, errors: [], links: 0, markers: 0 };

        try {
            const results = await metaHandler.handle(crawlingContext, handlerContext);
            const data = results[0].data;
            const isValid = metaHandler.validate(data);
            const isBlocked = metaHandler.detectBlock(data.profileHtml);
            
            resultEntry.success = isValid && !isBlocked;
            resultEntry.blocked = isBlocked;
            resultEntry.links = data.revenueIndicators.links.length;
            resultEntry.markers = data.revenueIndicators.conversionMarkers.length;
            
            console.log(`  - Success (Unblocked): ${resultEntry.success}`);
            console.log(`  - Blocked: ${resultEntry.blocked}`);
            console.log(`  - Links: ${resultEntry.links}`);
            console.log(`  - Markers: ${resultEntry.markers}`);

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
    
    fs.writeFileSync('harden-results-meta.json', JSON.stringify(resultsSummary, null, 2));
    console.log('\nResults saved to harden-results-meta.json');
}

runHardenSweep().catch(err => {
    console.error('Fatal error during sweep:', err);
    process.exit(1);
});
