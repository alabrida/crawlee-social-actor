import { chromium } from 'playwright';
import googleMapsHandler from '../src/handlers/google-maps.js';
import { log } from '../src/utils/logger.js';

async function test() {
    const browser = await chromium.launch({ 
        headless: true, // Keep headless but with better args
        args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    const request: any = {
        url: 'https://www.google.com/maps/search/Eiffel+Tower/',
        userData: { platform: 'google_maps' }
    };

    const handlerContext: any = {
        input: {
            platforms: ['google_maps'],
            proxy: { useApifyProxy: false, apifyProxyGroups: [] }
        }
    };

    console.log('Starting Google Maps handler test...');
    
    // Manual navigation to handle networkidle properly
    await page.goto(request.url);
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000); // Wait for dynamic side-pane

    const crawlingContext: any = {
        page,
        request,
        log
    };
    
    try {
        const results = await googleMapsHandler.handle(crawlingContext, handlerContext);
        console.log('Results:', JSON.stringify(results, null, 2));
        
        const isValid = googleMapsHandler.validate(results[0].data);
        console.log('Is valid:', isValid);
    } catch (e) {
        console.error('Test failed:', e);
    }

    await browser.close();
}

test();
