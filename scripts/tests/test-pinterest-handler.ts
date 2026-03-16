import { chromium } from 'playwright';
import pinterestHandler from '../src/handlers/pinterest.js';
import { log } from '../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

async function runHardenSweep() {
    console.log('--- STARTING PINTEREST HARDEN SWEEP ---');
    
    const testUrlsPath = path.join(process.cwd(), 'Documentation', 'test-urls', 'pinterest.txt');
    const urls = fs.readFileSync(testUrlsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http'));

    console.log(`Found ${urls.length} URLs to test.`);

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
            request: { url, userData: { platform: 'pinterest' } },
            log
        };

        const handlerContext: any = {
            input: {
                platforms: ['pinterest'],
                proxy: { useApifyProxy: false, apifyProxyGroups: [] }
            }
        };

        const resultEntry: any = { url, success: false, errors: [], links: 0, ctas: 0 };

        try {
            const results = await pinterestHandler.handle(crawlingContext, handlerContext);
            const data = results[0].data;
            const isValid = pinterestHandler.validate(data);
            
            resultEntry.success = isValid;
            resultEntry.links = data.revenueIndicators.links.length;
            resultEntry.ctas = data.revenueIndicators.ctas.length;
            resultEntry.markers = data.revenueIndicators.conversionMarkers.length;
            
            console.log(`  - Success: ${isValid}`);
            console.log(`  - Links: ${resultEntry.links}`);
            console.log(`  - Markers: ${resultEntry.markers}`);

            if (resultEntry.links === 0 && resultEntry.markers === 0) {
                const initialProps = data.apiSnapshots[0];
                if (initialProps.users) {
                    for (const k of Object.keys(initialProps.users)) {
                        const u = initialProps.users[k];
                        console.log(`  - Debug: User [${k}] username: "${u.username}", domain_url: "${u.domain_url}", website_url: "${u.website_url}"`);
                    }
                }
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
    const successCount = resultsSummary.filter(r => r.success).length;

    console.log('\n--- HARDEN SWEEP SUMMARY ---');
    console.log(`Total URLs: ${urls.length}`);
    console.log(`Successes: ${successCount}`);
    console.log(`Failures: ${urls.length - successCount}`);
    console.log(`Total Duration: ${durationSec.toFixed(2)}s`);
    console.log(`Avg Duration/URL: ${(durationSec / urls.length).toFixed(2)}s`);
    
    // Simple CU Estimate for Playwright on Apify (0.1 CU per 15-30s approx)
    const estimatedCU = (durationSec / 30) * 0.1;
    console.log(`Estimated CU Consumption: ${estimatedCU.toFixed(4)} CU`);

    await browser.close();
    
    fs.writeFileSync('harden-results.json', JSON.stringify(resultsSummary, null, 2));
    console.log('\nResults saved to harden-results.json');
}

runHardenSweep().catch(err => {
    console.error('Fatal error during sweep:', err);
    process.exit(1);
});
