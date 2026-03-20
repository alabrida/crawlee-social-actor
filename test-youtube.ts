import { chromium } from 'playwright';

(async () => {
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
        
        // Output the full header JSON for analysis
        require('fs').writeFileSync('d:\\Apify\\yt_header.json', JSON.stringify(ytInitialData?.header || {}, null, 2));
        console.log('Wrote header to yt_header.json');

        // Output the full metadata JSON for analysis
        require('fs').writeFileSync('d:\\Apify\\yt_metadata.json', JSON.stringify(ytInitialData?.metadata || {}, null, 2));
        console.log('Wrote metadata to yt_metadata.json');
    } else {
        console.log('No ytInitialData found.');
    }
    
    await browser.close();
})();
