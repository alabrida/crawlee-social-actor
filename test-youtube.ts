import { chromium } from 'playwright';
import fs from 'node:fs';(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // We'll test with NightcapShow_ like the user had
    const url = 'https://www.youtube.com/@NightcapShow_';
    console.log(`Navigating to ${url}...`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    const html = await page.content();
    
    let ytInitialData: any = null;
    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (match && match[1]) {
        ytInitialData = JSON.parse(match[1]);
        console.log('ytInitialData found!');
        
        if (ytInitialData?.header?.pageHeaderRenderer) {
            const pageHeader = ytInitialData.header.pageHeaderRenderer;
            let channelName = pageHeader?.pageTitle;
            let subscribersCount = null;
            let videosCount = null;
            
            const metadataRows = pageHeader?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
            if (Array.isArray(metadataRows)) {
                for (const row of metadataRows) {
                    if (Array.isArray(row.metadataParts)) {
                        for (const part of row.metadataParts) {
                            const textContent = part?.text?.content || '';
                            const parseCount = (s: string) => {
                                const c = s.replace(/,/g, '').replace(/subscribers?|videos?|views?/gi, '').trim();
                                let n = parseFloat(c);
                                if(c.toLowerCase().endsWith('k')) n*=1000;
                                if(c.toLowerCase().endsWith('m')) n*=1000000;
                                return Math.floor(n);
                            }
                            if (!subscribersCount && textContent.toLowerCase().includes('subscriber')) {
                                subscribersCount = parseCount(textContent);
                            }
                            if (!videosCount && textContent.toLowerCase().includes('video')) {
                                videosCount = parseCount(textContent);
                            }
                        }
                    }
                }
            }
            console.log('--- OUTPUT ---');
            console.log('Channel Name:', channelName);
            console.log('Subs:', subscribersCount);
            console.log('Videos:', videosCount);
        }
    } else {
        console.log('No ytInitialData found.');
    }
    
    await browser.close();
})();
