import { chromium } from 'playwright';
import { Actor } from 'apify';
import { createProxyConfig } from '../../src/utils/proxy.js';

async function testProxy() {
    await Actor.init();
    console.log('--- TESTING PROXY CONNECTION ---');
    
    // Test with default proxy (no group)
    const proxyConfig = await Actor.createProxyConfiguration();
    const proxyUrl = await proxyConfig?.newUrl();
    console.log(`Using Proxy: ${proxyUrl}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        proxy: proxyUrl ? { server: proxyUrl } : undefined
    });
    
    const page = await context.newPage();
    try {
        console.log('Navigating to google.com...');
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Successfully reached google.com');
        const title = await page.title();
        console.log(`Page Title: ${title}`);
    } catch (e: any) {
        console.error(`Connection Failed: ${e.message}`);
    } finally {
        await browser.close();
        await Actor.exit();
    }
}

testProxy();
