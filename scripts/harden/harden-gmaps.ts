import { chromium } from 'playwright';
import googleMapsHandler from '../src/handlers/google-maps.js';
import { log } from '../src/utils/logger.js';
import fs from 'fs';

const testUrls = [
    'https://www.google.com/maps/search/Eiffel+Tower/',
    'https://www.google.com/maps/search/Empire+State+Building/',
    'https://www.google.com/maps/search/Sydney+Opera+House/',
    'https://www.google.com/maps/search/Colosseum/',
    'https://www.google.com/maps/search/Statue+of+Liberty/',
    'https://www.google.com/maps/search/Burj+Khalifa/',
    'https://www.google.com/maps/search/Machu+Picchu/',
    'https://www.google.com/maps/search/Taj+Mahal/',
    'https://www.google.com/maps/search/The+British+Museum/',
    'https://www.google.com/maps/search/Louvre+Museum/'
];

async function runHardenSweep() {
    console.log(`Starting HARDEN sweep for Google Maps (${testUrls.length} URLs)...`);
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const results = [];
    let successCount = 0;

    for (const url of testUrls) {
        console.log(`\n[${successCount + 1}/${testUrls.length}] Testing: ${url}`);
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();
        
        try {
            await page.goto(url);
            await page.waitForLoadState('load');
            await page.waitForTimeout(5000); // Wait for dynamic side-pane

            const crawlingContext: any = { page, request: { url }, log };
            const handlerContext: any = { input: { platforms: ['google_maps'] } };

            const data = await googleMapsHandler.handle(crawlingContext, handlerContext);
            const item = data[0].data;
            const isValid = googleMapsHandler.validate(item);
            
            const hasIndicators = item.revenueIndicators.conversionMarkers.length > 0 || item.revenueIndicators.links.length > 0;
            
            if (isValid && hasIndicators) {
                console.log(`  ✅ SUCCESS: Found ${item.revenueIndicators.conversionMarkers.length} markers`);
                successCount++;
                results.push({ url, status: 'PASS', markers: item.revenueIndicators.conversionMarkers });
            } else {
                console.log(`  ⚠️  PARTIAL: Valid=${isValid}, Markers=${item.revenueIndicators.conversionMarkers.length}`);
                results.push({ url, status: 'PARTIAL', markers: item.revenueIndicators.conversionMarkers });
            }
        } catch (e) {
            console.error(`  ❌ FAIL: ${e.message}`);
            results.push({ url, status: 'FAIL', error: e.message });
        } finally {
            await context.close();
        }
    }

    await browser.close();

    const report = {
        timestamp: new Date().toISOString(),
        total: testUrls.length,
        success: successCount,
        rate: `${(successCount / testUrls.length) * 100}%`,
        results
    };

    fs.writeFileSync('harden-results-gmaps.json', JSON.stringify(report, null, 2));
    console.log(`\nSweep Complete. Success Rate: ${report.rate}`);
    console.log(`Results saved to harden-results-gmaps.json`);
}

runHardenSweep();
