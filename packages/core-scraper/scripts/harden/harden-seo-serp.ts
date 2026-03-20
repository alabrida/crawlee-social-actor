import { chromium } from 'playwright';
import { Actor } from 'apify';
import seoSerpHandler from '../../src/handlers/seo-serp.js';
import { log } from '../../src/utils/logger.js';
import { createProxyConfig } from '../../src/utils/proxy.js';
import fs from 'fs';
import path from 'path';

async function runHardenSweep() {
    await Actor.init();
    console.log('--- STARTING SEO/SERP HARDEN SWEEP WITH PROXIES ---');
    
    const urlsPath = path.join(process.cwd(), 'Documentation', 'test-urls', 'seo-serp.txt');
    const urls = fs.readFileSync(urlsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http') && !line.includes('#'));

    console.log(`Found ${urls.length} SERP URLs to test.`);

    const useProxy = !!process.env.APIFY_TOKEN;
    const proxyConfig = useProxy ? await createProxyConfig({
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        proxyUrls: []
    }) : undefined;

    const browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const resultsSummary = [];
    const startTime = Date.now();

    for (const url of urls) {
        console.log(`\nTesting URL: ${url}`);
        
        // Get proxy URL for this specific context
        const proxyUrl = await proxyConfig?.newUrl();
        console.log(`  - Using Proxy: ${proxyUrl ? 'Yes (Apify Residential)' : 'No'}`);

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            proxy: proxyUrl ? { server: proxyUrl } : undefined
        });
        
        const page = await context.newPage();
        
        const crawlingContext: any = {
            page,
            request: { url, userData: { platform: 'seo_serp' } },
            log
        };

        const handlerContext: any = {
            input: {
                platforms: ['seo_serp'],
                proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
            }
        };

        const resultEntry: any = { url, success: false, blocked: false, errors: [], links: 0, markers: 0 };

        try {
            const results = await seoSerpHandler.handle(crawlingContext, handlerContext);
            const data = results[0].data;
            const isValid = seoSerpHandler.validate(data);
            const isBlocked = seoSerpHandler.detectBlock(data.profileHtml);
            
            resultEntry.success = isValid && !isBlocked;
            resultEntry.blocked = isBlocked;
            resultEntry.links = results[0].data.revenueIndicators.links;
            resultEntry.markers = data.revenueIndicators.conversionMarkers.length;
            
            console.log(`  - Success (Unblocked): ${resultEntry.success}`);
            console.log(`  - Blocked: ${resultEntry.blocked}`);
            console.log(`  - Results Found: ${resultEntry.links.length}`);

            const slug = new URL(url).searchParams.get('q');
            const screenshotPath = `debug/harden-serp-${slug}.png`;
            try {
                await page.screenshot({ path: screenshotPath, timeout: 15000 });
                console.log(`  - Screenshot saved: ${screenshotPath}`);
            } catch (e) {
                console.log(`  - Screenshot failed (timeout), continuing.`);
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
    console.log(`Successes (Unblocked): ${successCount}`);
    console.log(`Failures (Blocked/Error): ${urls.length - successCount}`);
    console.log(`Total Duration: ${durationSec.toFixed(2)}s`);
    
    const estimatedCU = (durationSec / 30) * 0.1;
    console.log(`Estimated CU Consumption: ${estimatedCU.toFixed(4)} CU`);

    fs.writeFileSync('results/harden-results-seo-serp.json', JSON.stringify(resultsSummary, null, 2));
    console.log('\nResults saved to results/harden-results-seo-serp.json');

    await browser.close();
    await Actor.exit();
}

runHardenSweep().catch(err => {
    console.error('Fatal error during sweep:', err);
    process.exit(1);
});
